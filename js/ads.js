// js/ads.js — AdMob integration for Okchu (Capacitor).
// Web/PWA: all functions are no-ops so browser development stays unaffected.
// iOS: uses the globally-registered Capacitor plugin at
// window.Capacitor.Plugins.AdMob (from @capacitor-community/admob native side).

import { storage } from './storage.js';

const AD_UNITS = {
    banner:       'ca-app-pub-9257944510825127/1705675974',
    interstitial: 'ca-app-pub-9257944510825127/4742902857',
    rewarded:     'ca-app-pub-9257944510825127/8490576171',
};

// Google-published test IDs — used automatically in dev builds so we never
// risk clicking live ads while debugging.
const TEST_UNITS = {
    banner:       'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded:     'ca-app-pub-3940256099942544/1712485313',
};

// Interstitial pacing: every N completed levels, but never closer than
// MIN_INTERSTITIAL_GAP_MS apart so rapid replays don't get back-to-back ads.
// Tuned for ~2-5 min sessions per level — 6 levels ≈ 15-25 min between ads.
const INTERSTITIAL_EVERY_N_LEVELS = 6;
const MIN_INTERSTITIAL_GAP_MS = 90_000; // 90s floor
const LAST_INTERSTITIAL_KEY = 'okchu.ads.lastInterstitialAt';

let initialized = false;
let initInFlight = null; // Promise — set by initAds, awaited by ad-show calls
let bannerVisible = false;
let bannerWantedVisible = false; // last requested state — used by retries
let bannerRequestEpoch = 0;
let bannerSyncInFlight = null;
let bannerMeasuredHeight = 50;
let bannerSizeListenerBound = false;
let levelsSinceInterstitial = 0;
// Persisted across app launches so the 90s gate can't be reset by killing and
// reopening the app — matches AdMob policy spirit ("don't surprise the user
// with back-to-back ads"). localStorage survives WKWebView restarts.
let lastInterstitialAt = (() => {
    try { return parseInt(localStorage.getItem(LAST_INTERSTITIAL_KEY) || '0', 10) || 0; }
    catch { return 0; }
})();
let useTestAds = false;
let adsAllowed = false;
let privacyOptionsRequired = false;
let sdkInitInFlight = null;

function getConsentPlugin() {
    if (!isNative()) return null;
    try {
        return window.Capacitor?.Plugins?.AdsConsent || window.Capacitor?.registerPlugin?.('AdsConsent') || null;
    } catch { return null; }
}

function applyConsentStatus(status) {
    adsAllowed = status?.canRequestAds === true;
    privacyOptionsRequired = status?.privacyOptionsRequired === true;
    if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
        document.dispatchEvent(new CustomEvent('okchu:ad-privacy', { detail: { privacyOptionsRequired } }));
    }
    if (!adsAllowed) reserveBannerHeight(0);
}

export function isAdPrivacyOptionsRequired() { return privacyOptionsRequired; }

async function initializeAdSdk(A) {
    if (initialized || !adsAllowed || isPremium()) return;
    if (sdkInitInFlight) return sdkInitInFlight;
    sdkInitInFlight = (async () => {
        await A.initialize({
            initializeForTesting: useTestAds,
            testingDevices: [],
            tagForChildDirectedTreatment: false,
            tagForUnderAgeOfConsent: false,
            maxAdContentRating: 'G',
        });
        try {
            const status = await A.trackingAuthorizationStatus();
            if (status?.status === 'notDetermined') await A.requestTrackingAuthorization();
        } catch {}
        initialized = true;
    })().finally(() => { sdkInitInFlight = null; });
    return sdkInitInFlight;
}

export async function showAdPrivacyOptions() {
    const consent = getConsentPlugin();
    if (!consent || !privacyOptionsRequired) return false;
    try {
        applyConsentStatus(await consent.showPrivacyOptions());
        const A = getPlugin();
        if (A && adsAllowed) await initializeAdSdk(A);
        await synchronizeBanner();
        return true;
    } catch {
        // Keep the last SDK permission if the options UI cannot load.
        return false;
    }
}

// Rewarded-ad event tracking. The @capacitor-community/admob v6 plugin has
// two known iOS bugs that strand the show promise: (1) showRewardVideoAd's
// call.resolve only fires inside userDidEarnRewardHandler, so a dismissal
// without earning never resolves; (2) prepareRewardVideoAd's load completion
// can hang on the second call in a session. Listening to the plugin's
// events instead of awaiting the promises lets us detect both reward and
// failure deterministically and recover with a timeout.
let rewardListenersBound = false;
let pendingReward = null; // { onLoaded, onLoadFail, onReward, onDismissed, onShowFail }

function bindRewardListeners(A) {
    if (rewardListenersBound) return;
    rewardListenersBound = true;
    const dispatch = (key, payload) => {
        if (!pendingReward) return;
        const fn = pendingReward[key];
        if (fn) fn(payload);
    };
    A.addListener('onRewardedVideoAdLoaded',       (info)  => dispatch('onLoaded', info));
    A.addListener('onRewardedVideoAdFailedToLoad', (err)   => dispatch('onLoadFail', err));
    A.addListener('onRewardedVideoAdReward',       (rew)   => dispatch('onReward', rew));
    A.addListener('onRewardedVideoAdDismissed',    ()      => dispatch('onDismissed'));
    A.addListener('onRewardedVideoAdFailedToShow', (err)   => dispatch('onShowFail', err));
}

function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function getPlugin() {
    if (!isNative()) return null;
    return window.Capacitor?.Plugins?.AdMob || null;
}

function isPremium() {
    try { return storage.isPremium && storage.isPremium(); } catch { return false; }
}

function unitId(kind) {
    return useTestAds ? TEST_UNITS[kind] : AD_UNITS[kind];
}

function reserveBannerHeight(height) {
    if (typeof document !== 'undefined') {
        document.documentElement?.style?.setProperty('--banner-height', `${height}px`);
    }
}

function bindBannerSize(A) {
    if (bannerSizeListenerBound || typeof A.addListener !== 'function') return;
    bannerSizeListenerBound = true;
    Promise.resolve(A.addListener('bannerAdSizeChanged', info => {
        const height = Number(info?.height);
        if (!Number.isFinite(height) || height < 0) return;
        if (height > 0) bannerMeasuredHeight = height;
        reserveBannerHeight(bannerWantedVisible && adsAllowed && !isPremium() ? height : 0);
    })).catch(() => { bannerSizeListenerBound = false; });
}

export async function initAds({ testMode = false } = {}) {
    if (initialized) return;
    if (initInFlight) return initInFlight;

    useTestAds = testMode;
    const A = getPlugin();
    if (!A) return;
    bindBannerSize(A);

    initInFlight = (async () => {
        try {
            // UMP owns the current permission, including any previously
            // collected choice. Never infer it from ATT or a cached JS flag.
            const consent = getConsentPlugin();
            if (!consent) { applyConsentStatus(null); return; }
            applyConsentStatus(await consent.gatherConsent());
            await initializeAdSdk(A);
            // Replay any pending banner request that came in before init finished.
            if (bannerWantedVisible) {
                synchronizeBanner().catch(() => {});
            }
        } catch (e) {
            console.warn('[ads] init failed', e);
        }
    })();
    return initInFlight;
}

export async function showBanner() {
    bannerWantedVisible = true;
    bannerRequestEpoch++;
    reserveBannerHeight(getPlugin() && adsAllowed && !isPremium() ? bannerMeasuredHeight : 0);
    return synchronizeBanner();
}

export async function hideBanner() {
    bannerWantedVisible = false;
    bannerRequestEpoch++;
    reserveBannerHeight(0);
    return synchronizeBanner();
}

function synchronizeBanner() {
    if (bannerSyncInFlight) return bannerSyncInFlight;
    let settledEpoch = bannerRequestEpoch;
    const operation = (async () => {
        if (!initialized && initInFlight) {
            try { await initInFlight; } catch {}
        }
        const A = getPlugin();
        if (!A || !initialized) {
            settledEpoch = bannerRequestEpoch;
            return;
        }
        // Serialize native operations. A screen may change while show/hide
        // is pending, so reconcile the latest request after every response.
        while (true) {
            const epoch = bannerRequestEpoch;
            const wanted = bannerWantedVisible && adsAllowed && !isPremium();
            if (wanted === bannerVisible) {
                settledEpoch = epoch;
                return;
            }
            try {
                if (wanted) {
                    reserveBannerHeight(bannerMeasuredHeight);
                    await A.showBanner({
                        adId: unitId('banner'),
                        adSize: 'ADAPTIVE_BANNER',
                        position: 'BOTTOM_CENTER',
                        margin: 0,
                        isTesting: useTestAds,
                    });
                } else {
                    await A.hideBanner();
                }
                bannerVisible = wanted;
            } catch (error) {
                settledEpoch = epoch;
                console.warn(`[ads] ${wanted ? 'showBanner' : 'hideBanner'} failed`, error);
                // A retry belongs to the screen request that failed. It
                // must not revive a banner after navigation or a purchase.
                setTimeout(() => {
                    if (bannerRequestEpoch === epoch && (bannerWantedVisible && adsAllowed && !isPremium()) !== bannerVisible) {
                        synchronizeBanner().catch(() => {});
                    }
                }, 3000);
                return;
            }
        }
    })();
    bannerSyncInFlight = operation.finally(() => {
        bannerSyncInFlight = null;
        if (bannerRequestEpoch !== settledEpoch) return synchronizeBanner();
    });
    return bannerSyncInFlight;
}

export function noteLevelCompleted() {
    levelsSinceInterstitial += 1;
}

export async function maybeShowInterstitial() {
    if (isPremium() || !adsAllowed) return false;
    if (levelsSinceInterstitial < INTERSTITIAL_EVERY_N_LEVELS) return false;
    // Time-gate: even if level count hit, don't show if last ad was too recent.
    const now = Date.now();
    if (lastInterstitialAt && (now - lastInterstitialAt) < MIN_INTERSTITIAL_GAP_MS) return false;
    const A = getPlugin();
    if (!A || !initialized) return false;
    try {
        await A.prepareInterstitial({ adId: unitId('interstitial'), isTesting: useTestAds });
        if (!adsAllowed || isPremium()) return false;
        await A.showInterstitial();
        levelsSinceInterstitial = 0;
        lastInterstitialAt = now;
        try { localStorage.setItem(LAST_INTERSTITIAL_KEY, String(now)); } catch {}
        return true;
    } catch (e) {
        console.warn('[ads] interstitial failed', e);
        return false;
    }
}

export async function showRewarded() {
    const A = getPlugin();
    // An unavailable native ad never earns a reward. The browser preview
    // supplies it without an SDK, and Premium owners need no ad to continue.
    if (!isNative() || isPremium()) return true;
    if (!A || !initialized || !adsAllowed) return false;
    if (pendingReward) return false; // a request is already in flight
    bindRewardListeners(A);

    // Phase 1: load. Wait for either the Loaded or FailedToLoad event with a
    // timeout — the prepare promise itself is unreliable across calls (see
    // comment near rewardListenersBound).
    const loaded = await new Promise((resolve) => {
        let done = false;
        const finish = (ok) => { if (!done) { done = true; pendingReward = null; resolve(ok); } };
        pendingReward = {
            onLoaded:   () => finish(true),
            onLoadFail: () => finish(false),
        };
        A.prepareRewardVideoAd({ adId: unitId('rewarded'), isTesting: useTestAds })
            .catch(() => finish(false));
        setTimeout(() => finish(false), 10000);
    });
    if (!loaded || !adsAllowed || isPremium()) return isPremium();

    // Phase 2: show. Resolve when Rewarded fires (success), or Dismissed /
    // FailedToShow / timeout (failure). We do not await showRewardVideoAd —
    // its promise only resolves on reward in this plugin version, hanging on
    // dismissal-without-reward.
    return new Promise((resolve) => {
        let done = false;
        let earned = false;
        const finish = (ok) => { if (!done) { done = true; pendingReward = null; resolve(ok); } };
        pendingReward = {
            onReward:    () => { earned = true; },
            onDismissed: () => {
                // Rewarded sometimes fires just after Dismissed on iOS — give
                // it a tick before deciding.
                setTimeout(() => finish(earned), 250);
            },
            onShowFail:  () => finish(false),
        };
        A.showRewardVideoAd().catch(() => {}); // its rejection path covered by onShowFail
        setTimeout(() => finish(earned), 90000); // ad cap is ~30s; 90s is a safe ceiling
    });
}
