import assert from 'node:assert/strict';

// No ad SDK, network, or real ad requests: native calls resolve only when a
// scenario explicitly completes them.
const memory = new Map();
globalThis.localStorage = {
    getItem: key => memory.get(key) || null,
    setItem: (key, value) => memory.set(key, value),
};
const pendingShows = [], pendingHides = [], retries = [];
const nativeListeners = new Map(), cssProperties = new Map();
globalThis.document = { documentElement: { style: { setProperty: (key, value) => cssProperties.set(key, value) } } };
let showCalls = 0, hideCalls = 0, displayed = false, deferHides = false;
let finishInitialize;
const originalTimeout = globalThis.setTimeout;
const originalWarn = console.warn;
globalThis.setTimeout = callback => { retries.push(callback); return retries.length; };
console.warn = () => {};
const native = {
    initialize() { return new Promise(resolve => { finishInitialize = resolve; }); },
    async trackingAuthorizationStatus() { return { status: 'authorized' }; },
    addListener(name, callback) { nativeListeners.set(name, callback); return { remove() {} }; },
    showBanner(options) {
        assert.equal(options.isTesting, true);
        showCalls++;
        return new Promise((resolve, reject) => pendingShows.push({
            resolve() { displayed = true; resolve(); }, reject,
        }));
    },
    hideBanner() {
        hideCalls++;
        if (deferHides) return new Promise(resolve => pendingHides.push(() => { displayed = false; resolve(); }));
        displayed = false;
        return Promise.resolve();
    },
};
globalThis.window = { Capacitor: { isNativePlatform: () => true, Plugins: { AdMob: native, AdsConsent: { async gatherConsent() { return {canRequestAds:true,privacyOptionsRequired:false}; } } } } };
const { initAds, showBanner, hideBanner } = await import('../js/ads.js');
const { storage } = await import('../js/storage.js');
let checks = 0;
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

// Canceling a request while SDK initialization is pending must not replay it.
const initialization = initAds({ testMode: true });
const initializingShow = showBanner(), initializingHide = hideBanner();
await tick();
finishInitialize();
await Promise.all([initialization, initializingShow, initializingHide]);
assert.equal(showCalls, 0);
assert.equal(displayed, false);
assert.equal(cssProperties.get('--banner-height'), '0px');
checks++;

// Leaving a game while its native show is pending must hide that late result.
let show = showBanner();
let hide = hideBanner();
assert.equal(hideCalls, 0);
nativeListeners.get('bannerAdSizeChanged')({ height: 90 });
assert.equal(cssProperties.get('--banner-height'), '0px', 'A late size event must not reserve a hidden banner');
pendingShows.shift().resolve();
await Promise.all([show, hide]);
assert.equal(displayed, false);
assert.equal(hideCalls, 1);
checks++;

// Duplicate show requests must join the same native operation.
let first = showBanner(), second = showBanner();
assert.equal(pendingShows.length, 1);
assert.equal(showCalls, 2);
pendingShows.shift().resolve();
await Promise.all([first, second]);
assert.equal(displayed, true);
nativeListeners.get('bannerAdSizeChanged')({ height: 90 });
assert.equal(cssProperties.get('--banner-height'), '90px', 'Native adaptive height must govern the reserved space');
nativeListeners.get('bannerAdSizeChanged')({ height: NaN });
nativeListeners.get('bannerAdSizeChanged')({ height: -1 });
assert.equal(cssProperties.get('--banner-height'), '90px');
await hideBanner();
assert.equal(cssProperties.get('--banner-height'), '0px');
checks++;

// The latest navigation request wins when a user returns before show resolves.
const beforeHides = hideCalls;
first = showBanner();
assert.equal(cssProperties.get('--banner-height'), '90px', 'The last measured height reserves the next native request');
hide = hideBanner();
second = showBanner();
assert.equal(pendingShows.length, 1);
pendingShows.shift().resolve();
await Promise.all([first, hide, second]);
assert.equal(displayed, true);
assert.equal(hideCalls, beforeHides);
checks++;

// A new show during a pending hide waits for hide, then recreates the banner.
deferHides = true;
hide = hideBanner();
show = showBanner();
assert.equal(pendingHides.length, 1);
assert.equal(pendingShows.length, 0);
pendingHides.shift()();
await tick();
assert.equal(pendingShows.length, 1);
pendingShows.shift().resolve();
await Promise.all([hide, show]);
assert.equal(displayed, true);
deferHides = false;
await hideBanner();
checks++;

// A premium purchase while show is pending suppresses the completed banner.
show = showBanner();
storage.setPremium(true);
hide = hideBanner();
pendingShows.shift().resolve();
await Promise.all([show, hide]);
assert.equal(displayed, false);
const premiumShowCalls = showCalls;
await showBanner();
assert.equal(showCalls, premiumShowCalls);
assert.equal(cssProperties.get('--banner-height'), '0px');
storage.setPremium(false);
await hideBanner();
checks++;

// A retry from an old game cannot revive its banner after navigation.
show = showBanner();
pendingShows.shift().reject(new Error('Mock no-fill'));
await show;
assert.equal(retries.length, 1);
await hideBanner();
const failedShowCalls = showCalls;
retries.splice(0).forEach(callback => callback());
await tick();
assert.equal(showCalls, failedShowCalls);
assert.equal(displayed, false);
checks++;

// A failed hide retries the same desired state without overlapping operations.
show = showBanner();
pendingShows.shift().resolve();
await show;
let failedOnce = true;
const usualHide = native.hideBanner;
native.hideBanner = () => {
    if (failedOnce) { failedOnce = false; return Promise.reject(new Error('Mock hide failure')); }
    return usualHide();
};
await hideBanner();
assert.equal(displayed, true);
retries.splice(0).forEach(callback => callback());
await tick();
assert.equal(displayed, false);
checks++;

globalThis.setTimeout = originalTimeout;
console.warn = originalWarn;
console.log(JSON.stringify({ passed: checks, scope: 'Native AdMob mock: asynchronous show/hide, adaptive height, latest navigation, duplicate shows, premium and stale retries; no real ad requests' }, null, 2));
