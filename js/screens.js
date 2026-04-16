// js/screens.js

import { chapters } from './data/chapters.js';
import { getLevelsByChapter } from './levels.js';
import { storage } from './storage.js';

export class ScreenManager {
    constructor() {
        this.screens = {
            menu: document.getElementById('screen-menu'),
            chapters: document.getElementById('screen-chapters'),
            levels: document.getElementById('screen-levels'),
            game: document.getElementById('screen-game')
        };
        this.onStartLevel = null;
        this.currentChapter = null;
        this.setupNavigation();
    }

    showScreen(name) {
        for (const [key, el] of Object.entries(this.screens)) {
            if (el) el.classList.toggle('active', key === name);
        }
    }

    setupNavigation() {
        document.getElementById('btn-play').addEventListener('click', () => {
            this.showChapters();
        });

        document.getElementById('btn-chapters-back').addEventListener('click', () => {
            this.showScreen('menu');
        });

        document.getElementById('btn-levels-back').addEventListener('click', () => {
            this.showChapters();
        });

        document.getElementById('btn-game-back').addEventListener('click', () => {
            this.showScreen('levels');
        });
    }

    showChapters() {
        const list = document.getElementById('chapter-list');
        list.innerHTML = '';

        // Total stars in header
        const header = document.querySelector('#screen-chapters .screen-header h2');
        if (header) {
            header.textContent = `Bolumler \u2605 ${storage.getTotalStars()}/150`;
        }

        for (const chapter of chapters) {
            const unlocked = storage.isChapterUnlocked(chapter.id);
            const card = document.createElement('div');
            card.className = 'chapter-card' + (unlocked ? '' : ' locked');

            const numDiv = document.createElement('div');
            numDiv.className = 'chapter-number';
            numDiv.style.background = chapter.theme.arrowRemovable || chapter.theme.arrowIdle;
            numDiv.textContent = chapter.id;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'chapter-info';

            const nameSpan = document.createElement('div');
            nameSpan.className = 'chapter-name';
            nameSpan.textContent = chapter.name;

            const diffSpan = document.createElement('div');
            diffSpan.className = 'chapter-difficulty';
            diffSpan.textContent = chapter.difficulty;

            const starsSpan = document.createElement('div');
            starsSpan.className = 'chapter-stars';
            const chapterStars = storage.getChapterStars(chapter.id);
            starsSpan.textContent = `\u2605 ${chapterStars}/15`;

            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(diffSpan);
            infoDiv.appendChild(starsSpan);

            card.appendChild(numDiv);
            card.appendChild(infoDiv);

            if (!unlocked) {
                const lock = document.createElement('span');
                lock.className = 'chapter-lock-icon';
                lock.textContent = '\u{1F512}';
                card.appendChild(lock);
            }

            if (unlocked) {
                card.addEventListener('click', () => {
                    this.currentChapter = chapter;
                    this.showLevels(chapter);
                });
            }

            list.appendChild(card);
        }

        this.showScreen('chapters');
    }

    showLevels(chapter) {
        this.applyChapterTheme(chapter);
        document.getElementById('level-screen-title').textContent = chapter.name;

        const list = document.getElementById('level-list');
        list.innerHTML = '';

        const levels = getLevelsByChapter(chapter.id);
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const completed = storage.isLevelCompleted(level.id);
            const isAccessible = true; // TEST MODE: all levels unlocked

            const card = document.createElement('div');
            card.className = 'level-card';
            if (completed) {
                card.classList.add('completed');
            } else if (isAccessible) {
                card.classList.add('current');
            } else {
                card.classList.add('locked');
            }

            card.textContent = level.level;
            card.title = level.name;

            if (isAccessible && this.onStartLevel) {
                card.addEventListener('click', () => {
                    this.onStartLevel(level, chapter);
                });
            }

            list.appendChild(card);
        }

        this.showScreen('levels');
    }

    applyChapterTheme(chapter) {
        const root = document.documentElement;
        const theme = chapter.theme || {};
        root.style.setProperty('--theme-bg-top', theme.backgroundGradient?.[0] || theme.background || '#f0e4c8');
        root.style.setProperty('--theme-bg-bottom', theme.backgroundGradient?.[1] || theme.background || '#ddd0b0');
        root.style.setProperty('--theme-ink', theme.arrowIdle || '#3a2e1f');
        root.style.setProperty('--theme-accent', theme.hintColor || '#a07030');
        root.style.setProperty('--theme-accent-soft', theme.removableGlow || 'rgba(100,60,30,0.12)');
        root.style.setProperty('--theme-surface', theme.surface || 'rgba(255,255,255,0.44)');
        root.style.setProperty('--theme-surface-strong', theme.surfaceStrong || 'rgba(255,255,255,0.72)');
        root.style.setProperty('--theme-border', theme.borderColor || 'rgba(100,70,40,0.15)');
        root.style.setProperty('--theme-pattern', theme.patternColor || 'rgba(120,80,40,0.08)');
        document.body.dataset.theme = chapter.id === 5 ? 'ottoman' : 'default';

        // Set chapter map background on levels screen
        const bgNames = {
            1: 'egypt', 2: 'greek', 3: 'rome', 4: 'viking', 5: 'ottoman',
            6: 'china', 7: 'maya', 8: 'india', 9: 'medieval', 10: 'final'
        };
        const bgName = bgNames[chapter.id] || 'final';
        const levelsScreen = document.getElementById('screen-levels');
        if (levelsScreen) {
            levelsScreen.style.backgroundImage = `linear-gradient(180deg, rgba(240,228,200,0.45) 0%, rgba(220,200,170,0.5) 100%), url('assets/backgrounds/bg-${bgName}.jpg')`;
            levelsScreen.style.backgroundSize = 'auto, cover';
            levelsScreen.style.backgroundPosition = 'center, center';
            levelsScreen.style.backgroundRepeat = 'no-repeat, no-repeat';
        }
    }
}
