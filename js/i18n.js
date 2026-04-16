// js/i18n.js
// Internationalization system

const LANG_KEY = 'ok_bulmacasi_lang';
const AVAILABLE_LANGS = ['tr', 'en', 'es', 'fr', 'ja'];

let currentLang = null;
let strings = {};

export async function loadLanguage(lang) {
    if (!AVAILABLE_LANGS.includes(lang)) lang = 'tr';
    try {
        const resp = await fetch(`lang/${lang}.json`);
        strings = await resp.json();
        currentLang = lang;
        localStorage.setItem(LANG_KEY, lang);
        document.documentElement.lang = lang;
        return strings;
    } catch (e) {
        console.warn('Failed to load language:', lang, e);
        return strings;
    }
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

// Initialize with saved language or default
export async function initLanguage() {
    const saved = localStorage.getItem(LANG_KEY);
    const browserLang = navigator.language?.substring(0, 2);
    const lang = saved || (AVAILABLE_LANGS.includes(browserLang) ? browserLang : 'tr');
    return loadLanguage(lang);
}
