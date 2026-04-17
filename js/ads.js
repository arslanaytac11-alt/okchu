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

const INTERSTITIAL_EVERY_N_LEVELS = 4;

let initialized = false;
let bannerVisible = false;
let levelsSinceInterstitial = 0;
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
    useTestAds = testMode;

    const A = getPlugin();
    if (!A) return;

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
    } catch (e) {
        console.warn('[ads] init failed', e);
    }
}

export async function showBanner() {
    if (isPremium()) return;
    const A = getPlugin();
    if (!A || !initialized || bannerVisible) return;
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
    }
}

export async function hideBanner() {
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
    const A = getPlugin();
    if (!A || !initialized) return false;
    try {
        await A.prepareInterstitial({ adId: unitId('interstitial'), isTesting: useTestAds });
        await A.showInterstitial();
        levelsSinceInterstitial = 0;
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
