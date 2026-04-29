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
let levelsSinceInterstitial = 0;
// Persisted across app launches so the 90s gate can't be reset by killing and
// reopening the app — matches AdMob policy spirit ("don't surprise the user
// with back-to-back ads"). localStorage survives WKWebView restarts.
let lastInterstitialAt = (() => {
    try { return parseInt(localStorage.getItem(LAST_INTERSTITIAL_KEY) || '0', 10) || 0; }
    catch { return 0; }
})();
let useTestAds = false;

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

export async function initAds({ testMode = false } = {}) {
    if (initialized) return;
    if (initInFlight) return initInFlight;

    useTestAds = testMode;
    const A = getPlugin();
    if (!A) return;

    initInFlight = (async () => {
        try {
            await A.initialize({
                initializeForTesting: testMode,
                testingDevices: [],
                tagForChildDirectedTreatment: false,
                tagForUnderAgeOfConsent: false,
                maxAdContentRating: 'G',
            });

            try {
                const status = await A.trackingAuthorizationStatus();
                if (status?.status === 'notDetermined') {
                    await A.requestTrackingAuthorization();
                }
            } catch {}

            initialized = true;
            // Replay any pending banner request that came in before init finished.
            if (bannerWantedVisible) {
                showBanner().catch(() => {});
            }
        } catch (e) {
            console.warn('[ads] init failed', e);
        }
    })();
    return initInFlight;
}

export async function showBanner() {
    bannerWantedVisible = true;
    if (isPremium()) return;
    const A = getPlugin();
    if (!A) return;
    // If init is still in-flight, wait for it instead of dropping the call.
    if (!initialized && initInFlight) {
        try { await initInFlight; } catch {}
    }
    if (!initialized || bannerVisible) return;
    try {
        await A.showBanner({
            adId: unitId('banner'),
            adSize: 'ADAPTIVE_BANNER',
            position: 'BOTTOM_CENTER',
            margin: 0,
            isTesting: useTestAds,
        });
        bannerVisible = true;
    } catch (e) {
        console.warn('[ads] showBanner failed', e);
        // Retry once after 3 s — most failures here are transient
        // network or no-fill that resolves shortly.
        setTimeout(() => {
            if (bannerWantedVisible && !bannerVisible) showBanner().catch(() => {});
        }, 3000);
    }
}

export async function hideBanner() {
    bannerWantedVisible = false;
    const A = getPlugin();
    if (!A || !bannerVisible) return;
    try { await A.hideBanner(); bannerVisible = false; } catch {}
}

export function noteLevelCompleted() {
    levelsSinceInterstitial += 1;
}

export async function maybeShowInterstitial() {
    if (isPremium()) return false;
    if (levelsSinceInterstitial < INTERSTITIAL_EVERY_N_LEVELS) return false;
    // Time-gate: even if level count hit, don't show if last ad was too recent.
    const now = Date.now();
    if (lastInterstitialAt && (now - lastInterstitialAt) < MIN_INTERSTITIAL_GAP_MS) return false;
    const A = getPlugin();
    if (!A || !initialized) return false;
    try {
        await A.prepareInterstitial({ adId: unitId('interstitial'), isTesting: useTestAds });
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
    if (!A || !initialized) {
        // Web dev: grant reward immediately so the button still works.
        return true;
    }
    try {
        await A.prepareRewardVideoAd({ adId: unitId('rewarded'), isTesting: useTestAds });
        const result = await A.showRewardVideoAd();
        return !!(result && (result.type || result.amount));
    } catch (e) {
        console.warn('[ads] rewarded failed', e);
        return false;
    }
}
