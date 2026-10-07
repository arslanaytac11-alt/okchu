// js/iap.js — In-App Purchase integration for Okchu.
// Uses cordova-plugin-purchase (CdvPurchase v13) under Capacitor iOS.
// Web/PWA: no-op so browser dev keeps working; the paywall shows a friendly alert.

import { storage } from './storage.js';
import { t } from './i18n.js?v=3';

const PRODUCT_ID = 'com.arslanaytac.okchu.premium';

let initialized = false;
let initInFlight = null;
let boundStore = null;
let initializationAttempted = false;
let nativeReadyRetryBound = false;
let operationInFlight = false;
let premiumInMemory = false;
let onOwnedCallback = null;
let notifiedCallback = null;
const finishing = new WeakSet();

function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function getStore() {
    if (!isNative()) return null;
    return window.CdvPurchase?.store || null;
}

export function isPremiumOwned() {
    // Retain the existing non-consumable entitlement while StoreKit is loading
    // or offline. Keep a session copy if browser storage cannot be written.
    try { return premiumInMemory || storage.isPremium(); } catch { return premiumInMemory; }
}

export function onPremiumOwned(cb) {
    onOwnedCallback = cb;
}

function notifyOwned() {
    if (!isPremiumOwned() || !onOwnedCallback || notifiedCallback === onOwnedCallback) return;
    notifiedCallback = onOwnedCallback;
    // UI refresh failure must not turn a delivered non-consumable into a
    // pending charge. Entitlement persistence happens before this callback.
    try { onOwnedCallback(); } catch {}
}

function productQuery() {
    return { id: PRODUCT_ID, platform: window.CdvPurchase.Platform.APPLE_APPSTORE };
}

function isDeliveredTransaction(transaction, allowFinished = true) {
    const { Platform, TransactionState } = window.CdvPurchase;
    return transaction?.platform === Platform.APPLE_APPSTORE &&
        (transaction.state === TransactionState.APPROVED || (allowFinished && transaction.state === TransactionState.FINISHED)) &&
        transaction.products?.some(product => product.id === PRODUCT_ID) &&
        !transaction.isPending && !transaction.isConsumed;
}

function currentReceiptOwned(store) {
    try {
        const query = productQuery();
        // The installed plugin's local ownership helper also finds initiated
        // transactions. Require its matching latest receipt to be approved or
        // finished before granting this specific App Store non-consumable.
        return store.owned(query) === true && isDeliveredTransaction(store.findInLocalReceipts(query));
    } catch { return false; }
}

function reconcileOwnership(store) {
    const owned = currentReceiptOwned(store);
    if (owned) {
        premiumInMemory = true;
        try { storage.setPremium(true); } catch {}
    }
    // Do not clear a previously saved Premium purchase just because receipts
    // are not available yet, or because the device is offline.
    notifyOwned();
    return owned;
}

async function finishApproved(store, transaction) {
    if (!isDeliveredTransaction(transaction, false) || finishing.has(transaction)) return;
    if (!reconcileOwnership(store)) return;
    finishing.add(transaction);
    try { await transaction.finish(); } catch {} finally { finishing.delete(transaction); }
}

function updatePrice(store) {
    const product = store.get(PRODUCT_ID, window.CdvPurchase.Platform.APPLE_APPSTORE);
    const priceString = product?.getOffer()?.pricingPhases?.[0]?.price;
    const priceEl = document.getElementById('premium-price');
    if (priceEl && priceString) priceEl.textContent = priceString;
}

function firstStoreError(result) {
    const values = Array.isArray(result) ? result : [result];
    return values.find(value => value && (value.isError === true || (value.code != null && typeof value.message === 'string')));
}

function bindStore(store) {
    if (boundStore === store) return;
    boundStore = store;
    initialized = false;
    initializationAttempted = false;
    const { ProductType, Platform, LogLevel } = window.CdvPurchase;
    store.verbosity = LogLevel.WARNING;
    store.register([{ id: PRODUCT_ID, type: ProductType.NON_CONSUMABLE, platform: Platform.APPLE_APPSTORE }]);
    store.when()
        .receiptUpdated(() => reconcileOwnership(store))
        .receiptsReady(() => reconcileOwnership(store))
        .approved(transaction => {
            // No remote validator is configured. CdvPurchase's no-validator
            // verified callback has an empty collection, so ownership comes
            // from the native local receipt instead of that dummy response.
            finishApproved(store, transaction);
        })
        .finished(() => reconcileOwnership(store))
        .productUpdated(() => {
            updatePrice(store);
            // A product retry can recover after an initial metadata error.
            if (store.isReady && store.get(PRODUCT_ID, Platform.APPLE_APPSTORE)?.getOffer()) initialized = true;
        });
    // Plugin errors contain transaction/receipt data. User initiated actions
    // handle returned errors below, without writing store payloads to logs.
    store.error(() => {});
}

export async function initIAP() {
    if (initialized) return true;
    if (initInFlight) return initInFlight;
    initInFlight = (async () => {
        // The caller wires its UI before any entitlement notification runs.
        await Promise.resolve();
        notifyOwned();
        const store = getStore();
        if (!store) {
            // Cordova creates CdvPurchase asynchronously. Its sticky ready
            // event also handles the case where the module loaded first.
            if (isNative() && !nativeReadyRetryBound) {
                nativeReadyRetryBound = true;
                document.addEventListener('deviceready', () => { initIAP(); }, { once:true });
            }
            return false;
        }
        bindStore(store);
        if (initializationAttempted) return initialized;
        initializationAttempted = true;
        const result = await store.initialize([window.CdvPurchase.Platform.APPLE_APPSTORE]);
        initialized = !firstStoreError(result);
        updatePrice(store);
        reconcileOwnership(store);
        return initialized;
    })().catch(() => false).finally(() => { initInFlight = null; });
    return initInFlight;
}

// Translated alert with fallback so users in any of the 5 supported locales
// see their own language instead of hardcoded English.
function localizedAlert(key, fallback) {
    const text = t(key);
    alert(text === key ? fallback : text);
}

export async function buyPremium() {
    if (!isNative()) {
        localizedAlert('iap.web_only_buy', 'Purchases are only available on the App Store build.');
        return { ok:false, reason:'web' };
    }
    if (operationInFlight) return { ok:false, reason:'busy' };
    operationInFlight = true;
    try {
        if (!await initIAP()) return operationError();
        const store = getStore();
        reconcileOwnership(store);
        if (isPremiumOwned()) return { ok:true, owned:true };
        const product = store.get(PRODUCT_ID, window.CdvPurchase.Platform.APPLE_APPSTORE);
        if (!product) {
            localizedAlert('iap.product_unavailable', 'Product unavailable. Please try again later.');
            return { ok:false, reason:'unavailable' };
        }
        const offer = product.getOffer();
        if (!offer) {
            localizedAlert('iap.offer_unavailable', 'Offer unavailable. Please try again later.');
            return { ok:false, reason:'unavailable' };
        }
        const error = firstStoreError(await store.order(offer));
        if (error) return operationError(error);
        // Ordering alone never grants ownership; receipt events do that.
        return { ok:true, owned:isPremiumOwned() };
    } catch { return operationError(); } finally { operationInFlight = false; }
}

export async function restorePurchases() {
    if (!isNative()) {
        localizedAlert('iap.web_only_restore', 'Restore is only available on the App Store build.');
        return { ok:false, reason:'web' };
    }
    if (operationInFlight) return { ok:false, reason:'busy' };
    operationInFlight = true;
    try {
        if (!await initIAP()) return operationError();
        const store = getStore();
        const error = firstStoreError(await store.restorePurchases());
        if (error) return operationError(error);
        reconcileOwnership(store);
        return { ok:true, owned:isPremiumOwned() };
    } catch { return operationError(); } finally { operationInFlight = false; }
}

function operationError(error) {
    if (error?.code != null && error.code === window.CdvPurchase?.ErrorCode?.PAYMENT_CANCELLED) return { ok:false, reason:'cancelled' };
    localizedAlert('iap.product_unavailable', 'Product unavailable. Please try again later.');
    return { ok:false, reason:'failed' };
}
