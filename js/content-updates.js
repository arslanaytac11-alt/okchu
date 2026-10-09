import { isLocalReviewMode } from './preview-mode.js';

// Reviewed content only. App code, rules, plugins and permissions remain in the
// App Store binary. A downloaded packet takes effect on the NEXT app launch.
export const CONTENT_UPDATE_URL = 'https://raw.githubusercontent.com/arslanaytac11-alt/okchu/main/ota/1.1.1.json';
export const CONTENT_CACHE_KEY = 'okchu.content.v1.staged';
export const CONTENT_MAX_BYTES = 32 * 1024;
export const CONTENT_RELEASE = Object.freeze({ schemaVersion: 1, appVersion: '1.1.1', nativeBuild: 149 });
const LANGUAGES = new Set(['tr', 'en', 'es', 'fr', 'ja']);
const AD_TYPES = new Set(['banner', 'interstitial', 'rewarded']);
const TEXT_KEYS = new Set(['game.zoom_hint', ...Array.from({ length: 10 }, (_, i) =>
    [`civilizations.${i + 1}.text`, `civilizations.${i + 1}.mystery`]).flat()]);
const UNSAFE_TEXT = /[<>\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]|&(?:#\d+|#x[0-9a-f]+|lt|gt|amp|quot|apos);/i;
const byteLength = value => new TextEncoder().encode(value).byteLength;
const plainObject = value => value !== null && typeof value === 'object' &&
    !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const hasOnlyKeys = (value, allowed) => plainObject(value) && Object.keys(value).every(key => allowed.has(key));
const deepFreeze = value => {
    for (const child of Object.values(value)) if (child && typeof child === 'object') deepFreeze(child);
    return Object.freeze(value);
};

export function validateContentPacket(raw) {
    try {
        if (typeof raw !== 'string' || byteLength(raw) > CONTENT_MAX_BYTES) return null;
        const packet = JSON.parse(raw);
        const fields = new Set(['schemaVersion', 'appVersion', 'nativeBuild', 'revision', 'texts', 'disableAds']);
        if (!hasOnlyKeys(packet, fields) || Object.keys(packet).length !== fields.size ||
            packet.schemaVersion !== CONTENT_RELEASE.schemaVersion || packet.appVersion !== CONTENT_RELEASE.appVersion ||
            packet.nativeBuild !== CONTENT_RELEASE.nativeBuild || !Number.isSafeInteger(packet.revision) || packet.revision < 1 ||
            !hasOnlyKeys(packet.texts, LANGUAGES) || !hasOnlyKeys(packet.disableAds, AD_TYPES)) return null;
        for (const [language, texts] of Object.entries(packet.texts)) {
            if (!LANGUAGES.has(language) || !hasOnlyKeys(texts, TEXT_KEYS)) return null;
            for (const [key, value] of Object.entries(texts)) {
                const limit = key === 'game.zoom_hint' ? 160 : key.endsWith('.mystery') ? 500 : 3000;
                if (typeof value !== 'string' || !value.trim() || value.length > limit || UNSAFE_TEXT.test(value) ||
                    [...value].some(char => { const code = char.codePointAt(0); return code >= 0xd800 && code <= 0xdfff; })) return null;
            }
        }
        // The remote lane can only opt OUT of an already reviewed ad type.
        // Local Premium/UMP/lifecycle/frequency policy remains authoritative.
        if (Object.values(packet.disableAds).some(value => value !== true)) return null;
        return deepFreeze(packet);
    } catch { return null; }
}

export function createContentUpdateClient({ environment = globalThis, fetchImpl, timeoutMs = 4000 } = {}) {
    let captured = false, active = null, inFlight = null;
    const permitted = () => {
        try {
            const page = environment.window || environment;
            return !isLocalReviewMode(environment) && page.Capacitor?.isNativePlatform?.() === true;
        } catch { return false; }
    };
    const cached = () => {
        if (!permitted()) return null;
        try { return validateContentPacket(environment.localStorage?.getItem(CONTENT_CACHE_KEY)); }
        catch { return null; }
    };
    function loadCachedContentUpdates() {
        if (!permitted()) return null;
        if (!captured) { active = cached(); captured = true; }
        return active;
    }
    function getContentText(language, key) {
        if (!LANGUAGES.has(language) || !TEXT_KEYS.has(key)) return undefined;
        return loadCachedContentUpdates()?.texts[language]?.[key];
    }
    function isAdTypeDisabled(type) {
        return AD_TYPES.has(type) && loadCachedContentUpdates()?.disableAds[type] === true;
    }
    async function readBoundedResponse(response) {
        if (response?.ok !== true || (response.url && response.url !== CONTENT_UPDATE_URL)) throw new Error('Content unavailable');
        const declared = response.headers?.get?.('content-length');
        if (declared && (!/^\d+$/.test(declared) || Number(declared) > CONTENT_MAX_BYTES)) throw new Error('Content exceeds limit');
        if (!response.body?.getReader) {
            const raw = await response.text();
            if (byteLength(raw) > CONTENT_MAX_BYTES) throw new Error('Content exceeds limit');
            return raw;
        }
        const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
        let bytes = 0, raw = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                bytes += value.byteLength;
                if (bytes > CONTENT_MAX_BYTES) throw new Error('Content exceeds limit');
                raw += decoder.decode(value, { stream: true });
            }
            return raw + decoder.decode();
        } catch (error) { await reader.cancel().catch(() => {}); throw error; }
        finally { reader.releaseLock(); }
    }
    async function initializeContentUpdates() {
        if (!permitted()) return { status: 'disabled', activeRevision: 0 };
        loadCachedContentUpdates();
        if (inFlight) return inFlight;
        inFlight = (async () => {
            const controller = new AbortController();
            let timer;
            try {
                const request = (async () => {
                    const fetcher = fetchImpl || environment.fetch?.bind(environment);
                    if (!fetcher) throw new Error('Content unavailable');
                    const response = await fetcher(CONTENT_UPDATE_URL, {
                        signal: controller.signal, credentials: 'omit', cache: 'no-store',
                        redirect: 'error', referrerPolicy: 'no-referrer',
                    });
                    return readBoundedResponse(response);
                })();
                const deadline = new Promise((_, reject) => {
                    timer = setTimeout(() => { controller.abort(); reject(new Error('Content timeout')); }, Math.max(1, timeoutMs));
                });
                const packet = validateContentPacket(await Promise.race([request, deadline]));
                if (!packet) throw new Error('Invalid content');
                const previousRevision = Math.max(active?.revision || 0, cached()?.revision || 0);
                if (packet.revision <= previousRevision) return { status: 'unchanged', activeRevision: active?.revision || 0 };
                if (!permitted() || !environment.localStorage) throw new Error('Content storage unavailable');
                environment.localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(packet));
                return { status: 'staged', activeRevision: active?.revision || 0, stagedRevision: packet.revision };
            } catch { return { status: 'unavailable', activeRevision: active?.revision || 0 }; }
            finally { clearTimeout(timer); }
        })().finally(() => { inFlight = null; });
        return inFlight;
    }
    return Object.freeze({ loadCachedContentUpdates, initializeContentUpdates, getContentText, isAdTypeDisabled });
}

const client = createContentUpdateClient();
export const loadCachedContentUpdates = client.loadCachedContentUpdates;
export const initializeContentUpdates = client.initializeContentUpdates;
export const getContentText = client.getContentText;
export const isAdTypeDisabled = client.isAdTypeDisabled;
