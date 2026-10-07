import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRewardedAction } from '../js/rewarded-action.js';
const checks = [];
async function check(name, fn) { await fn(); checks.push(name); }
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
await check('a validated SDK reward grants once for one explicit offer', async () => {
    let requests = 0, grants = 0;
    const action = createRewardedAction({ isCurrent:()=>true, hasPremium:()=>false,
        requestReward:async options=>{ assert.equal(options.userInitiated,true); assert.equal(options.isCurrent(),true); requests++;return true; },
        applyReward:()=>grants++ });
    assert.equal(await action.run(),'granted');assert.equal(await action.run(),'ignored');
    assert.equal(requests,1);assert.equal(grants,1);
});
await check('three failed SDK attempts never create a life or continuation', async () => {
    let grants=0,requests=0;
    const action=createRewardedAction({isCurrent:()=>true,hasPremium:()=>false,requestReward:async()=>{requests++;return false;},applyReward:()=>grants++});
    for(let i=0;i<3;i++)assert.equal(await action.run(),'unavailable');
    assert.equal(requests,3);assert.equal(grants,0);
});
await check('double taps while loading issue one request, and cancellation cannot grant later', async () => {
    const d=deferred();let grants=0,requests=0;
    const action=createRewardedAction({isCurrent:()=>true,hasPremium:()=>false,requestReward:()=>{requests++;return d.promise;},applyReward:()=>grants++});
    const run=action.run();assert.equal(await action.run(),'ignored');action.cancel();d.resolve(true);
    assert.equal(await run,'cancelled');assert.equal(await action.run(),'ignored');assert.equal(requests,1);assert.equal(grants,0);
});
await check('leaving a route or replacing its level discards an earned stale result', async () => {
    let current=true,grants=0;const d=deferred();
    const action=createRewardedAction({isCurrent:()=>current,hasPremium:()=>false,requestReward:()=>d.promise,applyReward:()=>grants++});
    const run=action.run();current=false;d.resolve(true);assert.equal(await run,'cancelled');assert.equal(grants,0);
});
await check('Premium receives the explicit ad-free benefit once without an SDK request',async()=>{
    let grants=0;
    const action=createRewardedAction({isCurrent:()=>true,hasPremium:()=>true,requestReward:()=>{throw Error('Premium must not request ads');},applyReward:()=>grants++});
    assert.equal(await action.run(),'granted');assert.equal(await action.run(),'ignored');assert.equal(grants,1);
});
await check('exceptions, nonboolean reward values and invalid contexts fail closed',async()=>{
    let grants=0;
    for(const requestReward of [async()=>{throw Error('no fill');},async()=>({earned:true}),async()=>1]){
        const a=createRewardedAction({isCurrent:()=>true,hasPremium:()=>false,requestReward,applyReward:()=>grants++});
        assert.equal(await a.run(),'unavailable');
    }
    const a=createRewardedAction({isCurrent:()=>{throw Error('disposed');},hasPremium:()=>false,requestReward:()=>true,applyReward:()=>grants++});
    assert.equal(await a.run(),'ignored');assert.equal(grants,0);
});
const source=readFileSync('js/main.js','utf8');
const bindSource=source.slice(source.indexOf('function bindRewardOffer('),source.indexOf('\n// Hint button'));
function uiFixture(){
    let premium=false;const requests=[],timers=[],grants=[];
    const overlay={classList:{contains:()=>overlay.hidden}};overlay.hidden=false;
    const sandbox={createRewardedAction,navigationGeneration:1,rewardOfferGeneration:0,document:{hidden:false},
        game:{_levelEpoch:2,currentLevel:{id:'egypt_3'}},isPremiumOwned:()=>premium,
        t:key=>'translation:'+key,setTimeout:fn=>timers.push(fn),
        showRewarded:options=>{const d=deferred();requests.push({options,...d});return d.promise;}};
    vm.createContext(sandbox);vm.runInContext(bindSource,sandbox);
    function button(){
        const b={disabled:true,textContent:'stale loading text',getAttribute:()=> 'overlay.watch_ad',addEventListener:(_,fn)=>{b.click=fn;}};
        sandbox.bindRewardOffer(b,overlay,'overlay.premium_life',()=>grants.push('life'));
        return b;
    }
    return {sandbox,overlay,requests,timers,grants,button,setPremium:value=>{premium=value;}};
}
await check('actual UI binding resets a reused button and renders its correct localized offer',async()=>{
    const h=uiFixture(),b=h.button();assert.equal(b.disabled,false);assert.equal(b.textContent,'translation:overlay.watch_ad');
    const run=b.click();assert.equal(b.disabled,true);h.requests[0].resolve(false);await run;
    assert.equal(b.disabled,false);assert.equal(b.textContent,'translation:overlay.ad_unavailable');
    h.timers.forEach(fn=>fn());assert.equal(b.textContent,'translation:overlay.watch_ad');assert.equal(h.grants.length,0);
});
await check('actual UI failure restores retry after background cancellation without giving a reward',async()=>{
    const h=uiFixture(),b=h.button(),run=b.click();h.sandbox.document.hidden=true;
    h.requests[0].resolve(true);await run;assert.equal(b.disabled,false);assert.equal(h.grants.length,0);
    h.sandbox.document.hidden=false;const retry=b.click();h.requests[1].resolve(true);await retry;assert.equal(h.grants.length,1);
});
await check('actual UI reopens safely: old completions and label timers cannot alter a new offer',async()=>{
    const h=uiFixture(),old=h.button(),run=old.click();const fresh=h.button();
    h.requests[0].resolve(true);await run;assert.equal(h.grants.length,0);assert.equal(fresh.disabled,false);
    const retry=fresh.click();h.requests[1].resolve(false);await retry;
    const newest=h.button();h.timers.forEach(fn=>fn());assert.equal(newest.textContent,'translation:overlay.watch_ad');
});
await check('actual UI route, level and epoch guards stop both pending grants and new taps',async()=>{
    for(const kind of ['route','level','epoch','closed']){
        const h=uiFixture(),b=h.button(),run=b.click();
        if(kind==='route')h.sandbox.navigationGeneration++;
        if(kind==='level')h.sandbox.game.currentLevel={id:'other'};
        if(kind==='epoch')h.sandbox.game._levelEpoch++;
        if(kind==='closed')h.overlay.hidden=true;
        h.requests[0].resolve(true);await run;assert.equal(h.grants.length,0);
        await b.click();assert.equal(h.requests.length,1);
    }
});
await check('actual Premium UI uses the free-benefit label and never calls rewarded SDK',async()=>{
    const h=uiFixture();h.setPremium(true);const b=h.button();
    assert.equal(b.textContent,'translation:overlay.premium_life');await b.click();await b.click();
    assert.equal(h.requests.length,0);assert.equal(h.grants.length,1);
});
const nextStart=source.indexOf("    nextBtn.addEventListener('click', async () => {");
const nextEnd=source.indexOf("\n};\n\n// When lives run out",nextStart);
const nextSource=source.slice(nextStart,nextEnd);
function nextFixture(){
    const d=deferred();let busy=false;const starts=[];
    const overlay={hidden:false,classList:{add:()=>{overlay.hidden=true;},remove:()=>{overlay.hidden=false;}}};
    const nextBtn={disabled:false,addEventListener:(_,fn)=>{nextBtn.click=fn;}};
    const game={_levelEpoch:2,_outcome:'complete',_active:false};
    const sandbox={nextBtn,overlay,game,navigationGeneration:1,document:{hidden:false,getElementById:()=>({classList:{contains:()=>true}})},
        isStillCompleted:()=>game._outcome==='complete',isAdPresentationPending:()=>busy,
        maybeShowInterstitial:options=>{assert.equal(options.placement,'level-result');assert.equal(options.isCurrent(),true);return d.promise;},
        nextLevel:{chapter:1},completedLevel:{chapter:1},chapters:[{id:1}],
        storage:{isBossLocked:()=>false},screenManager:{onStartLevel:()=>starts.push('next'),showLevels:()=>starts.push('levels'),showChapters:()=>starts.push('chapters')}};
    vm.createContext(sandbox);vm.runInContext(nextSource,sandbox);
    return {sandbox,overlay,nextBtn,game,d,starts,setBusy:value=>{busy=value;}};
}
await check('actual Next starts once only after dismissal and blocks duplicate taps',async()=>{
    const h=nextFixture(),run=h.nextBtn.click();assert.equal(h.starts.length,0);assert.equal(h.nextBtn.disabled,true);
    await h.nextBtn.click();assert.equal(h.starts.length,0);h.d.resolve(true);await run;assert.deepEqual(h.starts,['next']);
});
await check('actual Next restores its result on background or a quarantined presentation timeout',async()=>{
    for(const kind of ['background','pending']){
        const h=nextFixture(),run=h.nextBtn.click();
        if(kind==='background')h.sandbox.document.hidden=true;else h.setBusy(true);
        h.d.resolve(false);await run;assert.equal(h.starts.length,0);assert.equal(h.overlay.hidden,false);assert.equal(h.nextBtn.disabled,false);
        h.sandbox.document.hidden=false;h.setBusy(false);await h.nextBtn.click();assert.deepEqual(h.starts,['next']);
    }
});
await check('actual Next never restores a stale result after route or puzzle changes',async()=>{
    for(const kind of ['route','level']){
        const h=nextFixture(),run=h.nextBtn.click();
        if(kind==='route')h.sandbox.navigationGeneration++;else h.game._outcome='playing';
        h.d.resolve(false);await run;assert.equal(h.starts.length,0);assert.equal(h.overlay.hidden,true);
    }
});

console.log(JSON.stringify({passed:checks.length,checks,scope:'Real reward action and actual main UI binding in isolated fixtures; no live ad/device claim'},null,2));
