// js/screens.js

import { chapters } from './data/chapters.js';
import { getLevelsByChapter } from './levels.js';
import { storage } from './storage.js';
import { showBanner, hideBanner } from './ads.js';

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
            if (el) el.classList.toggle('active', key === name);
        }
        // Banner only on non-gameplay screens — keep the canvas unobstructed.
        if (name === 'game') hideBanner();
        else showBanner();
    }

    setupNavigation() {
        document.getElementById('btn-play').addEventListener('click', () => {
            this.showChapters();
        });

        document.getElementById('btn-chapters-back').addEventListener('click', () => {
            this.showScreen('menu');
        });

        document.getElementById('btn-story-back').addEventListener('click', () => {
            this.showChapters();
        });

        document.getElementById('btn-story-play').addEventListener('click', () => {
            if (this.currentChapter) this.showLevels(this.currentChapter);
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
            header.textContent = `Bölümler \u2605 ${storage.getTotalStars()}/150`;
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

            // Progress bar
            const progressDiv = document.createElement('div');
            progressDiv.className = 'chapter-progress';
            const progressFill = document.createElement('div');
            progressFill.className = 'chapter-progress-fill';
            const completedCount = getLevelsByChapter(chapter.id).filter(l => storage.isLevelCompleted(l.id)).length;
            progressFill.style.width = `${(completedCount / 5) * 100}%`;
            progressDiv.appendChild(progressFill);

            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(diffSpan);
            infoDiv.appendChild(starsSpan);
            infoDiv.appendChild(progressDiv);

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
                    this.showStory(chapter);
                });
            }

            list.appendChild(card);
        }

        this.showScreen('chapters');
    }

    showStory(chapter) {
        this.applyChapterTheme(chapter);

        const story = chapter.story || {};
        const bgNames = {
            1: 'egypt', 2: 'greek', 3: 'rome', 4: 'viking', 5: 'ottoman',
            6: 'china', 7: 'maya', 8: 'india', 9: 'medieval', 10: 'final'
        };

        // Set image
        const img = document.getElementById('story-image');
        img.src = `assets/backgrounds/bg-${bgNames[chapter.id] || 'final'}.jpg`;

        // Set text content
        document.getElementById('story-title').textContent = story.title || chapter.name;
        document.getElementById('story-period').textContent = story.period || '';
        document.getElementById('story-text').textContent = story.text || '';
        document.getElementById('story-mystery').textContent = story.mystery || '';

        // Fun facts per civilization
        const facts = this._getChapterFacts(chapter.id);
        const factsEl = document.getElementById('story-facts');
        factsEl.innerHTML = '';
        for (const fact of facts) {
            const tag = document.createElement('span');
            tag.className = 'story-fact';
            tag.innerHTML = `<span class="story-fact-icon">${fact.icon}</span>${fact.text}`;
            factsEl.appendChild(tag);
        }

        this.showScreen('story');
    }

    _getChapterFacts(chapterId) {
        const allFacts = {
            1: [
                { icon: '\u{1F3DB}', text: 'Keops Piramidi 146m' },
                { icon: '\u{1F4DC}', text: 'Hiyeroglif yazisi' },
                { icon: '\u{1F3A8}', text: 'Mumyalama sanati' },
                { icon: '\u{2B50}', text: 'Yildiz haritaciligi' },
            ],
            2: [
                { icon: '\u{1F3DB}', text: 'Parthenon tapinagi' },
                { icon: '\u{1F4D6}', text: 'Felsefe ve demokrasi' },
                { icon: '\u{1F3C5}', text: 'Olimpiyat oyunlari' },
                { icon: '\u{2696}', text: 'Matematik ve geometri' },
            ],
            3: [
                { icon: '\u{1F3DB}', text: 'Kolezyum 50.000 kisi' },
                { icon: '\u{1F6E3}', text: 'Roma yollari 80.000km' },
                { icon: '\u{2694}', text: 'Gladyator dovusleri' },
                { icon: '\u{1F4A7}', text: 'Su kemeri muhendisligi' },
            ],
            4: [
                { icon: '\u{26F5}', text: 'Ejderha gemiler' },
                { icon: '\u{1F9ED}', text: "Amerika'yi kesfettiler" },
                { icon: '\u{2702}', text: 'Runik alfabe' },
                { icon: '\u{2744}', text: 'Fiyort cografyasi' },
            ],
            5: [
                { icon: '\u{1F54C}', text: '3 kitaya hukmetti' },
                { icon: '\u{1F338}', text: 'Lale devri sanati' },
                { icon: '\u{1F3F0}', text: 'Topkapi Sarayi' },
                { icon: '\u{2696}', text: '600 yillik imparatorluk' },
            ],
            6: [
                { icon: '\u{1F9E8}', text: 'Barut icadi' },
                { icon: '\u{1F4DC}', text: 'Kagit ve matbaa' },
                { icon: '\u{1F9ED}', text: 'Pusula icadi' },
                { icon: '\u{1F409}', text: 'Cin Seddi 21.000km' },
            ],
            7: [
                { icon: '\u{1F4C5}', text: 'Maya takvimi' },
                { icon: '\u{2B50}', text: 'Astronomi uzmanligi' },
                { icon: '\u{1F33D}', text: 'Misir ve kakao' },
                { icon: '\u{1F3DB}', text: 'Basamakli piramitler' },
            ],
            8: [
                { icon: '\u{1F54C}', text: 'Tac Mahal harikasi' },
                { icon: '\u{1F9D8}', text: 'Yoga ve meditasyon' },
                { icon: '\u{1F4D0}', text: 'Sifir sayisini buldular' },
                { icon: '\u{1F338}', text: 'Lotus ve baharat yolu' },
            ],
            9: [
                { icon: '\u{1F3F0}', text: 'Gotik katedraller' },
                { icon: '\u{2694}', text: 'Haclı seferleri' },
                { icon: '\u{1F9EA}', text: 'Simya ve bilim' },
                { icon: '\u{1F5FA}', text: 'Kesfif cagi baslangici' },
            ],
            10: [
                { icon: '\u{1F30D}', text: '10 medeniyet' },
                { icon: '\u{1F3C6}', text: 'Son meydan okuma' },
                { icon: '\u{2728}', text: 'Tum bilgeler burada' },
                { icon: '\u{1F451}', text: 'Efsanevi zorluk' },
            ],
        };
        return allFacts[chapterId] || [];
    }

    showLevels(chapter) {
        this.applyChapterTheme(chapter);
        document.getElementById('level-screen-title').textContent = chapter.name;

        const list = document.getElementById('level-list');
        list.innerHTML = '';

        const levels = getLevelsByChapter(chapter.id);

        // Game mode selector
        const modeBar = document.createElement('div');
        modeBar.className = 'mode-selector';
        const modes = [
            { id: 'classic', label: 'Klasik', icon: '\u{1F3AE}' },
            { id: 'timed', label: 'Hızlı', icon: '\u26A1' },
            { id: 'zen', label: 'Zen', icon: '\u{1F33F}' },
        ];
        const activeMode = storage.getGameMode();
        for (const m of modes) {
            const btn = document.createElement('button');
            btn.className = 'mode-btn' + (m.id === activeMode ? ' active' : '');
            btn.innerHTML = `<span class="mode-icon">${m.icon}</span><span>${m.label}</span>`;
            btn.addEventListener('click', () => {
                storage.setGameMode(m.id);
                this.showLevels(chapter);
            });
            modeBar.appendChild(btn);
        }
        list.appendChild(modeBar);

        // Path map layout - zigzag pattern
        const pathContainer = document.createElement('div');
        pathContainer.className = 'level-path';

        // SVG for connecting lines — SVGElement.className is a read-only
        // SVGAnimatedString; use setAttribute('class', ...) instead.
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'level-path-svg');
        svg.setAttribute('viewBox', '0 0 300 600');
        svg.setAttribute('preserveAspectRatio', 'none');
        pathContainer.appendChild(svg);

        // Zigzag positions: alternate left-center-right
        const positions = [
            { x: 50, y: 90 },
            { x: 75, y: 210 },
            { x: 35, y: 330 },
            { x: 70, y: 450 },
            { x: 45, y: 560 },
        ];

        // Draw path lines
        let pathD = '';
        for (let i = 0; i < positions.length; i++) {
            const px = positions[i].x * 3;
            const py = positions[i].y;
            if (i === 0) pathD += `M ${px} ${py}`;
            else pathD += ` L ${px} ${py}`;
        }

        const pathLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathLine.setAttribute('d', pathD);
        pathLine.setAttribute('stroke', 'rgba(140,110,70,0.25)');
        pathLine.setAttribute('stroke-width', '4');
        pathLine.setAttribute('stroke-dasharray', '8 6');
        pathLine.setAttribute('fill', 'none');
        pathLine.setAttribute('stroke-linecap', 'round');
        svg.appendChild(pathLine);

        // Draw completed path overlay
        let completedCount = 0;
        for (const level of levels) {
            if (storage.isLevelCompleted(level.id)) completedCount++;
            else break;
        }

        if (completedCount > 0) {
            let completedD = '';
            for (let i = 0; i <= Math.min(completedCount, positions.length - 1); i++) {
                const px = positions[i].x * 3;
                const py = positions[i].y;
                if (i === 0) completedD += `M ${px} ${py}`;
                else completedD += ` L ${px} ${py}`;
            }
            const completedLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            completedLine.setAttribute('d', completedD);
            completedLine.setAttribute('stroke', 'var(--theme-accent, #a07030)');
            completedLine.setAttribute('stroke-width', '4');
            completedLine.setAttribute('fill', 'none');
            completedLine.setAttribute('stroke-linecap', 'round');
            svg.appendChild(completedLine);
        }

        // Create level nodes on the path
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const completed = storage.isLevelCompleted(level.id);
            const score = storage.getLevelScore(level.id);
            const stars = score?.stars || 0;
            const levelNumInChapter = i + 1;
            const isBoss = levelNumInChapter === 5;
            const bossLocked = isBoss && storage.isBossLocked(chapter.id, levelNumInChapter);
            const isAccessible = !bossLocked;

            const node = document.createElement('div');
            let cls = 'level-node' + (completed ? ' completed' : ' current');
            if (isBoss) cls += ' boss';
            if (bossLocked) cls += ' locked-boss';
            node.className = cls;
            node.style.left = positions[i].x + '%';
            node.style.top = positions[i].y + 'px';

            // Level number circle
            const circle = document.createElement('div');
            circle.className = 'level-node-circle';
            circle.textContent = isBoss ? '\u{1F451}' : level.level;
            node.appendChild(circle);

            // Level name
            const name = document.createElement('div');
            name.className = 'level-node-name';
            name.textContent = level.name;
            node.appendChild(name);

            // Boss gate progress
            if (bossLocked) {
                const gate = storage.getBossGateProgress(chapter.id);
                const gateEl = document.createElement('div');
                gateEl.className = 'level-node-gate';
                gateEl.textContent = `\u{1F512} \u2605 ${gate.current}/${gate.required}`;
                node.appendChild(gateEl);
            }

            // Stars
            if (stars > 0) {
                const starsEl = document.createElement('div');
                starsEl.className = 'level-node-stars';
                starsEl.textContent = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
                node.appendChild(starsEl);
            }

            // Thumbnail preview (mini grid)
            const thumb = document.createElement('canvas');
            thumb.className = 'level-thumb';
            thumb.width = 60;
            thumb.height = 60;
            this._drawLevelThumbnail(thumb, level);
            node.appendChild(thumb);

            if (isAccessible && this.onStartLevel) {
                node.addEventListener('click', () => {
                    this.onStartLevel(level, chapter);
                });
            }

            pathContainer.appendChild(node);
        }

        list.appendChild(pathContainer);
        this.showScreen('levels');
    }

    _drawLevelThumbnail(canvas, level) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const gw = level.gridWidth;
        const gh = level.gridHeight;
        const cs = Math.min(w / gw, h / gh);
        const ox = (w - gw * cs) / 2;
        const oy = (h - gh * cs) / 2;

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(80,60,30,0.5)';
        ctx.lineWidth = Math.max(1, cs * 0.15);
        ctx.lineCap = 'round';

        for (const p of level.paths) {
            if (p.cells.length === 0) continue;
            ctx.beginPath();
            const c0 = p.cells[0];
            ctx.moveTo(ox + c0[0] * cs + cs / 2, oy + c0[1] * cs + cs / 2);
            for (let i = 1; i < p.cells.length; i++) {
                ctx.lineTo(ox + p.cells[i][0] * cs + cs / 2, oy + p.cells[i][1] * cs + cs / 2);
            }
            ctx.stroke();
        }
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
