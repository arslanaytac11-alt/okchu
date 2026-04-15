// js/screens.js

import { chapters } from './data/chapters.js';
import { getLevelsByChapter } from './levels.js';
import { storage } from './storage.js';

export class ScreenManager {
    constructor() {
        this.screens = {
            menu: document.getElementById('screen-menu'),
            chapters: document.getElementById('screen-chapters'),
            story: document.getElementById('screen-story'),
            levels: document.getElementById('screen-levels'),
            game: document.getElementById('screen-game')
        };
        this.onStartLevel = null;
        this.currentChapter = null;
        this.setupNavigation();
    }

    showScreen(name) {
        for (const [key, el] of Object.entries(this.screens)) {
            el.classList.toggle('active', key === name);
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

        document.getElementById('btn-story-continue').addEventListener('click', () => {
            if (this.currentChapter) {
                this.showLevels(this.currentChapter);
            }
        });

        document.getElementById('btn-game-back').addEventListener('click', () => {
            this.showScreen('levels');
        });
    }

    showChapters() {
        const list = document.getElementById('chapter-list');
        list.innerHTML = '';

        for (const chapter of chapters) {
            const unlocked = storage.isChapterUnlocked(chapter.id);
            const card = document.createElement('div');
            card.className = 'chapter-card' + (unlocked ? '' : ' locked');

            const thumb = document.createElement('div');
            thumb.className = 'chapter-thumb';
            thumb.style.backgroundImage = `url(${chapter.story.image})`;

            const numDiv = document.createElement('div');
            numDiv.className = 'chapter-number';
            numDiv.style.background = chapter.theme.arrowRemovable;
            numDiv.textContent = chapter.id;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'chapter-info';

            const nameSpan = document.createElement('div');
            nameSpan.className = 'chapter-name';
            nameSpan.textContent = chapter.name;

            const diffSpan = document.createElement('div');
            diffSpan.className = 'chapter-difficulty';
            diffSpan.textContent = chapter.difficulty;

            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(diffSpan);

            card.appendChild(thumb);
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
                    this.showStoryCard(chapter);
                });
            }

            list.appendChild(card);
        }

        this.showScreen('chapters');
    }

    showStoryCard(chapter) {
        this.currentChapter = chapter;
        const story = chapter.story;
        this.applyChapterTheme(chapter);

        document.getElementById('story-title').textContent = story.title;
        document.getElementById('story-period').textContent = story.period;
        document.getElementById('story-text').textContent = story.text;
        document.getElementById('story-mystery').textContent = story.mystery;

        const img = document.getElementById('story-image');
        // Try loading the chapter image, fallback to gradient
        img.onerror = () => {
            img.style.display = 'none';
        };
        img.onload = () => {
            img.style.display = 'block';
        };
        img.src = story.image;

        // Apply chapter theme color to story card
        const card = document.querySelector('.story-card');
        const color = chapter.theme.arrowRemovable;
        card.style.setProperty('--chapter-color', color);

        this.showScreen('story');
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
    }
}
