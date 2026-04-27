// js/rate-us.js
// Rate-us funnel: 5-star modal. 4-5 stars → App Store review composer.
// 1-3 stars → feedback email, keeping low ratings away from the store.

import { t } from './i18n.js';

// `?action=write-review` sends the user straight to the rating composer in the
// App Store app on iOS, instead of just opening the listing page — higher
// conversion. The numeric ID is the published Okchu app on App Store Connect.
const APP_STORE_URL = 'https://apps.apple.com/app/id6762461650?action=write-review';
const FEEDBACK_EMAIL = 'arslan.aytac11@gmail.com';

const STATE_KEY = 'okchu_rate_state';
const MIN_3STAR_LEVELS = 5;
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const MAX_PROMPTS = 3;

function getState() {
    try {
        return JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
    } catch {
        return {};
    }
}

function setState(patch) {
    const next = { ...getState(), ...patch };
    localStorage.setItem(STATE_KEY, JSON.stringify(next));
}

export function shouldShowRatePrompt(playerStats) {
    const s = getState();
    if (s.done) return false;                       // already rated 4-5★
    if ((s.prompts || 0) >= MAX_PROMPTS) return false;
    if (s.lastPromptAt && Date.now() - s.lastPromptAt < COOLDOWN_MS) return false;
    return (playerStats.perfectLevels || 0) >= MIN_3STAR_LEVELS;
}

export function showRatePrompt() {
    const overlay = document.getElementById('overlay-rate');
    if (!overlay) return;

    // Populate translated copy.
    overlay.querySelector('[data-i18n="rate.title"]').textContent = t('rate.title');
    overlay.querySelector('[data-i18n="rate.subtitle"]').textContent = t('rate.subtitle');
    overlay.querySelector('[data-i18n="rate.later"]').textContent = t('rate.later');

    const starsEl = document.getElementById('rate-stars');
    starsEl.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('button');
        star.className = 'rate-star';
        star.textContent = '\u2606';
        star.setAttribute('aria-label', `${i} star`);
        star.addEventListener('mouseenter', () => paintStars(starsEl, i));
        star.addEventListener('focus', () => paintStars(starsEl, i));
        star.addEventListener('click', () => handleRating(i, overlay));
        starsEl.appendChild(star);
    }
    paintStars(starsEl, 0);

    // Haptic on iOS if available
    if (navigator.vibrate) navigator.vibrate(10);

    overlay.classList.remove('hidden');

    const laterBtn = document.getElementById('btn-rate-later');
    const onLater = () => {
        overlay.classList.add('hidden');
        setState({
            prompts: (getState().prompts || 0) + 1,
            lastPromptAt: Date.now(),
        });
        laterBtn.removeEventListener('click', onLater);
    };
    laterBtn.addEventListener('click', onLater);
}

function paintStars(container, count) {
    const stars = container.querySelectorAll('.rate-star');
    stars.forEach((s, i) => {
        const filled = i < count;
        s.textContent = filled ? '\u2605' : '\u2606';
        s.classList.toggle('filled', filled);
    });
}

function handleRating(rating, overlay) {
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);

    setState({
        prompts: (getState().prompts || 0) + 1,
        lastPromptAt: Date.now(),
        lastRating: rating,
    });

    if (rating >= 4) {
        // High ratings: send to store. Mark done so we never prompt again.
        setState({ done: true });
        overlay.classList.add('hidden');
        window.open(APP_STORE_URL, '_blank');
    } else {
        // Low ratings: capture feedback privately via email instead of store.
        overlay.classList.add('hidden');
        const subject = encodeURIComponent(`Okchu feedback (${rating}\u2605)`);
        const body = encodeURIComponent(t('rate.email_body') || '');
        window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    }
}
