// js/haptics.js
// Unified haptic feedback. iOS Safari + Capacitor WKWebView do NOT honour
// `navigator.vibrate` — Apple deliberately disables it. We must call the
// native Capacitor Haptics plugin to make the iPhone Taptic Engine fire.
// Falls back to navigator.vibrate on Android browsers / desktop dev so
// nothing breaks elsewhere.

let Haptics = null;
let ImpactStyle = null;
let NotificationType = null;
let nativeReady = false;

// Lazy-load the Capacitor plugin only if we're inside a native shell.
if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
    import('@capacitor/haptics').then((mod) => {
        Haptics = mod.Haptics;
        ImpactStyle = mod.ImpactStyle;
        NotificationType = mod.NotificationType;
        nativeReady = true;
    }).catch(() => { /* dev fallback to navigator.vibrate */ });
}

function webFallback(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}

// Light tap — single arrow removal, button taps. Should feel like a soft
// "tick" — barely perceptible but definitely there.
export function tapLight() {
    if (nativeReady && Haptics) {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => webFallback(10));
    } else {
        webFallback(10);
    }
}

// Medium tap — successful action, level milestone.
export function tapMedium() {
    if (nativeReady && Haptics) {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => webFallback(20));
    } else {
        webFallback(20);
    }
}

// Heavy thump — combo, wrong move, big event.
export function tapHeavy() {
    if (nativeReady && Haptics) {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => webFallback(40));
    } else {
        webFallback(40);
    }
}

// Success notification — level complete, achievement unlocked.
export function notifySuccess() {
    if (nativeReady && Haptics) {
        Haptics.notification({ type: NotificationType.Success }).catch(() => webFallback([30, 30, 60]));
    } else {
        webFallback([30, 30, 60]);
    }
}

// Warning — soft error, e.g. blocked arrow tap.
export function notifyWarning() {
    if (nativeReady && Haptics) {
        Haptics.notification({ type: NotificationType.Warning }).catch(() => webFallback([20, 30, 20]));
    } else {
        webFallback([20, 30, 20]);
    }
}

// Error — hard fail, lives lost, time up.
export function notifyError() {
    if (nativeReady && Haptics) {
        Haptics.notification({ type: NotificationType.Error }).catch(() => webFallback([50, 30, 80]));
    } else {
        webFallback([50, 30, 80]);
    }
}
