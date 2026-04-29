// js/i18n.js
// Internationalization system

const LANG_KEY = 'ok_bulmacasi_lang';
const AVAILABLE_LANGS = ['tr', 'en', 'es', 'fr', 'ja'];

let currentLang = null;
let strings = {};

// Bumped whenever the lang JSON files change so the service worker's
// stale-while-revalidate cache can't serve last week's strings to a
// player who installed the app today. Keeping it in sync with main.js?v=
// is fine — both are part of the same release.
const LANG_VERSION = '6';

export async function loadLanguage(lang, { persist = true } = {}) {
    if (!AVAILABLE_LANGS.includes(lang)) lang = 'tr';
    try {
        const resp = await fetch(`lang/${lang}.json?v=${LANG_VERSION}`, { cache: 'no-cache' });
        strings = await resp.json();
        currentLang = lang;
        if (persist) localStorage.setItem(LANG_KEY, lang);
        document.documentElement.lang = lang;
        return strings;
    } catch (e) {
        console.warn('Failed to load language:', lang, e);
        return strings;
    }
}

export function hasSavedLanguage() {
    return !!localStorage.getItem(LANG_KEY);
}

export function t(key) {
    const parts = key.split('.');
    let val = strings;
    for (const p of parts) {
        if (val && typeof val === 'object') val = val[p];
        else return key;
    }
    return val || key;
}

export function getLang() {
    return currentLang || localStorage.getItem(LANG_KEY) || 'tr';
}

export function getAvailableLangs() {
    return AVAILABLE_LANGS;
}

export function getStrings() {
    return strings;
}

// Initialize with saved language or default.
// On first launch (no saved lang), load browser lang WITHOUT persisting —
// the picker must save only the user's explicit choice so hasSavedLanguage()
// stays false until they pick.
export async function initLanguage() {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && AVAILABLE_LANGS.includes(saved)) {
        return loadLanguage(saved, { persist: true });
    }
    const browserLang = navigator.language?.substring(0, 2);
    const lang = AVAILABLE_LANGS.includes(browserLang) ? browserLang : 'tr';
    return loadLanguage(lang, { persist: false });
}
