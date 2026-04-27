// js/main.js

import { Game } from './game.js?v=2';
import { ScreenManager } from './screens.js?v=3';
import { chapters } from './data/chapters.js';
import { storage } from './storage.js';
import { Tutorial } from './tutorial.js';
import { initLanguage, loadLanguage, t, getLang, hasSavedLanguage } from './i18n.js';
import { getDailyChallenge, isDailyCompleted, completeDaily, getDailyStreak } from './daily.js';
import { checkAchievements, getAllAchievements, getAchievementStats } from './achievements.js';
import { allLevels } from './levels.js';
import { maybeShowIosInstall } from './pwa-install.js';
import { shouldShowRatePrompt, showRatePrompt } from './rate-us.js';
import { initAds, showBanner, hideBanner, noteLevelCompleted, maybeShowInterstitial, showRewarded } from './ads.js';
import { initIAP, buyPremium, restorePurchases, onPremiumOwned, isPremiumOwned } from './iap.js';
import { notifySuccess, tapLight } from './haptics.js';

// Fire-and-forget AdMob init. Safe on web (no-op) and iOS (native plugin).
// CRITICAL: location.hostname is "localhost" inside the Capacitor iOS shell
// (because the WKWebView serves files from okchu://localhost/...) — so the
// previous `hostname === 'localhost'` heuristic was treating PRODUCTION iOS
// as test mode and serving Google test ads instead of real ones (zero
// revenue + AdMob risk). Detect the native platform first; only fall back
// to test mode in real browser dev (localhost / file:// / http://).
const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const isWebDev = !isNativeApp && (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:' ||
    location.protocol === 'http:'
);
initAds({ testMode: isWebDev });

// Silence non-critical console output in production. Keeps the iOS device-log
// clean during App Review (Apple looks at it) and prevents accidental data
// leakage if any future log statement includes user state. console.error is
// preserved so genuine crashes still surface to anyone debugging via Safari
// remote inspector.
if (isNativeApp || (!isWebDev && location.protocol === 'https:')) {
    const noop = () => {};
    console.log = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
}

// IAP init — loads the Premium product from App Store and updates price label.
// Also wires the entitlement callback: on successful purchase/restore we hide
// the active banner immediately so the user sees the ad removal instantly.
onPremiumOwned(() => {
    hideBanner();
    const overlay = document.getElementById('overlay-premium');
    if (overlay) overlay.classList.add('hidden');
    // The main-menu "Remove Ads" CTA has no purpose once the purchase
    // succeeded; hide it so the menu doesn't keep advertising what's owned.
    const cta = document.getElementById('btn-remove-ads');
    if (cta) cta.classList.add('hidden');
});
initIAP();

// Dark mode
if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
document.getElementById('btn-dark-mode').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    // Re-apply theme to canvas if in game
    if (game.currentChapter) {
        game.renderer.setTheme(game.currentChapter.theme, game.currentChapter.id);
        if (game.grid) game.renderer.drawGrid(game.grid);
    }
});

// Language system. Applies translations to:
//  - data-i18n="key"        -> element.textContent
//  - data-i18n-aria="key"   -> aria-label attribute (VoiceOver, screen readers)
//  - data-i18n-title="key"  -> title attribute (long-press tooltips)
//  - data-i18n-placeholder  -> placeholder attribute (input fields)
// Without the *-aria / *-title hooks, decorative TR text leaks into VoiceOver
// for non-TR users on iOS.
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val && val !== key) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        const val = t(key);
        if (val && val !== key) el.setAttribute('aria-label', val);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const val = t(key);
        if (val && val !== key) el.setAttribute('title', val);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = t(key);
        if (val && val !== key) el.setAttribute('placeholder', val);
    });
    // Update language button text
    const langBtn = document.getElementById('btn-language');
    if (langBtn) langBtn.textContent = getLang().toUpperCase();
}

initLanguage().then(() => applyTranslations());

// Language picker
document.getElementById('btn-language').addEventListener('click', () => {
    const overlay = document.getElementById('overlay-language');
    overlay.classList.remove('hidden');
    // Mark active language
    overlay.querySelectorAll('.lang-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === getLang());
    });
});

// One-shot callback fired after the user picks a language.
// Used by the first-launch flow to chain into the tutorial.
let postLangPickCallback = null;

document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', async () => {
        await loadLanguage(btn.dataset.lang);
        applyTranslations();
        const overlay = document.getElementById('overlay-language');
        overlay.classList.add('hidden');
        overlay.classList.remove('first-launch');
        // Refresh chapters if visible
        if (document.getElementById('screen-chapters').classList.contains('active')) {
            screenManager.showChapters();
        }
        if (postLangPickCallback) {
            const cb = postLangPickCallback;
            postLangPickCallback = null;
            cb();
        }
    });
});

// Splash screen -> app transition
setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');
    splash.classList.add('fade-out');
    app.classList.remove('app-hidden');
    app.classList.add('app-visible');
    setTimeout(() => splash.remove(), 600);

    // First-launch onboarding flow: language picker → tutorial.
    // hasSavedLanguage() returns false only until the user explicitly picks
    // a language via the overlay (initLanguage no longer persists browser lang).
    if (!hasSavedLanguage()) {
        showFirstLaunchLanguagePicker();
    }
}, 2300);

function showFirstLaunchLanguagePicker() {
    const overlay = document.getElementById('overlay-language');
    overlay.classList.remove('hidden');
    overlay.classList.add('first-launch');
    overlay.querySelectorAll('.lang-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === getLang());
    });
    postLangPickCallback = () => {
        // After language chosen, immediately run the onboarding tutorial
        // so the rules are taught in the picked language.
        if (tutorial.shouldShow()) tutorial.show(() => {});
    };
}

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
const screenManager = new ScreenManager();

// Back-from-game routing — daily challenges are launched straight from the
// main menu, so hitting Back on a daily puzzle must return to the menu.
// Normal levels still bounce back to the level select list.
screenManager.getGameBackTarget = () => {
    if (game._isDailyChallenge) {
        game._isDailyChallenge = false;
        game._dailyModifier = null;
        game._stopTimer?.();
        const badge = document.getElementById('daily-modifier-badge');
        if (badge) { badge.classList.add('hidden'); badge.textContent = ''; }
        return 'menu';
    }
    return 'levels';
};

// Undo button — uses a single listener; the button is only interactable when game is active.
const undoBtn = document.getElementById('btn-undo');
if (undoBtn) {
    undoBtn.addEventListener('click', () => {
        game.undoLastMove();
    });
}

const hintPowerBtn = document.getElementById('btn-powerup-hint');
if (hintPowerBtn) {
    hintPowerBtn.addEventListener('click', () => {
        game.useHint();
    });
}

const freezePowerBtn = document.getElementById('btn-powerup-freeze');
if (freezePowerBtn) {
    freezePowerBtn.addEventListener('click', () => {
        game.useFreezePowerup();
    });
}
// Dev-only console shortcut. Skip on the iOS Capacitor shell (capacitor:// scheme)
// and on the live PWA — both are "production". Only expose on localhost / file://
// where it actually helps debugging.
if (typeof window !== 'undefined') {
    const host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '') {
        window.__DEBUG__ = { game, screenManager, chapters, storage };
    }
}
const livesDisplay = document.getElementById('lives-display');
const tutorial = new Tutorial();

let noLivesTimerInterval = null;

// Render initial lives
game.livesManager.renderLives(livesDisplay);

// When the app comes back from background (iOS suspends WKWebView, freezes
// setInterval timers and RAF), the lives counter on screen and the no-lives
// overlay countdown can show a stale value compared to storage (which uses
// real Date.now() math, not interval ticks). Re-render on visibility change
// so users see the correct life count + remaining time the instant they
// return from the home screen / multitasker.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    try {
        game.livesManager.renderLives(livesDisplay);
        // If the no-lives overlay is open, force its timer text to refresh.
        const noLivesOverlay = document.getElementById('overlay-no-lives');
        if (noLivesOverlay && !noLivesOverlay.classList.contains('hidden')) {
            const ms = storage.getTimeUntilNextLife();
            const timerText = document.getElementById('lives-timer-text');
            if (timerText) {
                if (ms <= 0) {
                    timerText.textContent = (() => { const v = t('overlay.new_life_ready'); return v === 'overlay.new_life_ready' ? 'Yeni can hazır!' : v; })();
                } else {
                    const label = (() => { const v = t('overlay.new_life_in'); return v === 'overlay.new_life_in' ? 'Yeni can' : v; })();
                    timerText.textContent = label + ': ' + game.livesManager.formatTime(ms);
                }
            }
            // If lives auto-regenerated to >=1 while in background, close the
            // overlay so the user can play immediately.
            if (game.livesManager.getCurrentLives() > 0) {
                noLivesOverlay.classList.add('hidden');
            }
        }
    } catch {}
});

// Activate the in-game onboarding pointer for the player's very first
// session. We light up the next removable arrow with a pulsing 👆 emoji
// for the first 3 correct taps on Egypt level 1, then it auto-dismisses
// permanently (flag persisted to localStorage). The tutorial overlay
// teaches the concept; the in-game pointer locks it in by guiding the
// hand through actual taps. Style cribbed from Royal Match / Arrows
// Puzzle, which use the same "show me where to tap" technique to lower
// onboarding drop-off.
function maybeActivateOnboarding(levelData, chapterData) {
    try {
        if (localStorage.getItem('okchu_onboarding_done') === '1') return;
        if (chapterData?.id !== 1 || levelData?.id !== 1) return;
        game.onboardingActive = true;
        game.onboardingTapsLeft = 3;
    } catch {}
}

// When a level is selected from the menu
screenManager.onStartLevel = (levelData, chapterData) => {
    if (!game.livesManager.hasLives()) {
        showNoLivesOverlay();
        return;
    }

    // Non-daily entry — clear any stale daily badge/modifier from prior session.
    game._isDailyChallenge = false;
    game._dailyModifier = null;
    renderDailyBadge(null);

    // Show tutorial before first game
    if (tutorial.shouldShow()) {
        tutorial.show(() => {
            screenManager.showScreen('game');
            game.livesManager.renderLives(livesDisplay);
            maybeActivateOnboarding(levelData, chapterData);
            setTimeout(() => game.startLevel(levelData, chapterData), 50);
        });
        return;
    }
    screenManager.showScreen('game');
    game.livesManager.renderLives(livesDisplay);
    maybeActivateOnboarding(levelData, chapterData);
    setTimeout(() => game.startLevel(levelData, chapterData), 50);
};

// When a level is completed
game.onLevelComplete = (completedLevel, nextLevel, stats) => {
    const overlay = document.getElementById('overlay-complete');
    overlay.classList.remove('hidden');
    showConfetti();

    // Daily + achievements
    if (game._isDailyChallenge) {
        completeDaily(stats.score, stats.stars);
        storage.recordDailyScore(stats.score, stats.stars);
        game._isDailyChallenge = false;
        game._dailyModifier = null;
        renderDailyBadge(null);
    }
    setTimeout(() => checkAndShowAchievements(), 1500);

    // iOS install banner + rate-us prompt — both gated behind progression
    // so new users aren't spammed. Staggered after the completion overlay so
    // the celebration lands first.
    setTimeout(() => {
        const progress = storage.getProgress();
        maybeShowIosInstall((progress.completedLevels || []).length);
    }, 2500);
    setTimeout(() => {
        if (shouldShowRatePrompt(getPlayerStats())) showRatePrompt();
    }, 3500);

    // Animated stars
    const starsEl = document.getElementById('complete-stars');
    if (starsEl && stats) {
        starsEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.className = i < stats.stars ? 'star filled' : 'star empty';
            star.textContent = i < stats.stars ? '\u2605' : '\u2606';
            if (i < stats.stars) {
                star.style.animationDelay = `${i * 0.4}s`;
                star.classList.add('star-animate');
            }
            starsEl.appendChild(star);
        }
    }

    // Translation lookup with TR fallback so any missing key still shows the
    // existing Turkish text (no blank UI). All 5 lang files have these keys.
    const tx = (key, fallback) => { const v = t(key); return v === key ? fallback : v; };

    // Show score
    const scoreEl = document.getElementById('complete-score');
    if (scoreEl && stats) {
        scoreEl.textContent = `${tx('overlay.complete_score', 'Skor')}: ${stats.score}`;
    }

    // Show stats with remaining time
    const statsEl = document.getElementById('complete-stats');
    if (statsEl && stats) {
        const timeSecs = Math.floor(stats.time / 1000);
        const mins = Math.floor(timeSecs / 60);
        const secs = timeSecs % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        const parts = [`${tx('overlay.complete_time', 'Süre')}: ${timeStr}`];
        if (stats.timeRemaining > 0) parts.push(`${tx('overlay.complete_remaining', 'Kalan')}: ${stats.timeRemaining}s`);
        parts.push(`${tx('overlay.complete_moves', 'Hamle')}: ${stats.moves}`);
        if (stats.maxCombo > 1) parts.push(`${tx('overlay.complete_combo', 'Max Combo')}: x${stats.maxCombo}`);
        if (stats.wrongMoves > 0) parts.push(`${tx('overlay.complete_wrong', 'Yanlış')}: ${stats.wrongMoves}`);
        if (stats.rewardedPowerup) {
            const emoji = { hint: '💡', freeze: '❄', extraUndo: '↶' }[stats.rewardedPowerup] || '🎁';
            const labelKey = { hint: 'powerup.hint', freeze: 'powerup.freeze', extraUndo: 'powerup.extra_undo' }[stats.rewardedPowerup];
            const fallbackLabel = { hint: 'İpucu', freeze: 'Dondurma', extraUndo: 'Ekstra Geri Al' }[stats.rewardedPowerup];
            const label = labelKey ? tx(labelKey, fallbackLabel) : fallbackLabel;
            parts.push(`${tx('complete.reward', 'Ödül')}: ${emoji} +1 ${label}`);
        }
        if (stats.dailyBonus > 0) {
            parts.push(`🔥 ${tx('daily.bonus', 'Günlük Bonus')}: +${stats.dailyBonus}`);
        }
        if (stats.newArtifact) {
            parts.push(`🏺 ${tx('complete.new_artifact', 'Yeni Eser!')}`);
        }
        statsEl.textContent = parts.join(' | ');
    }

    // Replace the button node to guarantee any stale handler from a prior
    // overlay open is discarded (overlay can reopen across levels).
    const oldBtn = document.getElementById('btn-next-level');
    const nextBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(nextBtn, oldBtn);
    noteLevelCompleted();
    nextBtn.addEventListener('click', async () => {
        overlay.classList.add('hidden');
        await maybeShowInterstitial();
        if (nextLevel && nextLevel.chapter === completedLevel.chapter) {
            const chapter = chapters.find(c => c.id === nextLevel.chapter);
            game.startLevel(nextLevel, chapter);
        } else {
            screenManager.showChapters();
        }
    }, { once: true });
};

// When lives run out
game.onNoLives = () => showNoLivesOverlay();

// When lives change (wrong move)
game.onLivesChanged = () => game.livesManager.renderLives(livesDisplay);

// When time runs out — daily shows "try tomorrow"; normal levels offer retry.
game.onTimeUp = () => {
    if (game._isDailyChallenge) {
        showDailyFailOverlay('time');
        return;
    }
    const overlay = document.getElementById('overlay-time-up');
    overlay.classList.remove('hidden');

    // Clone-replace pattern: discards any prior handlers so repeated time-ups
    // don't stack listeners. Each open wires fresh, once-firing handlers.
    const freshen = (id) => {
        const old = document.getElementById(id);
        const clone = old.cloneNode(true);
        old.parentNode.replaceChild(clone, old);
        return clone;
    };
    const adBtn = freshen('btn-ad-continue');
    const retryBtn = freshen('btn-retry');
    const backBtn = freshen('btn-time-up-back');

    const close = () => overlay.classList.add('hidden');

    adBtn.addEventListener('click', async () => {
        const earned = await showRewarded();
        close();
        if (earned) {
            game.timeRemaining = 60;
            game._startCountdown();
            game.startRenderLoop();
        } else {
            screenManager.showChapters();
        }
    }, { once: true });

    retryBtn.addEventListener('click', () => {
        close();
        game.startLevel(game.currentLevel, game.currentChapter);
    }, { once: true });

    backBtn.addEventListener('click', () => {
        close();
        screenManager.showChapters();
    }, { once: true });
};

// Moves exhausted — only fires when moveLimit > 0 (currently daily 'moves' modifier).
game.onMovesUp = () => {
    if (game._isDailyChallenge) {
        showDailyFailOverlay('moves');
    }
};

// Daily challenge failure overlay — streak is preserved because completeDaily
// never fires on failure. User must wait until tomorrow for a new challenge.
function showDailyFailOverlay(reason) {
    const overlay = document.getElementById('overlay-daily-fail');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    const titleEl = document.getElementById('daily-fail-title');
    const msgEl = document.getElementById('daily-fail-message');
    if (titleEl) {
        titleEl.textContent = reason === 'time'
            ? (t('overlay.daily_fail_time_title') || 'Süre Bitti!')
            : (t('overlay.daily_fail_moves_title') || 'Hamle Bitti!');
    }
    if (msgEl) {
        msgEl.textContent = t('overlay.daily_fail_message')
            || 'Günlük meydan okumayı başaramadın. Yarın yeni bir level ile geri gel!';
    }

    const freshen = (id) => {
        const old = document.getElementById(id);
        const clone = old.cloneNode(true);
        old.parentNode.replaceChild(clone, old);
        return clone;
    };
    const backBtn = freshen('btn-daily-fail-back');
    backBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        game._isDailyChallenge = false;
        game._dailyModifier = null;
        renderDailyBadge(null);
        screenManager.showChapters();
    }, { once: true });
}

function showNoLivesOverlay() {
    const overlay = document.getElementById('overlay-no-lives');
    const timerText = document.getElementById('lives-timer-text');

    // Freshen buttons to prevent listener stacking across repeated opens.
    const freshen = (id) => {
        const old = document.getElementById(id);
        const clone = old.cloneNode(true);
        old.parentNode.replaceChild(clone, old);
        return clone;
    };
    const adBtn = freshen('btn-watch-ad');
    const waitBtn = freshen('btn-wait');

    overlay.classList.remove('hidden');

    if (noLivesTimerInterval) clearInterval(noLivesTimerInterval);

    const txLocal = (key, fb) => { const v = t(key); return v === key ? fb : v; };
    const updateTimer = () => {
        const ms = storage.getTimeUntilNextLife();
        if (ms <= 0) {
            timerText.textContent = txLocal('overlay.new_life_ready', 'Yeni can hazır!');
        } else {
            timerText.textContent = txLocal('overlay.new_life_in', 'Yeni can') + ': ' + game.livesManager.formatTime(ms);
        }
    };
    updateTimer();
    noLivesTimerInterval = setInterval(updateTimer, 1000);

    const closeOverlay = () => {
        overlay.classList.add('hidden');
        if (noLivesTimerInterval) {
            clearInterval(noLivesTimerInterval);
            noLivesTimerInterval = null;
        }
    };

    adBtn.addEventListener('click', async () => {
        const earned = await showRewarded();
        if (earned) {
            game.livesManager.addLife();
            game.livesManager.renderLives(livesDisplay);
        }
        closeOverlay();
    }, { once: true });

    waitBtn.addEventListener('click', () => {
        closeOverlay();
        screenManager.showChapters();
    }, { once: true });
}

// Hint button
const hintBtn = document.getElementById('btn-hint');
if (hintBtn) hintBtn.addEventListener('click', () => game.useHint());

// Resize handler
window.addEventListener('resize', () => game.handleResize());

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// === DAILY CHALLENGE ===
document.getElementById('btn-daily').addEventListener('click', () => {
    if (isDailyCompleted()) {
        alert(t('daily.already_done') || 'Bugunun meydan okumasini zaten tamamladin! Yarin tekrar gel.');
        return;
    }
    const daily = getDailyChallenge(allLevels);
    const chapter = chapters.find(c => c.id === daily.level.chapter);
    screenManager.showScreen('game');
    game.livesManager.renderLives(livesDisplay);
    game._isDailyChallenge = true;
    game._dailyModifier = daily.modifier;
    renderDailyBadge(daily.modifier);
    setTimeout(() => game.startLevel(daily.level, chapter, { dailyModifier: daily.modifier }), 50);
});

// Render the daily modifier badge on the game screen. Clears on non-daily.
function renderDailyBadge(modifier) {
    const badge = document.getElementById('daily-modifier-badge');
    if (!badge) return;
    if (!modifier) {
        badge.classList.add('hidden');
        badge.textContent = '';
        return;
    }
    badge.classList.remove('hidden');
    if (modifier.type === 'time') {
        const pct = Math.round(modifier.multiplier * 100);
        badge.innerHTML = `\u23F1\uFE0F <span>${t('daily.badge_time') || 'Süre Meydan Okuması'}</span> <em>${pct}%</em>`;
    } else {
        badge.innerHTML = `\u{1F3AF} <span>${t('daily.badge_moves') || 'Hamle Meydan Okuması'}</span>`;
    }
}


// === ACHIEVEMENTS ===
function getPlayerStats() {
    const data = storage.getProgress();
    const scores = data.levelScores || {};
    let totalStars = 0, perfectLevels = 0, bestCombo = 0, noMistakeLevels = 0, fastestClear = Infinity;
    let chaptersCleared = 0;

    for (const score of Object.values(scores)) {
        totalStars += score.stars || 0;
        if (score.stars >= 3) perfectLevels++;
        if (score.bestCombo > bestCombo) bestCombo = score.bestCombo;
        if (score.wrongMoves === 0) noMistakeLevels++;
        const secs = (score.time || 999999) / 1000;
        if (secs < fastestClear) fastestClear = secs;
    }

    for (let ch = 1; ch <= 10; ch++) {
        const prefix = storage.getChapterPrefix(ch);
        const chLevels = data.completedLevels.filter(id => id.startsWith(prefix));
        if (chLevels.length >= 5) chaptersCleared++;
    }

    const daily = getDailyStreak();
    return {
        totalCleared: data.completedLevels.length,
        totalStars,
        perfectLevels,
        bestCombo,
        chaptersCleared,
        dailyCompleted: isDailyCompleted() ? 1 : 0,
        dailyStreak: daily,
        fastestClear,
        noMistakeLevels,
    };
}

function showAchievementToast(ach) {
    const toast = document.getElementById('achievement-toast');
    document.getElementById('ach-toast-icon').textContent = ach.icon;
    document.getElementById('ach-toast-name').textContent = ach.name;
    document.getElementById('ach-toast-desc').textContent = ach.desc;
    toast.classList.remove('hidden');
    // Achievement unlock — success haptic via Capacitor on iOS so the
    // Taptic Engine actually fires (navigator.vibrate is a no-op on iOS).
    notifySuccess();
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 500);
    }, 3000);
}

function checkAndShowAchievements() {
    const stats = getPlayerStats();
    const newAchs = checkAchievements(stats);
    for (const ach of newAchs) {
        showAchievementToast(ach);
    }
}


// Show achievements overlay
document.getElementById('btn-achievements').addEventListener('click', () => {
    const list = document.getElementById('achievements-list');
    list.innerHTML = '';
    const achs = getAllAchievements();
    for (const ach of achs) {
        const item = document.createElement('div');
        item.className = 'ach-item' + (ach.unlocked ? '' : ' locked');
        item.innerHTML = `
            <span class="ach-icon">${ach.unlocked ? ach.icon : '\u{1F512}'}</span>
            <div class="ach-info">
                <div class="ach-name">${ach.name}</div>
                <div class="ach-desc">${ach.desc}</div>
            </div>
        `;
        list.appendChild(item);
    }
    document.getElementById('overlay-achievements').classList.remove('hidden');
});

document.getElementById('btn-ach-close').addEventListener('click', () => {
    document.getElementById('overlay-achievements').classList.add('hidden');
});

// === COLLECTION ===
const COLLECTION_ICONS = {
    1: '\u{1F3DB}', 2: '\u{1F3DB}', 3: '\u{2694}', 4: '\u{26F5}', 5: '\u{1F319}',
    6: '\u{1F409}', 7: '\u{1F4C5}', 8: '\u{1F54C}', 9: '\u{1F3F0}', 10: '\u{1F451}'
};
const COLLECTION_NAMES = {
    1: 'Firavun Mührü', 2: 'Zeus Asası', 3: 'Lejyon Kalkanı', 4: 'Viking Baltası',
    5: 'Osmanlı Tuğrası', 6: 'Çin Ejderi', 7: 'Maya Takvimi', 8: 'Lotus Çiçeği',
    9: 'Gotik Haç', 10: 'Bilgelik Tacı'
};

document.getElementById('btn-collection').addEventListener('click', () => {
    const list = document.getElementById('collection-list');
    list.innerHTML = '';
    for (const chapter of chapters) {
        const collected = storage.hasArtifact(chapter.id);
        const stars = storage.getChapterStars(chapter.id);
        const item = document.createElement('div');
        item.className = 'collection-item' + (collected ? ' collected' : ' locked');
        const icon = COLLECTION_ICONS[chapter.id] || '\u{1F3FA}';
        const name = COLLECTION_NAMES[chapter.id] || chapter.name;
        item.innerHTML = `
            <div class="collection-icon">${collected ? icon : '\u{1F512}'}</div>
            <div class="collection-name">${name}</div>
            <div class="collection-chapter">${chapter.name}</div>
            <div class="collection-progress">\u2605 ${Math.min(stars, 13)}/13</div>
        `;
        list.appendChild(item);
    }
    document.getElementById('overlay-collection').classList.remove('hidden');
});

document.getElementById('btn-collection-close').addEventListener('click', () => {
    document.getElementById('overlay-collection').classList.add('hidden');
});

// === LEADERBOARD ===
document.getElementById('btn-leaderboard').addEventListener('click', () => {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    const entries = storage.getWeeklyLeaderboard();
    if (entries.length === 0) {
        list.innerHTML = '<p class="leaderboard-empty">Henüz skor yok. Günlük meydan okumayı oyna!</p>';
    } else {
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            const row = document.createElement('div');
            row.className = 'leaderboard-row' + (i === 0 ? ' top' : '');
            const medal = i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : `#${i + 1}`;
            const starStr = '\u2605'.repeat(e.stars || 0);
            row.innerHTML = `
                <span class="lb-rank">${medal}</span>
                <span class="lb-date">${e.date}</span>
                <span class="lb-stars">${starStr}</span>
                <span class="lb-score">${e.score}</span>
            `;
            list.appendChild(row);
        }
    }
    document.getElementById('overlay-leaderboard').classList.remove('hidden');
});

document.getElementById('btn-leaderboard-close').addEventListener('click', () => {
    document.getElementById('overlay-leaderboard').classList.add('hidden');
});

// === SETTINGS ===
document.getElementById('btn-settings').addEventListener('click', () => {
    // Update toggle states
    const darkToggle = document.getElementById('setting-dark');
    darkToggle.classList.toggle('active', document.body.classList.contains('dark-mode'));
    document.getElementById('setting-lang').textContent = getLang().toUpperCase();
    document.getElementById('overlay-settings').classList.remove('hidden');
});

document.getElementById('btn-settings-close').addEventListener('click', () => {
    document.getElementById('overlay-settings').classList.add('hidden');
});

document.getElementById('setting-dark').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    document.getElementById('setting-dark').classList.toggle('active', document.body.classList.contains('dark-mode'));
});

document.getElementById('setting-lang').addEventListener('click', () => {
    document.getElementById('overlay-settings').classList.add('hidden');
    document.getElementById('overlay-language').classList.remove('hidden');
});

document.getElementById('setting-premium').addEventListener('click', () => {
    document.getElementById('overlay-settings').classList.add('hidden');
    document.getElementById('overlay-premium').classList.remove('hidden');
});

document.getElementById('btn-premium-close').addEventListener('click', () => {
    document.getElementById('overlay-premium').classList.add('hidden');
});

document.getElementById('btn-premium-buy').addEventListener('click', () => {
    buyPremium();
});

document.getElementById('btn-premium-restore').addEventListener('click', () => {
    restorePurchases();
});

// Main-menu "Remove Ads" CTA opens the premium paywall. If the user already
// owns premium we hide the button at init time so they don't see an upsell
// for something they've purchased.
const removeAdsBtn = document.getElementById('btn-remove-ads');
if (removeAdsBtn) {
    if (isPremiumOwned()) {
        removeAdsBtn.classList.add('hidden');
    } else {
        removeAdsBtn.addEventListener('click', () => {
            document.getElementById('overlay-premium').classList.remove('hidden');
        });
    }
}

// Mode-info overlay close button (opened from the "?" pill on the levels screen).
document.getElementById('btn-modes-info-close')?.addEventListener('click', () => {
    document.getElementById('overlay-modes-info').classList.add('hidden');
});

document.getElementById('setting-reset').addEventListener('click', () => {
    const confirmText = (() => { const v = t('confirm.reset_progress'); return v === 'confirm.reset_progress' ? 'Tüm ilerlemen silinecek. Emin misin?' : v; })();
    if (confirm(confirmText)) {
        storage.resetAll();
        localStorage.removeItem('ok_bulmacasi_tutorial_done');
        localStorage.removeItem('okchu_achievements');
        localStorage.removeItem('okchu_daily');
        localStorage.removeItem('okchu_onboarding_done');
        localStorage.removeItem('okchu_ios_install_dismissed_at');
        localStorage.removeItem('okchu_rate_state');
        localStorage.removeItem('okchu.ads.lastInterstitialAt');
        location.reload();
    }
});

// === CONFETTI CELEBRATION ===
function showConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    container.setAttribute('aria-hidden', 'true');
    container.setAttribute('role', 'presentation');
    document.body.appendChild(container);

    const colors = ['#d4a843', '#c04030', '#2b8a9a', '#3a8a6e', '#8040a0', '#ff6b6b', '#ffd93d', '#6bcb77'];
    const shapes = ['square', 'circle'];

    for (let i = 0; i < 80; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        piece.style.left = Math.random() * 100 + '%';
        piece.style.background = color;
        piece.style.width = (6 + Math.random() * 8) + 'px';
        piece.style.height = (6 + Math.random() * 8) + 'px';
        piece.style.borderRadius = shape === 'circle' ? '50%' : '2px';
        piece.style.animationDuration = (1.5 + Math.random() * 2) + 's';
        piece.style.animationDelay = Math.random() * 0.8 + 's';
        container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 4000);
}
