// js/ads.js — AdMob integration for Okchu (Capacitor).
// Web/PWA: all functions are no-ops so browser development stays unaffected.
// iOS: uses the globally-registered Capacitor plugin at
// window.Capacitor.Plugins.AdMob (from @capacitor-community/admob native side).

import { storage } from './storage.js';
import { AD_POLICY, createInterstitialPolicy } from './ad-policy.js';
import { isAdTypeDisabled } from './content-updates.js';

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

const LAST_INTERSTITIAL_KEY = 'okchu.ads.lastInterstitialAt';

let initialized = false;
let initInFlight = null; // Promise — set by initAds, awaited by ad-show calls
let bannerVisible = false;
let bannerWantedVisible = false; // last requested state — used by retries
let bannerRequestEpoch = 0;
let bannerSyncInFlight = null;
let bannerMeasuredHeight = 50;
let bannerSizeListenerBound = false;
// Persist the last actual presentation; reopening never resets the cooldown.
const lastInterstitialAt = (() => {
    try { return parseInt(localStorage.getItem(LAST_INTERSTITIAL_KEY) || '0', 10) || 0; }
    catch { return 0; }
})();
const interstitialPolicy = createInterstitialPolicy({ lastShownAt: lastInterstitialAt });
let useTestAds = false;
let adsAllowed = false;
let privacyOptionsRequired = false;
let sdkInitInFlight = null;
let foreground = true;
let lifecycleBound = false;
let adEpoch = 0;
let fullScreenRequest = null;
let fullScreenSuspended = false;
let interstitialReadyAt = 0;
let interstitialLoading = null;
let listenersReady = null;

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
    if (!adsAllowed) cancelPendingAds();
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
        initialized = true;
        if (!adsAllowed || isPremium() || !isForeground()) return;
        try {
            const status = await A.trackingAuthorizationStatus();
            if (status?.status === 'notDetermined') await A.requestTrackingAuthorization();
        } catch {}
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

function isForeground() {
    return foreground && (typeof document === 'undefined' || document.visibilityState !== 'hidden');
}

function canRequestAds(kind) {
    return initialized && adsAllowed && !isPremium() && isForeground() &&
        (!kind || !isAdTypeDisabled(kind));
}

function currentContext(options) {
    if (typeof options?.isCurrent !== 'function') return false;
    try { return options.isCurrent() === true; } catch { return false; }
}

function bindLifecycle() {
    if (lifecycleBound) return;
    lifecycleBound = true;
    document?.addEventListener?.('visibilitychange', () => {
        if (!isForeground()) cancelPendingAds();
        else synchronizeBanner().catch(() => {});
    });
    window?.addEventListener?.('pagehide', () => cancelPendingAds());
    const app = window.Capacitor?.Plugins?.App;
    if (typeof app?.addListener === 'function') {
        Promise.resolve(app.addListener('appStateChange', status => {
            foreground = status?.isActive === true;
            if (!foreground) cancelPendingAds();
            else synchronizeBanner().catch(() => {});
        })).catch(() => {});
    }
}

function bindFullScreenListeners(A) {
    if (listenersReady) return listenersReady;
    const listen = (event, kind, action) => A.addListener(event, payload => {
        const request = fullScreenRequest;
        if (request?.kind === kind) request[action]?.(payload);
    });
    listenersReady = Promise.all([
        listen('interstitialAdShowed', 'interstitial', 'onShowed'),
        listen('interstitialAdDismissed', 'interstitial', 'onDismissed'),
        listen('interstitialAdFailedToShow', 'interstitial', 'onShowFail'),
        listen('onRewardedVideoAdLoaded', 'rewarded', 'onLoaded'),
        listen('onRewardedVideoAdFailedToLoad', 'rewarded', 'onLoadFail'),
        listen('onRewardedVideoAdReward', 'rewarded', 'onReward'),
        listen('onRewardedVideoAdDismissed', 'rewarded', 'onDismissed'),
        listen('onRewardedVideoAdFailedToShow', 'rewarded', 'onShowFail'),
    ]).catch(error => { listenersReady = null; throw error; });
    return listenersReady;
}

// Call on navigation or entitlement changes. An in-flight native request is
// quarantined until its own terminal event, so a late reward cannot belong
// to a new button press. Cancellation itself never earns a reward.
export function cancelPendingAds() {
    adEpoch++;
    interstitialReadyAt = 0;
    fullScreenRequest?.cancel();
    bannerRequestEpoch++;
    reserveBannerHeight(bannerShouldShow() ? bannerMeasuredHeight : 0);
    synchronizeBanner().catch(() => {});
}

// A cancelled/timed-out promise does not dismiss native full-screen content.
// Navigation must retain its result overlay until the SDK terminal event.
export function isAdPresentationPending() {
    return fullScreenRequest?.phase === 'showing' || fullScreenRequest?.phase === 'dismissed';
}

function bannerShouldShow() {
    return bannerWantedVisible && adsAllowed && !isPremium() && isForeground() &&
        !fullScreenSuspended && !isAdTypeDisabled('banner');
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
        reserveBannerHeight(bannerShouldShow() ? height : 0);
    })).catch(() => { bannerSizeListenerBound = false; });
}

export async function initAds({ testMode = false } = {}) {
    if (initialized) return;
    if (initInFlight) return initInFlight;

    useTestAds = testMode;
    const A = getPlugin();
    if (!A) return;
    bindLifecycle();
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
    reserveBannerHeight(getPlugin() && bannerShouldShow() ? bannerMeasuredHeight : 0);
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
            const wanted = bannerShouldShow();
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
                    if (bannerRequestEpoch === epoch && bannerShouldShow() !== bannerVisible) {
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
    interstitialPolicy.noteCompletion();
    // Load at the result boundary. The next button never waits for a load,
    // nor can a late load completion open an unsolicited advertisement.
    preloadInterstitial().catch(() => {});
}

async function preloadInterstitial() {
    if (!canRequestAds('interstitial') || fullScreenRequest || interstitialLoading ||
        !interstitialPolicy.canShow({ placement: 'level-result' })) return;
    if (interstitialReadyAt && Date.now() - interstitialReadyAt < AD_POLICY.loadedAdLifetimeMs) return;
    const A = getPlugin();
    if (!A) return;
    const epoch = adEpoch;
    interstitialLoading = (async () => {
        let timer;
        try {
            const loaded = await Promise.race([
                Promise.resolve(A.prepareInterstitial({ adId: unitId('interstitial'), isTesting: useTestAds })).then(() => true),
                new Promise(resolve => { timer = setTimeout(() => resolve(false), AD_POLICY.loadTimeoutMs); }),
            ]);
            if (loaded && epoch === adEpoch && canRequestAds('interstitial')) interstitialReadyAt = Date.now();
        } catch { interstitialReadyAt = 0; }
        finally { clearTimeout(timer); }
    })().finally(() => { interstitialLoading = null; });
    return interstitialLoading;
}

function suspendBanner(suspended) {
    fullScreenSuspended = suspended;
    bannerRequestEpoch++;
    reserveBannerHeight(bannerShouldShow() ? bannerMeasuredHeight : 0);
    return synchronizeBanner();
}

function makeFullScreenRequest(kind, options) {
    const epoch = adEpoch;
    const timers = new Set();
    let settled = false;
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    const request = {
        kind, phase: 'loading', cancelled: false, earned: false, shown: false,
        promise,
        valid: () => !request.cancelled && epoch === adEpoch && canRequestAds(kind) && currentContext(options),
        timer(callback, delay) {
            const id = setTimeout(() => { timers.delete(id); callback(); }, delay);
            timers.add(id);
            return id;
        },
        clearTimer(id) { clearTimeout(id); timers.delete(id); },
        finish(ok, terminal = false) {
            if (!settled) { settled = true; resolve(ok === true && request.valid()); }
            if (terminal) {
                for (const id of timers) clearTimeout(id);
                timers.clear();
                if (fullScreenRequest === request) {
                    fullScreenRequest = null;
                    suspendBanner(false).catch(() => {});
                }
            }
        },
        cancel() {
            request.cancelled = true;
            request.finish(false);
            // Native load/presentation remains quarantined until its terminal
            // event. No following request can consume that request's callbacks.
        },
    };
    fullScreenRequest = request;
    return request;
}

export async function maybeShowInterstitial(options = {}) {
    if (!canRequestAds('interstitial') || fullScreenRequest || !currentContext(options) ||
        !interstitialPolicy.canShow({ placement: options.placement })) return false;
    const now = Date.now();
    if (!interstitialReadyAt || now - interstitialReadyAt >= AD_POLICY.loadedAdLifetimeMs) {
        preloadInterstitial().catch(() => {});
        return false;
    }
    const A = getPlugin();
    if (!A) return false;
    const request = makeFullScreenRequest('interstitial', options);
    request.onShowed = () => {
        if (request.shown) return;
        request.shown = true;
        const shownAt = Date.now();
        interstitialPolicy.noteShown(shownAt);
        try { localStorage.setItem(LAST_INTERSTITIAL_KEY, String(shownAt)); } catch {}
    };
    request.onDismissed = () => request.finish(request.shown, true);
    request.onShowFail = () => request.finish(false, true);
    try {
        await bindFullScreenListeners(A);
        if (!request.valid()) { request.finish(false, true); return request.promise; }
        await suspendBanner(true);
        if (!request.valid()) { request.finish(false, true); return request.promise; }
        interstitialReadyAt = 0; // Native full-screen objects are single-use.
        request.phase = 'showing';
        request.timer(() => request.cancel(), AD_POLICY.presentationTimeoutMs);
        // On iOS this promise resolves at presentation, not dismissal.
        // Navigation resumes only after the native terminal event.
        Promise.resolve(A.showInterstitial()).catch(() => request.onShowFail());
    } catch { request.finish(false, true); }
    return request.promise;
}

export async function showRewarded(options = {}) {
    // A reward requires an explicit offer/button and a live native SDK event.
    // Web preview and Premium benefits belong to the caller's separate rules.
    const A = getPlugin();
    if (!A || !canRequestAds('rewarded') || options.userInitiated !== true ||
        !currentContext(options) || fullScreenRequest || interstitialLoading) return false;
    const request = makeFullScreenRequest('rewarded', options);
    let loadTimer;
    request.onLoaded = async () => {
        if (request.phase !== 'loading') return;
        request.phase = 'loaded';
        request.clearTimer(loadTimer);
        if (!request.valid()) { request.finish(false, true); return; }
        try {
            await suspendBanner(true);
            if (!request.valid()) { request.finish(false, true); return; }
            request.phase = 'showing';
            request.timer(() => request.cancel(), AD_POLICY.presentationTimeoutMs);
            // The installed iOS show promise hangs on a dismissal without a
            // reward; SDK events below are the only reward authority.
            Promise.resolve(A.showRewardVideoAd()).catch(() => request.onShowFail());
        } catch { request.finish(false, true); }
    };
    request.onLoadFail = () => request.finish(false, true);
    request.onReward = () => {
        if ((request.phase === 'showing' || request.phase === 'dismissed') && request.valid()) request.earned = true;
    };
    request.onDismissed = () => {
        if (request.phase !== 'showing') return;
        request.phase = 'dismissed';
        // A short callback-order grace accommodates mediated adapters. It is
        // not a reward; only onReward can set earned, once for this request.
        request.timer(() => request.finish(request.earned, true), AD_POLICY.rewardDismissGraceMs);
    };
    request.onShowFail = () => request.finish(false, true);
    try {
        await bindFullScreenListeners(A);
        if (!request.valid()) { request.finish(false, true); return request.promise; }
        loadTimer = request.timer(() => request.cancel(), AD_POLICY.loadTimeoutMs);
        Promise.resolve(A.prepareRewardVideoAd({ adId: unitId('rewarded'), isTesting: useTestAds }))
            .then(() => request.onLoaded(), () => request.onLoadFail());
    } catch { request.finish(false, true); }
    return request.promise;
}
