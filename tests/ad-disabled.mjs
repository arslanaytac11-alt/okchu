import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Each launch captures its own immutable reviewed content snapshot. Run the
// real production imports in separate processes; no source substitutions.
const code = `
import assert from 'node:assert/strict';
const type=process.argv[1], memory=new Map(), events=new Map(), timers=new Map();
let now=1000000,id=0;
Date.now=()=>now;
globalThis.setTimeout=(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;};
globalThis.clearTimeout=id=>timers.delete(id);
globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
memory.set('okchu.content.v1.staged',JSON.stringify({schemaVersion:1,appVersion:'1.1.1',nativeBuild:149,revision:1,texts:{},disableAds:{[type]:true}}));
globalThis.document={visibilityState:'visible',documentElement:{style:{setProperty(){}}},addEventListener(){}};
const calls={banner:0,interstitial:0,rewarded:0};
const sdk={initialize:async()=>{},trackingAuthorizationStatus:async()=>({status:'authorized'}),addListener:(name,fn)=>{events.set(name,fn);return Promise.resolve({remove(){}});},showBanner:async()=>{calls.banner++;},hideBanner:async()=>{},prepareInterstitial:async()=>{calls.interstitial++;},prepareRewardVideoAd:()=>{calls.rewarded++;return new Promise(()=>{});},showRewardVideoAd:()=>new Promise(()=>{})};
globalThis.window={Capacitor:{isNativePlatform:()=>true,Plugins:{AdMob:sdk,AdsConsent:{gatherConsent:async()=>({canRequestAds:true,privacyOptionsRequired:false})}}},addEventListener(){}};
const ads=await import('./js/ads.js');
const content=await import('./js/content-updates.js');
assert.equal(content.isAdTypeDisabled(type),true);
await ads.initAds({testMode:true});await ads.showBanner();
now+=180000;for(let i=0;i<6;i++)ads.noteLevelCompleted();
for(let i=0;i<20;i++)await Promise.resolve();
const p=ads.showRewarded({userInitiated:true,isCurrent:()=>true});
for(let i=0;i<20;i++)await Promise.resolve();
if(type==='rewarded')assert.equal(await p,false);
else {events.get('onRewardedVideoAdFailedToLoad')();assert.equal(await p,false);}
assert.equal(calls.banner,type==='banner'?0:1);
assert.equal(calls.interstitial,type==='interstitial'?0:1);
assert.equal(calls.rewarded,type==='rewarded'?0:1);
if(type==='interstitial')assert.equal(await ads.maybeShowInterstitial({placement:'level-result',isCurrent:()=>true}),false);
console.log(JSON.stringify({type,calls}));
`;
const results=[];
for(const type of ['banner','interstitial','rewarded']) {
    const child=spawnSync(process.execPath,['--input-type=module','-e',code,type],{encoding:'utf8',timeout:10_000});
    assert.equal(child.status,0,`${type}: ${child.stdout}${child.stderr}`);
    results.push(JSON.parse(child.stdout));
}
console.log(JSON.stringify({passed:3,scope:'Actual cached immutable content and production ads imports; independent disabled-type launches; no ad network',results},null,2));
