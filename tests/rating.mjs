import assert from 'node:assert/strict';
import {shouldShowRatePrompt,showRatePrompt} from '../js/rate-us.js';
const memory = new Map();
let now = 100000;
Date.now = () => now;
globalThis.localStorage = {getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
globalThis.document = {getElementById:()=>{throw new Error('A custom review prompt must never open');}};
let requests = 0;
const plugin = {requestReview:async()=>{requests++;return {requested:true};}};
globalThis.window = {Capacitor:{isNativePlatform:()=>false,Plugins:{AppReview:plugin}},open:()=>{throw new Error('Automatic review flow must use StoreKit, not navigation');}};
const state = () => JSON.parse(memory.get('okchu_rate_state') || '{}');
const setState = value => memory.set('okchu_rate_state',JSON.stringify(value));
let checks = 0;

assert.equal(shouldShowRatePrompt({totalCleared:50,perfectLevels:50}),false);
await showRatePrompt();assert.equal(requests,0);checks++;
window.Capacitor.isNativePlatform = () => true;
assert.equal(shouldShowRatePrompt({totalCleared:4,perfectLevels:4}),false);
assert.equal(shouldShowRatePrompt({totalCleared:5,perfectLevels:0}),true);
assert.equal(shouldShowRatePrompt({totalCleared:0,perfectLevels:50}),false);checks++;
await showRatePrompt();
assert.equal(requests,1);assert.equal(state().prompts,1);assert.equal(state().lastPromptAt,now);
assert.equal(state().lastRating,undefined);assert.equal(state().done,undefined);checks++;
assert.equal(shouldShowRatePrompt({totalCleared:5}),false);
await showRatePrompt();assert.equal(requests,1);
now += 14 * 24 * 60 * 60 * 1000;
assert.equal(shouldShowRatePrompt({totalCleared:5}),true);checks++;
setState({done:true});assert.equal(shouldShowRatePrompt({totalCleared:50}),false);
await showRatePrompt();assert.equal(requests,1);
setState({prompts:3});assert.equal(shouldShowRatePrompt({totalCleared:50}),false);
await showRatePrompt();assert.equal(requests,1);checks++;

// Historical ratings never select a different route. No rating information
// is available from StoreKit, and prior low stars do not redirect to email.
for (let rating = 1; rating <= 5; rating++) {
    setState({lastRating:rating});
    await showRatePrompt();
    assert.equal(state().lastRating,rating);assert.equal(state().prompts,1);
}
assert.equal(requests,6);checks++;
memory.clear();let resolve;
window.Capacitor.Plugins.AppReview = {requestReview:()=>{requests++;return new Promise(done=>resolve=done);}};
const first = showRatePrompt();
assert.equal(shouldShowRatePrompt({totalCleared:10}),false);
const duplicate = showRatePrompt();assert.equal(requests,7);
resolve({requested:true});await Promise.all([first,duplicate]);
assert.equal(state().prompts,1);checks++;
memory.clear();window.Capacitor.Plugins.AppReview = {requestReview:async()=>{throw new Error('Foreground scene unavailable');}};
await showRatePrompt();assert.deepEqual(state(),{});checks++;
memory.clear();window.Capacitor.Plugins = {};
await showRatePrompt();assert.deepEqual(state(),{});checks++;
let registered;
window.Capacitor.registerPlugin = name => {registered=name;return plugin;};
await showRatePrompt();assert.equal(registered,'AppReview');assert.equal(requests,8);checks++;
memory.clear();memory.set('okchu_rate_state','null');assert.equal(shouldShowRatePrompt({totalCleared:5}),true);
globalThis.localStorage = {getItem:()=>{throw new Error('Storage unavailable');},setItem:()=>{throw new Error('Storage unavailable');}};
await showRatePrompt();assert.equal(requests,9);checks++;
console.log(JSON.stringify({checks,nativeRequests:requests,historicalRatingsSameNativeRoute:5,noCustomPrompt:true,noAutomaticStoreNavigation:true,noEmailRedirect:true},null,2));
