// js/main.js

import { Game } from './game.js';
import { ScreenManager } from './screens.js';
import { chapters } from './data/chapters.js';
import { storage } from './storage.js';
import { Tutorial } from './tutorial.js';
import { initLanguage, loadLanguage, t, getLang } from './i18n.js';

// Dark mode
if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
document.getElementById('btn-dark-mode').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
});

// Language system
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val && val !== key) el.textContent = val;
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

document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', async () => {
        await loadLanguage(btn.dataset.lang);
        applyTranslations();
        document.getElementById('overlay-language').classList.add('hidden');
        // Refresh chapters if visible
        if (document.getElementById('screen-chapters').classList.contains('active')) {
            screenManager.showChapters();
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
}, 2300);

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
const screenManager = new ScreenManager();
const livesDisplay = document.getElementById('lives-display');
const tutorial = new Tutorial();

let noLivesTimerInterval = null;

// Render initial lives
game.livesManager.renderLives(livesDisplay);

// When a level is selected from the menu
screenManager.onStartLevel = (levelData, chapterData) => {
    if (!game.livesManager.hasLives()) {
        showNoLivesOverlay();
        return;
    }

    // Show tutorial before first game
    if (tutorial.shouldShow()) {
        tutorial.show(() => {
            screenManager.showScreen('game');
            game.livesManager.renderLives(livesDisplay);
            setTimeout(() => game.startLevel(levelData, chapterData), 50);
        });
        return;
    }
    screenManager.showScreen('game');
    game.livesManager.renderLives(livesDisplay);
    setTimeout(() => game.startLevel(levelData, chapterData), 50);
};

// When a level is completed
game.onLevelComplete = (completedLevel, nextLevel, stats) => {
    const overlay = document.getElementById('overlay-complete');
    overlay.classList.remove('hidden');

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

    // Show score
    const scoreEl = document.getElementById('complete-score');
    if (scoreEl && stats) {
        scoreEl.textContent = `Skor: ${stats.score}`;
    }

    // Show stats with remaining time
    const statsEl = document.getElementById('complete-stats');
    if (statsEl && stats) {
        const timeSecs = Math.floor(stats.time / 1000);
        const mins = Math.floor(timeSecs / 60);
        const secs = timeSecs % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        const parts = [`Sure: ${timeStr}`];
        if (stats.timeRemaining > 0) parts.push(`Kalan: ${stats.timeRemaining}s`);
        parts.push(`Hamle: ${stats.moves}`);
        if (stats.maxCombo > 1) parts.push(`Max Combo: x${stats.maxCombo}`);
        if (stats.wrongMoves > 0) parts.push(`Yanlis: ${stats.wrongMoves}`);
        statsEl.textContent = parts.join(' | ');
    }

    const nextBtn = document.getElementById('btn-next-level');
    const handler = () => {
        overlay.classList.add('hidden');
        nextBtn.removeEventListener('click', handler);

        if (nextLevel && nextLevel.chapter === completedLevel.chapter) {
            const chapter = chapters.find(c => c.id === nextLevel.chapter);
            game.startLevel(nextLevel, chapter);
        } else {
            screenManager.showChapters();
        }
    };
    nextBtn.addEventListener('click', handler);
};

// When lives run out
game.onNoLives = () => showNoLivesOverlay();

// When lives change (wrong move)
game.onLivesChanged = () => game.livesManager.renderLives(livesDisplay);

// When time runs out - no life loss, just retry or watch ad
game.onTimeUp = () => {
    const overlay = document.getElementById('overlay-time-up');
    overlay.classList.remove('hidden');

    const adBtn = document.getElementById('btn-ad-continue');
    const retryBtn = document.getElementById('btn-retry');
    const backBtn = document.getElementById('btn-time-up-back');

    const cleanup = () => {
        overlay.classList.add('hidden');
        adBtn.removeEventListener('click', adHandler);
        retryBtn.removeEventListener('click', retryHandler);
        backBtn.removeEventListener('click', backHandler);
    };

    const adHandler = () => {
        // TODO: Show rewarded ad, then continue with extra time
        cleanup();
        game.timeRemaining = 60; // +60 seconds after ad
        game._startCountdown();
        game.startRenderLoop();
    };

    const retryHandler = () => {
        cleanup();
        game.startLevel(game.currentLevel, game.currentChapter);
    };

    const backHandler = () => {
        cleanup();
        screenManager.showChapters();
    };

    adBtn.addEventListener('click', adHandler);
    retryBtn.addEventListener('click', retryHandler);
    backBtn.addEventListener('click', backHandler);
};

function showNoLivesOverlay() {
    const overlay = document.getElementById('overlay-no-lives');
    const timerText = document.getElementById('lives-timer-text');
    const adBtn = document.getElementById('btn-watch-ad');
    const waitBtn = document.getElementById('btn-wait');

    overlay.classList.remove('hidden');

    // Timer update
    if (noLivesTimerInterval) clearInterval(noLivesTimerInterval);

    const updateTimer = () => {
        const ms = storage.getTimeUntilNextLife();
        if (ms <= 0) {
            timerText.textContent = 'Yeni can hazir!';
        } else {
            timerText.textContent = 'Yeni can: ' + game.livesManager.formatTime(ms);
        }
    };
    updateTimer();
    noLivesTimerInterval = setInterval(updateTimer, 1000);

    const closeOverlay = () => {
        overlay.classList.add('hidden');
        if (noLivesTimerInterval) clearInterval(noLivesTimerInterval);
        adBtn.removeEventListener('click', adHandler);
        waitBtn.removeEventListener('click', waitHandler);
    };

    const adHandler = () => {
        game.livesManager.addLife();
        game.livesManager.renderLives(livesDisplay);
        closeOverlay();
    };

    const waitHandler = () => {
        closeOverlay();
        screenManager.showChapters();
    };

    adBtn.addEventListener('click', adHandler);
    waitBtn.addEventListener('click', waitHandler);
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
