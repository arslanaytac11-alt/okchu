import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Use the installed CdvPurchase receipt/transaction classes, callback registry,
// latest-receipt lookup and owned() implementation. Only native StoreKit I/O is
// mocked: no real checkout, sandbox account, payment or restore takes place.
// Store constructors start an expiry monitor, and receipt readiness starts
// another monitor with no public disposal hook. Track only timers created by
// this isolated plugin VM, preserving real timing and callback behavior.
const pluginIntervals = new Set();
const stores = [];
const sandbox = {
    window:{}, document:{addEventListener(){}},
    console:{log(){},warn(){},error(){},info(){},debug(){}},
    setTimeout, clearTimeout,
    setInterval(callback,delay,...args) {
        const handle = setInterval(callback,delay,...args);
        pluginIntervals.add(handle);
        return handle;
    },
    clearInterval(handle) {
        clearInterval(handle);
        pluginIntervals.delete(handle);
    },
};
let summary;
try {
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('node_modules/cordova-plugin-purchase/www/store.js','utf8'),sandbox);
const Purchase = sandbox.CdvPurchase;
stores.push(sandbox.window.CdvPurchase.store);
const ID = 'com.arslanaytac.okchu.premium';
const PLATFORM = Purchase.Platform.APPLE_APPSTORE;
const flush = () => new Promise(resolve => setTimeout(resolve,10));
let cases = 0;

async function fixture({saved=false,initializeResult=[],initializeWait=null,native=true,plugin=true} = {}) {
    const memory = new Map();
    if (saved) memory.set('ok_bulmacasi_save',JSON.stringify({premium:true,completedLevels:['egypt_1']}));
    globalThis.localStorage = {getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
    const alerts = [], readyEvents = new Map(), price = {textContent:'—'};
    globalThis.alert = message => alerts.push(message);
    globalThis.document = {getElementById:id=>id === 'premium-price' ? price : null,addEventListener:(name,cb)=>readyEvents.set(name,cb)};
    const store = new Purchase.Store();
    stores.push(store);
    const adapter = {receipts:[]};
    store.adapters.list = [adapter];
    const calls = {init:0,orders:0,restores:0,finish:0,ownedNotifications:0};
    const offer = {productId:ID,platform:PLATFORM,pricingPhases:[{price:'₺49,99'}]};
    let product = {id:ID,platform:PLATFORM,getOffer:()=>offer};
    store.get = (id,platform) => id === ID && platform === PLATFORM ? product : undefined;
    store.initialize = async () => {
        calls.init++;
        if (initializeWait) await initializeWait;
        store._readyCallbacks.trigger('mock_native_ready');
        return initializeResult;
    };
    store.order = async received => {assert.equal(received,offer);calls.orders++;};
    store.restorePurchases = async () => {calls.restores++;};
    globalThis.window = {Capacitor:{isNativePlatform:()=>native},CdvPurchase:plugin ? {...Purchase,store} : undefined};
    const iap = await import(`../js/iap.js?iap_case=${cases++}`);
    iap.onPremiumOwned(()=>calls.ownedNotifications++);
    function transaction({state=Purchase.TransactionState.APPROVED,id=ID,platform=PLATFORM,consumed=false,pending=false,finishThrow=false,inspectFinish=()=>{},purchaseDate=undefined} = {}) {
        const receipt = new Purchase.Receipt(platform,{verify(){},finish(){}});
        const tx = new Purchase.Transaction(platform,receipt,{verify(){throw new Error('No remote validator should be called');},finish:async()=>{
            calls.finish++;
            inspectFinish();
            if (finishThrow) throw new Error('Native finish unavailable');
            tx.state = Purchase.TransactionState.FINISHED;
        }});
        tx.transactionId = `mock-${cases}-${adapter.receipts.length}`;
        tx.state = state;
        tx.products = [{id}];
        tx.isConsumed = consumed;
        tx.isPending = pending;
        if (purchaseDate) tx.purchaseDate = purchaseDate;
        receipt.transactions.push(tx);
        adapter.receipts.push(receipt);
        return {receipt,tx};
    }
    const event = (name,value) => {
        const containers = {approved:'approvedCallbacks',finished:'finishedCallbacks',receiptUpdated:'updatedReceiptsCallbacks',receiptsReady:'receiptsReadyCallbacks',verified:'verifiedCallbacks',productUpdated:'updatedCallbacks'};
        store[containers[name]].trigger(value,`mock_${name}`);
    };
    return {iap,store,adapter,memory,alerts,calls,offer,price,readyEvents,event,transaction,setProduct:value=>{product=value;}};
}

// Regression: no-validator verification creates an empty collection even for
// an approved native transaction. The old nested collection/products read
// could finish this payment without granting the Premium entitlement.
{
    const f = await fixture();
    await f.iap.initIAP();
    const {receipt,tx} = f.transaction();
    const dummy = new Purchase.VerifiedReceipt(receipt,{id:'mock',latest_receipt:true,transaction:{type:'test'}},{finish(){throw new Error('Do not finish a dummy verified receipt');}});
    assert.equal(dummy.collection.length,0);
    f.event('verified',dummy);await flush();
    assert.equal(f.iap.isPremiumOwned(),false);
    f.event('approved',tx);await flush();
    assert.equal(f.iap.isPremiumOwned(),true);
    assert.equal(JSON.parse(f.memory.get('ok_bulmacasi_save')).premium,true);
    assert.equal(f.calls.finish,1);assert.equal(f.calls.ownedNotifications,1);
    f.event('receiptUpdated',receipt);f.event('receiptsReady');f.event('finished',tx);await flush();
    assert.equal(f.calls.ownedNotifications,1);
}

// Receipts can already be finished when loaded at startup or after restoring.
{
    const f = await fixture();
    const {receipt} = f.transaction({state:Purchase.TransactionState.FINISHED});
    await f.iap.initIAP();
    f.event('receiptsReady');f.event('receiptUpdated',receipt);await flush();
    assert.equal(f.iap.isPremiumOwned(),true);assert.equal(f.calls.ownedNotifications,1);
    assert.equal(f.calls.finish,0);assert.equal(f.price.textContent,'₺49,99');
    await f.iap.buyPremium();assert.equal(f.calls.orders,0);
}

// Reject non-delivered, consumed, pending, foreign-platform and other-product
// transactions, even where the installed local owned() helper returns true.
for (const options of [
    {state:Purchase.TransactionState.INITIATED},
    {state:Purchase.TransactionState.PENDING},
    {state:Purchase.TransactionState.CANCELLED},
    {state:Purchase.TransactionState.UNKNOWN_STATE},
    {consumed:true}, {pending:true}, {id:'unregistered.product'},
    {platform:Purchase.Platform.TEST},
]) {
    const f = await fixture();await f.iap.initIAP();
    const {receipt,tx} = f.transaction(options);
    f.event('receiptUpdated',receipt);f.event('receiptsReady');f.event('approved',tx);await flush();
    assert.equal(f.iap.isPremiumOwned(),false);assert.equal(f.calls.finish,0);assert.equal(f.calls.ownedNotifications,0);
}

// Receipt updates, not an order promise resolving, confer ownership.
{
    const f = await fixture();
    const result = await f.iap.buyPremium();
    assert.equal(result.ok,true);assert.equal(result.owned,false);assert.equal(f.iap.isPremiumOwned(),false);
    const {receipt} = f.transaction();f.event('receiptUpdated',receipt);await flush();
    assert.equal(f.iap.isPremiumOwned(),true);assert.equal(f.calls.ownedNotifications,1);
}

// Existing saved Premium data stays owned while receipts are absent/offline.
{
    const f = await fixture({saved:true,initializeResult:[{isError:true,code:1,message:'Store unavailable'}]});
    assert.equal(await f.iap.initIAP(),false);
    assert.equal(f.iap.isPremiumOwned(),true);assert.equal(f.calls.ownedNotifications,1);
    assert.deepEqual(JSON.parse(f.memory.get('ok_bulmacasi_save')).completedLevels,['egypt_1']);
    f.event('receiptsReady');await flush();assert.equal(f.iap.isPremiumOwned(),true);
}

// Buy and restore await one shared initialization; a double tap cannot submit
// duplicate orders while the native store/checkout promise remains pending.
{
    let release;const gate = new Promise(resolve=>release=resolve);
    const f = await fixture({initializeWait:gate});
    const first = f.iap.buyPremium();
    const duplicate = await f.iap.buyPremium();
    await Promise.resolve();
    assert.equal(duplicate.reason,'busy');assert.equal(f.calls.orders,0);
    assert.equal(f.calls.init,1);release();await first;assert.equal(f.calls.orders,1);
}
{
    let release;const gate = new Promise(resolve=>release=resolve);
    const f = await fixture({initializeWait:gate});
    const result = f.iap.restorePurchases();await Promise.resolve();
    assert.equal(f.calls.restores,0);release();await result;assert.equal(f.calls.restores,1);
}

for (const operation of ['buyPremium','restorePurchases']) {
    const f = await fixture({initializeResult:[{isError:true,code:100,message:'Sensitive native payload'}]});
    const result = await f.iap[operation]();
    assert.equal(result.ok,false);assert.equal(f.calls.orders+f.calls.restores,0);
    assert.equal(f.alerts.length,1);assert.ok(!f.alerts[0].includes('Sensitive'));
}

// The installed plugin resolves errors; it does not always reject promises.
for (const operation of ['buyPremium','restorePurchases']) {
    for (const throws of [false,true]) {
        const f = await fixture();await f.iap.initIAP();
        const method = operation === 'buyPremium' ? 'order' : 'restorePurchases';
        f.store[method] = async () => {
            if (throws) throw new Error('Private account detail');
            return {isError:true,code:999,message:'Private receipt detail'};
        };
        const result = await f.iap[operation]();
        assert.equal(result.ok,false);assert.equal(f.alerts.length,1);
        assert.ok(!f.alerts[0].includes('Private'));assert.equal(f.iap.isPremiumOwned(),false);
    }
}
{
    const f = await fixture();await f.iap.initIAP();
    f.store.order = async () => ({isError:true,code:Purchase.ErrorCode.PAYMENT_CANCELLED,message:'Cancelled'});
    assert.equal((await f.iap.buyPremium()).reason,'cancelled');assert.equal(f.alerts.length,0);
}
{
    const f = await fixture();await f.iap.initIAP();
    f.store.order = async () => ({isError:true});
    assert.equal((await f.iap.buyPremium()).reason,'failed');assert.equal(f.alerts.length,1);
}
{
    const f = await fixture();await f.iap.initIAP();
    f.store.restorePurchases = async () => {
        f.transaction({state:Purchase.TransactionState.FINISHED});
    };
    assert.deepEqual(await f.iap.restorePurchases(),{ok:true,owned:true});
    assert.equal(f.calls.ownedNotifications,1);assert.equal(f.calls.finish,0);
}

// Native finishing errors never revoke a delivered entitlement, and finish is
// attempted only after the approved product has been saved and notified.
{
    const f = await fixture();await f.iap.initIAP();
    let deliveredBeforeFinish;
    const {tx} = f.transaction({finishThrow:true,inspectFinish:()=>{
        deliveredBeforeFinish = JSON.parse(f.memory.get('ok_bulmacasi_save')).premium === true && f.calls.ownedNotifications === 1;
    }});f.event('approved',tx);await flush();
    assert.equal(f.iap.isPremiumOwned(),true);assert.equal(f.calls.finish,1);
    assert.equal(deliveredBeforeFinish,true);
    assert.equal(f.calls.ownedNotifications,1);assert.equal(f.alerts.length,0);
}

// A flat verified collection or unrelated data cannot grant without the
// authoritative native local approved/finished receipt for this product.
{
    const f = await fixture();await f.iap.initIAP();
    const receipt = new Purchase.Receipt(PLATFORM,{verify(){},finish(){}});
    const verified = new Purchase.VerifiedReceipt(receipt,{id:'mock',collection:[{id:ID}],transaction:{type:'test'}},{finish(){throw new Error('Unowned verification must not be finished');}});
    f.event('verified',verified);await flush();
    assert.equal(f.iap.isPremiumOwned(),false);assert.equal(f.calls.finish,0);
}
{
    const f = await fixture();await f.iap.initIAP();
    const {receipt,tx} = f.transaction();tx.expirationDate = new Date(Date.now()-1000);
    f.event('approved',tx);f.event('receiptUpdated',receipt);await flush();
    assert.equal(f.iap.isPremiumOwned(),false);assert.equal(f.calls.finish,0);
}
{
    const f = await fixture();
    await Promise.all([f.iap.initIAP(),f.iap.initIAP(),f.iap.initIAP()]);
    await f.iap.initIAP();
    assert.equal(f.calls.init,1);
    const {tx} = f.transaction();f.event('approved',tx);await flush();
    assert.equal(f.calls.finish,1);assert.equal(f.calls.ownedNotifications,1);
}
for (const missing of ['product','offer']) {
    const f = await fixture();
    f.setProduct(missing === 'product' ? null : {getOffer:()=>null});
    assert.equal((await f.iap.buyPremium()).reason,'unavailable');
    assert.equal(f.calls.orders,0);assert.equal(f.alerts.length,1);
}
{
    const f = await fixture({initializeResult:[{isError:true,code:1,message:'Metadata pending'}]});
    f.setProduct(null);assert.equal(await f.iap.initIAP(),false);
    f.setProduct({getOffer:()=>f.offer});f.event('productUpdated');await flush();
    assert.equal(f.price.textContent,'₺49,99');
    assert.equal((await f.iap.buyPremium()).ok,true);assert.equal(f.calls.orders,1);assert.equal(f.calls.init,1);
}
{
    const f = await fixture();await f.iap.initIAP();
    localStorage.setItem = () => {throw new Error('Storage unavailable');};
    const {tx} = f.transaction();f.event('approved',tx);await flush();
    assert.equal(f.iap.isPremiumOwned(),true);assert.equal(f.calls.ownedNotifications,1);assert.equal(f.calls.finish,1);
}

// Cordova may expose the store after main.js has run. Its sticky deviceready
// event retries initialization, rather than leaving purchase buttons dead.
{
    const f = await fixture({plugin:false});
    assert.equal(await f.iap.initIAP(),false);
    window.CdvPurchase = {...Purchase,store:f.store};
    f.readyEvents.get('deviceready')();await flush();
    assert.equal(f.calls.init,1);assert.equal(await f.iap.initIAP(),true);
}
{
    const f = await fixture({native:false});
    await f.iap.buyPremium();await f.iap.restorePurchases();
    assert.equal(f.calls.init+f.calls.orders+f.calls.restores,0);assert.equal(f.alerts.length,2);
}
summary = {cases,installedReceiptClasses:true,installedOwnershipSemantics:true,scope:'Mocked native StoreKit I/O; sandbox purchase/restore and device upgrade remain unverified'};
} finally {
    // Use the installed monitor's own stop API first. Receipt monitors have
    // no exposed stop/dispose method, so clear their remaining VM-owned
    // intervals explicitly. Cleanup runs on failures too; no forced exit.
    for (const store of stores) store.expiryMonitor.stop();
    for (const handle of pluginIntervals) sandbox.clearInterval(handle);
}
assert.equal(pluginIntervals.size,0);
console.log(JSON.stringify({...summary,pluginIntervalsDisposed:true},null,2));
