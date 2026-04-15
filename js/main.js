// js/main.js

import { Game } from './game.js';
import { ScreenManager } from './screens.js';
import { chapters } from './data/chapters.js';
import { storage } from './storage.js';
import { MenuBackground } from './menu-bg.js';
import { sound } from './sound.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
const screenManager = new ScreenManager();
const livesDisplay = document.getElementById('lives-display');

// Menu animated background
const menuBgCanvas = document.getElementById('menu-bg-canvas');
const menuBg = new MenuBackground(menuBgCanvas);
menuBg.start();

// Stop menu bg animation when leaving menu, restart when returning
const origShowScreen = screenManager.showScreen.bind(screenManager);
screenManager.showScreen = (name) => {
    origShowScreen(name);
    if (name === 'menu') {
        menuBg.resize();
        menuBg.start();
    } else {
        menuBg.stop();
    }
};

window.addEventListener('resize', () => {
    if (document.getElementById('screen-menu').classList.contains('active')) {
        menuBg.resize();
    }
});

let noLivesTimerInterval = null;

// Render initial lives
game.livesManager.renderLives(livesDisplay);

// When a level is selected from the menu
screenManager.onStartLevel = (levelData, chapterData) => {
    if (!game.livesManager.hasLives()) {
        showNoLivesOverlay();
        return;
    }
    screenManager.showScreen('game');
    game.livesManager.renderLives(livesDisplay);
    setTimeout(() => game.startLevel(levelData, chapterData), 50);
};

// When a level is completed
game.onLevelComplete = (completedLevel, nextLevel) => {
    const overlay = document.getElementById('overlay-complete');
    overlay.classList.remove('hidden');

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
document.getElementById('btn-hint').addEventListener('click', () => game.useHint());

// Sound toggle
const soundBtn = document.getElementById('btn-sound');
if (soundBtn) {
    soundBtn.addEventListener('click', () => {
        const enabled = sound.toggle();
        soundBtn.style.opacity = enabled ? '1' : '0.4';
    });
}

// Resize handler
window.addEventListener('resize', () => game.handleResize());
