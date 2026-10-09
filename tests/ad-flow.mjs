import assert from 'node:assert/strict';
import { AD_POLICY, createInterstitialPolicy } from '../js/ad-policy.js';

// Pure pacing plus real ads.js orchestration with installed plugin event
// names. No network, SDK presentation, real rewards or account operations.
let checks = 0, serial = 0;
const checksPassed = [];
const pass = description => { checks++; checksPassed.push(description); };
const original = { now: Date.now, setTimeout, clearTimeout, warn: console.warn };
const tick = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
try {
    const policy = createInterstitialPolicy({startedAt:1_000,lastShownAt:0});
    for (let i=0;i<5;i++) policy.noteCompletion();
    assert.equal(policy.canShow({now:1_000_000,placement:'level-result'}),false);
    policy.noteCompletion();
    assert.equal(policy.canShow({now:180_999,placement:'level-result'}),false);
    assert.equal(policy.canShow({now:181_000,placement:'level-result'}),true);
    for(const placement of [undefined,'opening','wrong-tap','retry','level-start']) {
        assert.equal(policy.canShow({now:181_000,placement}),false);
    }
    policy.noteShown(181_000);
    for(let i=0;i<6;i++)policy.noteCompletion();
    assert.equal(policy.canShow({now:300_999,placement:'level-result'}),false);
    assert.equal(policy.canShow({now:301_000,placement:'level-result'}),true);
    assert.equal(policy.canShow({now:180_000,placement:'level-result'}),false);
    const reopened=createInterstitialPolicy({startedAt:250_000,lastShownAt:181_000});
    for(let i=0;i<6;i++)reopened.noteCompletion();
    assert.equal(reopened.canShow({now:301_000,placement:'level-result'}),false);
    assert.equal(reopened.canShow({now:430_000,placement:'level-result'}),true);
    pass('Six real completions, 180s launch grace, 120s persisted gap; opening/retry/wrong-tap rejected');

    async function fixture() {
        let now=1_000_000, nextTimer=1, valid=true;
        const timers=new Map(), memory=new Map(), listeners=new Map(), documentEvents=new Map(), css=new Map();
        const calls={prepareInterstitial:0,showInterstitial:0,prepareReward:0,showReward:0,showBanner:0,hideBanner:0};
        const interstitialLoads=[], rewardLoads=[];
        Date.now=()=>now;
        globalThis.setTimeout=(callback,delay=0)=>{const id=nextTimer++;timers.set(id,{callback,at:now+delay});return id;};
        globalThis.clearTimeout=id=>timers.delete(id);
        globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
        globalThis.document={visibilityState:'visible',documentElement:{style:{setProperty:(key,value)=>css.set(key,value)}},addEventListener:(name,fn)=>documentEvents.set(name,fn)};
        const sdk={
            initialize:async()=>{},trackingAuthorizationStatus:async()=>({status:'authorized'}),
            addListener:(name,fn)=>{listeners.set(name,fn);return Promise.resolve({remove(){}});},
            showBanner:async()=>{calls.showBanner++;},hideBanner:async()=>{calls.hideBanner++;},
            prepareInterstitial(options){calls.prepareInterstitial++;assert.equal(options.isTesting,true);return new Promise((resolve,reject)=>interstitialLoads.push({resolve,reject}));},
            showInterstitial:async()=>{calls.showInterstitial++;}, // resolves before dismissal on installed iOS6 plugin
            prepareRewardVideoAd(options){calls.prepareReward++;assert.equal(options.isTesting,true);return new Promise((resolve,reject)=>rewardLoads.push({resolve,reject}));},
            showRewardVideoAd:()=>{calls.showReward++;return new Promise(()=>{});}, // dismissal without reward leaves installed promise pending
        };
        let permission={canRequestAds:true,privacyOptionsRequired:true};
        globalThis.window={addEventListener(){},Capacitor:{isNativePlatform:()=>true,Plugins:{AdMob:sdk,AdsConsent:{gatherConsent:async()=>permission,showPrivacyOptions:async()=>permission}}}};
        const {storage}=await import('../js/storage.js'); storage.setPremium(false);
        const ads=await import(`../js/ads.js?ad-flow=${++serial}`);
        await ads.initAds({testMode:true});
        const context={isCurrent:()=>valid}, rewardContext={userInitiated:true,...context};
        return {ads,calls,memory,css,storage,context,rewardContext,interstitialLoads,rewardLoads,
            invalidate(){valid=false;},
            emit(name,payload={}){listeners.get(name)?.(payload);},
            async advance(ms){const until=now+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].callback();await tick();}now=until;await tick();},
            async readyInterstitial(){await this.advance(AD_POLICY.firstSessionGraceMs);for(let i=0;i<6;i++)ads.noteLevelCompleted();await tick();assert.equal(interstitialLoads.length,1);interstitialLoads.shift().resolve();await tick();},
            async loadedReward(){await tick();this.emit('onRewardedVideoAdLoaded');await tick();},
            async hidden(){document.visibilityState='hidden';documentEvents.get('visibilitychange')?.();await tick();},
            async visible(){document.visibilityState='visible';documentEvents.get('visibilitychange')?.();await tick();},
            async revoke(){permission={canRequestAds:false,privacyOptionsRequired:true};await ads.showAdPrivacyOptions();},
        };
    }
    console.warn=()=>{};
    let f=await fixture();
    assert.equal(await f.ads.maybeShowInterstitial({placement:'level-result',...f.context}),false);
    assert.equal(f.calls.prepareInterstitial,0);
    await f.advance(180_000);
    for(let i=0;i<6;i++)f.ads.noteLevelCompleted();
    await tick();
    assert.equal(await f.ads.maybeShowInterstitial({placement:'level-result',...f.context}),false,'A pending load must not hold navigation');
    assert.equal(f.calls.showInterstitial,0);
    f.interstitialLoads.shift().resolve();await tick();
    assert.equal(f.calls.showInterstitial,0,'Loaded callback cannot open a fullscreen ad');
    pass('No opening/fullscreen from completion or a late preload; unready Next returns immediately');

    f=await fixture();await f.readyInterstitial();await f.ads.showBanner();
    let settled=false;
    let shown=f.ads.maybeShowInterstitial({placement:'level-result',...f.context}).then(value=>{settled=true;return value;});
    await tick();
    assert.equal(f.calls.showInterstitial,1);
    assert.equal(f.calls.hideBanner,1,'Banner disappears beneath fullscreen');
    assert.equal(f.css.get('--banner-height'),'0px');
    assert.equal(settled,false,'Immediate native show promise must not start next puzzle');
    assert.equal(await f.ads.maybeShowInterstitial({placement:'level-result',...f.context}),false,'Double Next cannot show twice');
    f.emit('interstitialAdShowed');f.emit('interstitialAdShowed');
    assert.equal(settled,false);
    f.emit('interstitialAdDismissed');assert.equal(await shown,true);await tick();
    assert.equal(f.calls.showBanner,2);
    assert.equal(f.memory.get('okchu.ads.lastInterstitialAt'),String(Date.now()));
    for(let i=0;i<6;i++)f.ads.noteLevelCompleted();await tick();
    assert.equal(f.calls.prepareInterstitial,1,'Cooldown starts at actual presentation');
    pass('SDK dismissal controls navigation; one fullscreen; banner restoration; pacing stored only on showed event');

    f=await fixture();await f.readyInterstitial();f.invalidate();
    assert.equal(await f.ads.maybeShowInterstitial({placement:'level-result',...f.context}),false);
    assert.equal(f.calls.showInterstitial,0);
    for(const placement of ['retry','wrong-tap','opening']) assert.equal(await f.ads.maybeShowInterstitial({placement,...f.context}),false);
    pass('A stale result or unrelated placement cannot show a prepared advertisement');

    f=await fixture();await f.readyInterstitial();
    shown=f.ads.maybeShowInterstitial({placement:'level-result',...f.context});
    f.invalidate();assert.equal(await shown,false);
    assert.equal(f.calls.showInterstitial,0,'Context changing during async listener registration blocks presentation');
    pass('Interstitial rechecks the result context after asynchronous presentation barriers');

    f=await fixture();await f.readyInterstitial();
    assert.equal(f.ads.isAdPresentationPending(),false);
    shown=f.ads.maybeShowInterstitial({placement:'level-result',...f.context});await tick();
    f.emit('interstitialAdShowed');
    assert.equal(f.ads.isAdPresentationPending(),true);
    await f.advance(90_000);assert.equal(await shown,false);
    assert.equal(f.ads.isAdPresentationPending(),true,'Timeout does not dismiss actual native content');
    assert.equal(await f.ads.maybeShowInterstitial({placement:'level-result',...f.context}),false);
    f.emit('interstitialAdDismissed');await tick();
    assert.equal(f.ads.isAdPresentationPending(),false,'Only native terminal dismissal releases navigation quarantine');
    pass('Timed-out fullscreen remains presentation-pending until SDK termination, preventing a new puzzle behind it');

    for(const cancellation of ['navigation','hidden','premium','consent']) {
        f=await fixture();await f.advance(180_000);for(let i=0;i<6;i++)f.ads.noteLevelCompleted();await tick();
        if(cancellation==='navigation')f.ads.cancelPendingAds();
        if(cancellation==='hidden')await f.hidden();
        if(cancellation==='premium'){f.storage.setPremium(true);f.ads.cancelPendingAds();}
        if(cancellation==='consent')await f.revoke();
        f.interstitialLoads.shift().resolve();await tick();
        assert.equal(await f.ads.maybeShowInterstitial({placement:'level-result',...f.context}),false);
        assert.equal(f.calls.showInterstitial,0);
    }
    pass('Late preload is discarded on navigation, background, Premium or consent revocation');

    f=await fixture();
    assert.equal(await f.ads.showRewarded(),false);
    assert.equal(await f.ads.showRewarded({...f.context,userInitiated:false}),false);
    assert.equal(await f.ads.showRewarded({userInitiated:true}),false);
    assert.equal(f.calls.prepareReward,0);
    pass('Rewarded loading requires a deliberate button choice and live offer context');

    f=await fixture();let reward=f.ads.showRewarded(f.rewardContext);await f.loadedReward();
    assert.equal(f.calls.showReward,1);
    assert.equal(await f.ads.showRewarded(f.rewardContext),false);
    f.emit('onRewardedVideoAdReward',{amount:1});f.emit('onRewardedVideoAdReward',{amount:1});
    f.emit('onRewardedVideoAdDismissed');await f.advance(250);assert.equal(await reward,true);
    f.emit('onRewardedVideoAdReward',{amount:1});
    pass('One true result comes from SDK reward plus dismissal; duplicate reward/click cannot grant twice');

    f=await fixture();reward=f.ads.showRewarded(f.rewardContext);await f.loadedReward();
    f.emit('onRewardedVideoAdDismissed');f.emit('onRewardedVideoAdReward',{amount:1});
    await f.advance(250);assert.equal(await reward,true);
    pass('Mediated reward callback ordering works only inside the short dismissal grace');

    for(const failure of ['dismiss','load','show']) {
        f=await fixture();reward=f.ads.showRewarded(f.rewardContext);await tick();
        if(failure==='load')f.emit('onRewardedVideoAdFailedToLoad');
        else {await f.loadedReward();f.emit(failure==='show'?'onRewardedVideoAdFailedToShow':'onRewardedVideoAdDismissed');await f.advance(250);}
        assert.equal(await reward,false);
    }
    pass('Dismissal without reward, load failure and presentation failure never grant benefits');

    f=await fixture();reward=f.ads.showRewarded(f.rewardContext);await tick();
    f.ads.cancelPendingAds();assert.equal(await reward,false);
    assert.equal(await f.ads.showRewarded(f.rewardContext),false,'Old native load is quarantined');
    f.emit('onRewardedVideoAdLoaded');await tick();assert.equal(f.calls.showReward,0);
    reward=f.ads.showRewarded(f.rewardContext);await f.loadedReward();
    f.emit('onRewardedVideoAdDismissed');await f.advance(250);assert.equal(await reward,false);
    pass('Cancelled native load cannot show or be mistaken for a new button press; terminal event releases quarantine');

    for(const cancellation of ['navigation','premium','consent']) {
        f=await fixture();reward=f.ads.showRewarded(f.rewardContext);await f.loadedReward();
        if(cancellation==='navigation'){f.invalidate();f.ads.cancelPendingAds();}
        if(cancellation==='hidden')await f.hidden();
        if(cancellation==='premium'){f.storage.setPremium(true);f.ads.cancelPendingAds();}
        if(cancellation==='consent')await f.revoke();
        f.emit('onRewardedVideoAdReward',{amount:1});f.emit('onRewardedVideoAdDismissed');await f.advance(250);
        assert.equal(await reward,false);
    }
    pass('Late reward after navigation/Premium/consent change cannot alter a stale offer');

    f=await fixture();reward=f.ads.showRewarded(f.rewardContext);await tick();await f.advance(10_000);
    assert.equal(await reward,false);
    assert.equal(await f.ads.showRewarded(f.rewardContext),false);
    f.emit('onRewardedVideoAdLoaded');await tick();assert.equal(f.calls.showReward,0);
    reward=f.ads.showRewarded(f.rewardContext);await f.loadedReward();await f.advance(180_000);
    assert.equal(f.ads.isAdPresentationPending(),true);
    f.emit('onRewardedVideoAdReward',{amount:1});f.emit('onRewardedVideoAdDismissed');
    assert.equal(f.ads.isAdPresentationPending(),true,'Dismissal grace still owns this terminal callback window');
    await f.advance(250);assert.equal(await reward,true);assert.equal(f.ads.isAdPresentationPending(),false);
    pass('Load timeout cancels safely; long valid presentations retain their earned reward');

    for(const order of ['visible-before-dismissal','visible-after-dismissal']) {
        f=await fixture();let delivered=false;
        reward=f.ads.showRewarded(f.rewardContext).then(value=>{delivered=true;return value;});
        await f.loadedReward();await f.hidden();
        await f.advance(180_000);
        f.emit('onRewardedVideoAdReward',{amount:1});
        if(order==='visible-before-dismissal')await f.visible();
        assert.equal(delivered,false);
        f.emit('onRewardedVideoAdDismissed');await f.advance(250);
        if(order==='visible-after-dismissal') {
            assert.equal(delivered,false,'A continuation must wait until the player returns');
            assert.equal(f.ads.isAdPresentationPending(),true);
            await f.visible();
        }
        assert.equal(await reward,true);assert.equal(f.ads.isAdPresentationPending(),false);
    }
    pass('Native ad hiding WKWebView and long end cards preserve earned rewards; delivery waits for foreground');

    f=await fixture();reward=f.ads.showRewarded(f.rewardContext);await f.loadedReward();await f.hidden();
    f.emit('onRewardedVideoAdDismissed');await f.advance(250);
    assert.equal(await reward,false);await f.visible();
    pass('Background dismissal without an SDK reward still grants nothing');

    f=await fixture();await f.advance(180_000);for(let i=0;i<6;i++)f.ads.noteLevelCompleted();await tick();
    await f.advance(10_000);
    reward=f.ads.showRewarded(f.rewardContext);await tick();
    assert.equal(f.calls.prepareReward,1,'A hanging preload cannot permanently lock explicit rewarded offers');
    f.emit('onRewardedVideoAdFailedToLoad');assert.equal(await reward,false);
    f.interstitialLoads.shift().resolve();await tick();
    assert.equal(f.calls.showInterstitial,0,'Late timed-out preload is never presented');
    pass('Interstitial preload timeout releases loading pressure without a surprise presentation');

    f=await fixture();f.storage.setPremium(true);
    await f.ads.showBanner();
    assert.equal(await f.ads.showRewarded(f.rewardContext),false);
    await f.advance(180_000);for(let i=0;i<6;i++)f.ads.noteLevelCompleted();await tick();
    assert.equal(await f.ads.maybeShowInterstitial({placement:'level-result',...f.context}),false);
    assert.equal(f.calls.showBanner,0);assert.equal(f.calls.prepareReward,0);assert.equal(f.calls.prepareInterstitial,0);
    pass('Premium suppresses all ad types and SDK-earned reward reports');
} finally {
    Date.now=original.now;globalThis.setTimeout=original.setTimeout;globalThis.clearTimeout=original.clearTimeout;console.warn=original.warn;
}
console.log(JSON.stringify({passed:checks,scope:'Pure pacing and production JS with native event mocks; no real ad delivery/reward claim',checks:checksPassed},null,2));
