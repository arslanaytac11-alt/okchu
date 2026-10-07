// Optional native review requests use Apple's system API. StoreKit controls
// whether a prompt appears and does not expose a customer's rating to us.
// Manual App Store links remain available independently in Settings.

const STATE_KEY = 'okchu_rate_state';
const MIN_COMPLETED_LEVELS = 5;
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_PROMPTS = 3;
let requestInFlight = false;

function getState() {
    try {
        const state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
        return state && typeof state === 'object' && !Array.isArray(state) ? state : {};
    } catch { return {}; }
}

function setState(patch) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify({...getState(), ...patch})); }
    catch { /* Optional review bookkeeping must never interrupt play. */ }
}

function isNative() {
    return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
}

function canRequestReview() {
    const state = getState();
    if (state.done || (state.prompts || 0) >= MAX_PROMPTS) return false;
    if (state.lastPromptAt && Date.now() - state.lastPromptAt < COOLDOWN_MS) return false;
    return true;
}

export function shouldShowRatePrompt(playerStats = {}) {
    if (!isNative() || requestInFlight || !canRequestReview()) return false;
    // Eligibility depends on time spent playing, regardless of success stars.
    return (playerStats.totalCleared || 0) >= MIN_COMPLETED_LEVELS;
}

export async function showRatePrompt() {
    if (!isNative() || requestInFlight || !canRequestReview()) return;
    requestInFlight = true;
    try {
        const capacitor = window.Capacitor;
        const appReview = capacitor.Plugins?.AppReview || capacitor.registerPlugin?.('AppReview');
        if (!appReview?.requestReview) return;
        await appReview.requestReview();
        setState({prompts:(getState().prompts || 0) + 1,lastPromptAt:Date.now()});
    } catch { /* Store review is optional; no custom prompt fallback. */ }
    finally { requestInFlight = false; }
}
