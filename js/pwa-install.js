// js/pwa-install.js
// iOS Safari "Add to Home Screen" banner.
// iOS has no beforeinstallprompt — we show a custom UI pointing at the
// Share button, and only on iOS Safari when the app is not already
// running in standalone mode.

import { t } from './i18n.js';

const DISMISS_KEY = 'okchu_ios_install_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_LEVELS_BEFORE_PROMPT = 2;

function isIosSafari() {
    const ua = navigator.userAgent || '';
    const isIos = /iPhone|iPad|iPod/.test(ua);
    // Exclude in-app browsers (FB/Instagram/Line), Chrome on iOS (CriOS),
    // Firefox (FxiOS), Edge (EdgiOS) — "Add to Home Screen" only works in Safari.
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line/.test(ua);
    return isIos && isSafari;
}

function isStandalone() {
    // iOS sets navigator.standalone; other platforms use display-mode.
    return window.navigator.standalone === true
        || window.matchMedia('(display-mode: standalone)').matches;
}

function dismissedRecently() {
    const at = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    return at && (Date.now() - at) < DISMISS_COOLDOWN_MS;
}

export function shouldShowIosInstall(completedLevelsCount) {
    if (!isIosSafari()) return false;
    if (isStandalone()) return false;
    if (dismissedRecently()) return false;
    if (completedLevelsCount < MIN_LEVELS_BEFORE_PROMPT) return false;
    return true;
}

export function showIosInstallBanner() {
    const banner = document.getElementById('ios-install-banner');
    if (!banner) return;

    // Populate translated copy at show-time so language changes after
    // init are reflected.
    const titleEl = banner.querySelector('[data-i18n="install.title"]');
    const bodyEl = banner.querySelector('[data-i18n="install.body"]');
    const shareEl = banner.querySelector('[data-i18n="install.step_share"]');
    const addEl = banner.querySelector('[data-i18n="install.step_add"]');
    if (titleEl) titleEl.textContent = t('install.title');
    if (bodyEl) bodyEl.textContent = t('install.body');
    if (shareEl) shareEl.textContent = t('install.step_share');
    if (addEl) addEl.textContent = t('install.step_add');

    banner.classList.remove('hidden');
    requestAnimationFrame(() => banner.classList.add('show'));

    const closeBtn = document.getElementById('btn-install-close');
    if (closeBtn) {
        const onClose = () => {
            banner.classList.remove('show');
            setTimeout(() => banner.classList.add('hidden'), 300);
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
            closeBtn.removeEventListener('click', onClose);
        };
        closeBtn.addEventListener('click', onClose);
    }
}

export function maybeShowIosInstall(completedLevelsCount) {
    if (shouldShowIosInstall(completedLevelsCount)) {
        showIosInstallBanner();
    }
}
