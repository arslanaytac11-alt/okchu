import assert from 'node:assert/strict';

// Native mocks: no ad requests, consent choices, purchases or network access.
let serial = 0, checks = 0;
async function fixture(status, {deferred=false, missing=false, premium=false, fail=false}={}) {
    const memory = new Map();
    globalThis.localStorage = {getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
    const {storage} = await import('../js/storage.js');
    storage.setPremium(premium);
    const calls = {initialize:0,tracking:0,show:0,hide:0,options:0};
    const css = new Map();
    globalThis.document = {documentElement:{style:{setProperty:(key,value)=>css.set(key,value)}}};
    let resolveConsent;
    const consent = {
        gatherConsent: () => fail ? Promise.reject(new Error('Mock unavailable')) : deferred ? new Promise(resolve=>{resolveConsent=resolve;}) : Promise.resolve(status),
        showPrivacyOptions: async () => { calls.options++; return {canRequestAds:false,privacyOptionsRequired:true}; },
    };
    const sdk = {
        initialize:async()=>{calls.initialize++;},
        trackingAuthorizationStatus:async()=>{calls.tracking++;return {status:'denied'};},
        addListener:async()=>({remove(){}}),
        showBanner:async()=>{calls.show++;},hideBanner:async()=>{calls.hide++;},
    };
    globalThis.window = {Capacitor:{isNativePlatform:()=>true,Plugins:{AdMob:sdk,...(!missing?{AdsConsent:consent}:{})}}};
    const ads = await import(`../js/ads.js?consent-test=${++serial}`);
    return {ads,calls,css,resolve:()=>resolveConsent(status)};
}
const tick = async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

let f=await fixture({canRequestAds:true,privacyOptionsRequired:true},{deferred:true});
let init=f.ads.initAds({testMode:true});
let banner=f.ads.showBanner();
await tick();
assert.equal(f.calls.initialize,0,'No SDK request while consent is unresolved');
assert.equal(f.calls.show,0);
assert.equal(await f.ads.showRewarded(),false,'An unresolved native ad cannot earn a reward');
f.resolve();await Promise.all([init,banner]);
assert.equal(f.calls.initialize,1);assert.equal(f.calls.show,1);
assert.equal(f.ads.isAdPrivacyOptionsRequired(),true);
checks++;

await f.ads.showAdPrivacyOptions();
assert.equal(f.calls.options,1);assert.equal(f.calls.hide,1,'Changing permission hides an existing native banner');
await f.ads.showBanner();
assert.equal(f.calls.show,1);
assert.equal(f.css.get('--banner-height'),'0px');
assert.equal(await f.ads.showRewarded(),false);
checks++;

for(const options of [{},{missing:true},{fail:true}]) {
    f=await fixture({canRequestAds:false,privacyOptionsRequired:false},options);
    await f.ads.initAds();await f.ads.showBanner();
    assert.equal(f.calls.initialize,0);assert.equal(f.calls.tracking,0);assert.equal(f.calls.show,0);
    assert.equal(await f.ads.showRewarded(),false,'Missing permission or SDK never grants native reward');
    assert.equal(f.css.get('--banner-height'),'0px');
    checks++;
}

f=await fixture({canRequestAds:true,privacyOptionsRequired:false},{premium:true});
await f.ads.initAds();await f.ads.showBanner();
assert.equal(f.calls.initialize,0,'Premium must not initialize advertising or request ATT');
assert.equal(f.calls.tracking,0);assert.equal(f.calls.show,0);
assert.equal(await f.ads.showRewarded(),true,'Premium continues without an ad');
assert.equal(await f.ads.showAdPrivacyOptions(),false,'No privacy UI when SDK says it is not required');
checks++;

globalThis.window = {Capacitor:{isNativePlatform:()=>false}};
f=await import(`../js/ads.js?consent-test=web`);
assert.equal(await f.showRewarded(),true,'Web preview remains playable without native SDK');
checks++;
console.log(JSON.stringify({passed:checks,scope:'Native consent permission gating, pending/missing/failed permission, options revocation, reward eligibility and Premium; mocked SDK only'},null,2));
