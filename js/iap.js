// js/iap.js — In-App Purchase integration for Okchu.
// Uses cordova-plugin-purchase (CdvPurchase v13) under Capacitor iOS.
// Web/PWA: no-op so browser dev keeps working; the paywall shows a friendly alert.

import { storage } from './storage.js';
import { t } from './i18n.js';

const PRODUCT_ID = 'com.arslanaytac.okchu.premium';

let initialized = false;
let onOwnedCallback = null;

function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function getStore() {
    if (!isNative()) return null;
    return window.CdvPurchase?.store || null;
}

export function isPremiumOwned() {
    return storage.isPremium();
}

export function onPremiumOwned(cb) {
    onOwnedCallback = cb;
}

export async function initIAP() {
    if (initialized) return;
    const store = getStore();
    if (!store) return; // web dev

    try {
        const { ProductType, Platform, LogLevel } = window.CdvPurchase;

        store.verbosity = LogLevel.WARNING;

        store.register([{
            id: PRODUCT_ID,
            type: ProductType.NON_CONSUMABLE,
            platform: Platform.APPLE_APPSTORE,
        }]);

        store.when()
            .approved(transaction => transaction.verify())
            .verified(receipt => {
                const owned = receipt.collection?.some(t => t.products?.some(p => p.id === PRODUCT_ID));
                if (owned) {
                    storage.setPremium(true);
                    if (onOwnedCallback) onOwnedCallback();
                }
                receipt.finish();
            });

        store.error(err => console.warn('[iap] error', err));

        await store.initialize([Platform.APPLE_APPSTORE]);

        // Price label — update DOM if element present so the paywall shows the
        // localized App Store price instead of the hardcoded Turkish Lira label.
        const product = store.get(PRODUCT_ID, Platform.APPLE_APPSTORE);
        const priceEl = document.getElementById('premium-price');
        if (priceEl && product) {
            const offer = product.getOffer();
            const priceString = offer?.pricingPhases?.[0]?.price;
            if (priceString) priceEl.textContent = priceString;
        }

        initialized = true;
    } catch (e) {
        console.warn('[iap] init failed', e);
    }
}

// Translated alert with fallback so users in any of the 5 supported locales
// see their own language instead of hardcoded English.
function localizedAlert(key, fallback) {
    const text = t(key);
    alert(text === key ? fallback : text);
}

export async function buyPremium() {
    const store = getStore();
    if (!store) {
        localizedAlert('iap.web_only_buy', 'Purchases are only available on the App Store build.');
        return;
    }
    try {
        const product = store.get(PRODUCT_ID, window.CdvPurchase.Platform.APPLE_APPSTORE);
        if (!product) {
            localizedAlert('iap.product_unavailable', 'Product unavailable. Please try again later.');
            return;
        }
        const offer = product.getOffer();
        if (!offer) {
            localizedAlert('iap.offer_unavailable', 'Offer unavailable. Please try again later.');
            return;
        }
        await store.order(offer);
    } catch (e) {
        console.warn('[iap] buy failed', e);
    }
}

export async function restorePurchases() {
    const store = getStore();
    if (!store) {
        localizedAlert('iap.web_only_restore', 'Restore is only available on the App Store build.');
        return;
    }
    try {
        await store.restorePurchases();
    } catch (e) {
        console.warn('[iap] restore failed', e);
    }
}
