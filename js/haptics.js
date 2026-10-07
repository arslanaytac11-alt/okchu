// The static Capacitor build uses injected native plugin proxies directly.
// Browser vibration is a harmless fallback; Safari ignores it.
function fallback(pattern) {
    try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch {}
}
function feedback(method, options, pattern) {
    try {
        const capacitor = typeof window !== 'undefined' ? window.Capacitor : null;
        if (!capacitor?.isNativePlatform?.()) { fallback(pattern); return; }
        const plugin = capacitor.Plugins?.Haptics || capacitor.registerPlugin?.('Haptics');
        if (!plugin?.[method]) { fallback(pattern); return; }
        Promise.resolve(plugin[method](options)).catch(() => fallback(pattern));
    } catch { fallback(pattern); }
}
export function tapLight() { feedback('impact', {style:'LIGHT'}, 10); }
export function tapMedium() { feedback('impact', {style:'MEDIUM'}, 20); }
export function tapHeavy() { feedback('impact', {style:'HEAVY'}, 40); }
export function notifySuccess() { feedback('notification', {type:'SUCCESS'}, [30,30,60]); }
export function notifyWarning() { feedback('notification', {type:'WARNING'}, [20,30,20]); }
export function notifyError() { feedback('notification', {type:'ERROR'}, [50,30,80]); }
