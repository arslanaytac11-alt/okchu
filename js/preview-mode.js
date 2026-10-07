// Temporary inspection access is allowed only by an explicit loopback URL.
// Native WebViews can also report localhost, so bridge presence must deny it.
export function isLocalReviewMode(environment = globalThis) {
    try {
        const pageWindow = environment.window || environment;
        for (const surface of [environment, pageWindow]) {
            const handlers = surface.webkit?.messageHandlers;
            if (surface.Capacitor || surface.cordova || surface.ReactNativeWebView ||
                surface.androidBridge || handlers?.bridge || handlers?.cordova || handlers?.capacitor) return false;
        }
        const pageLocation = environment.location || pageWindow.location;
        if (!pageLocation?.href) return false;
        const url = new URL(pageLocation.href);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
        if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname)) return false;
        const requested = url.searchParams.getAll('kontrol');
        return requested.length === 1 && requested[0] === '1';
    } catch {
        return false;
    }
}
