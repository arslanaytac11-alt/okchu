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
                    this.showLevels(chapter);
                });
            }

            list.appendChild(card);
        }

        this.showScreen('chapters');
    }

    showLevels(chapter) {
        document.getElementById('level-screen-title').textContent = chapter.name;
        const list = document.getElementById('level-list');
        list.innerHTML = '';

        const levels = getLevelsByChapter(chapter.id);
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const completed = storage.isLevelCompleted(level.id);
            const prevCompleted = i === 0 || storage.isLevelCompleted(levels[i - 1].id);
            const isAccessible = completed || prevCompleted;

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
}
