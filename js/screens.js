// js/screens.js

import { chapters } from './data/chapters.js';
import { getLevelsByChapter } from './levels.js';
import { storage } from './storage.js';
import { showBanner, hideBanner } from './ads.js?v=2';
import { t } from './i18n.js?v=3';
import { isLocalReviewMode } from './preview-mode.js';

// Translation key helpers. `chapters.js` stores Turkish names/difficulty/story
// text inline because the data file was authored before i18n — rather than
// duplicating every string into chapters.js per language, we look them up by
// chapter id from the language JSON files. Falls back to chapter.name when
// the key is missing so nothing blanks out.
const DIFFICULTY_KEYS = {
    1: 'easy', 2: 'medium', 3: 'hard', 4: 'hard_plus', 5: 'very_hard',
    6: 'very_hard_plus', 7: 'legendary', 8: 'legendary_plus', 9: 'nightmare', 10: 'nightmare_plus',
};
const BACKGROUNDS = {
    1: 'egypt', 2: 'greek', 3: 'rome', 4: 'viking', 5: 'ottoman',
    6: 'china', 7: 'maya', 8: 'india', 9: 'medieval', 10: 'final',
};
const text = (key, fallback, values = {}) => {
    const translated = t(key);
    const template = typeof translated === 'string' && translated !== key ? translated : fallback;
    return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? `{${name}}`);
};
const chapterImage = chapter => chapter.artwork?.image || `assets/backgrounds/bg-${BACKGROUNDS[chapter.id] || 'final'}.jpg`;
const tChapter = (chapter, field) => {
    const key = `civilizations.${chapter.id}.${field}`;
    const val = t(key);
    return val === key ? (chapter[field] ?? chapter.story?.[field] ?? chapter.name) : val;
};
const tDifficulty = (chapter) => {
    const key = `difficulty.${DIFFICULTY_KEYS[chapter.id] || 'easy'}`;
    const val = t(key);
    return val === key ? chapter.difficulty : val;
};

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
        this.updateMenuDashboard();
    }

    showScreen(name) {
        for (const [key, el] of Object.entries(this.screens)) {
            if (el) el.classList.toggle('active', key === name);
        }
        // Banner only on the game screen — that's where the .banner-ad
        // placeholder div reserves bottom space for the native overlay.
        // Other screens have no spacer, so a banner there would float over
        // UI controls. (Inverted from initial integration: the original
        // setup hid it during gameplay precisely where the spacer is, so
        // players just saw the dashed "Reklam Alanı" placeholder.)
        if (name === 'game') showBanner();
        else hideBanner();
        if (name === 'menu') this.updateMenuDashboard();
    }

    setupNavigation() {
        document.getElementById('btn-play').addEventListener('click', () => {
            if (isLocalReviewMode()) {
                this.showChapters();
                return;
            }
            const { chapter, level } = this._getContinuationTarget();
            this.currentChapter = chapter;
            this.applyChapterTheme(chapter);
            if (level && this.onStartLevel) this.onStartLevel(level, chapter);
            else this.showLevels(chapter);
        });
        document.getElementById('btn-explore')?.addEventListener('click', () => this.showChapters());

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

        // Default back target is the levels list, but callers (e.g. daily
        // challenge launch in main.js) may override this to 'menu' so
        // back from a daily puzzle returns to the main menu instead of
        // landing on a stale/empty levels screen that was never populated
        // for the daily's chapter.
        this.getGameBackTarget = () => 'levels';
        document.getElementById('btn-game-back').addEventListener('click', () => {
            const target = this.getGameBackTarget();
            if (target === 'levels' && this.currentChapter) this.showLevels(this.currentChapter);
            else this.showScreen(target);
        });
    }

    _getContinuationTarget() {
        const lastPlayed = storage.getLastPlayed();
        const chapter = chapters.find(ch => ch.id === lastPlayed?.chapterId && storage.isChapterUnlocked(ch.id)) || chapters[0];
        const playable = getLevelsByChapter(chapter.id).filter((level, index) => !storage.isBossLocked(chapter.id, index + 1));
        const level = playable.find(candidate => !storage.isLevelCompleted(candidate.id))
            || playable.find(candidate => candidate.id === lastPlayed?.levelId)
            || playable[0];
        return { chapter, level, lastPlayed };
    }

    updateMenuDashboard() {
        const allLevels = chapters.flatMap(chapter => getLevelsByChapter(chapter.id));
        const completed = allLevels.filter(level => storage.isLevelCompleted(level.id)).length;
        const progress = document.getElementById('menu-progress-value');
        if (progress) progress.textContent = `${completed}/${allLevels.length}`;
        const stars = document.getElementById('menu-stars-value');
        if (stars) stars.textContent = `${storage.getTotalStars()}/${allLevels.length * 3}`;
        const progressBar = document.getElementById('menu-progress-bar');
        if (progressBar) progressBar.style.width = `${allLevels.length ? completed / allLevels.length * 100 : 0}%`;

        const { chapter, level, lastPlayed } = this._getContinuationTarget();
        const title = document.getElementById('menu-continue-title');
        if (title) title.textContent = isLocalReviewMode()
            ? text('review.play', 'Tüm bulmacaları incele') : lastPlayed
            ? text('menu.continue_title', 'Macerana devam et')
            : text('menu.first_puzzle', 'İlk bulmacanı çöz');
        const subtitle = document.getElementById('menu-continue-subtitle');
        if (subtitle) subtitle.textContent = isLocalReviewMode()
            ? text('review.notice', 'Kontrol modu · 50 bulmaca açık')
            : text('menu.continue_subtitle', '{chapter} · Bulmaca {level}', {
            chapter: tChapter(chapter, 'name'), level: level?.level || 1,
        });
        const image = document.getElementById('menu-chapter-image');
        if (image) {
            image.src = chapterImage(chapter);
            image.style.objectPosition = chapter.artwork?.focal || 'center';
            image.alt = '';
        }
    }

    _createReviewNotice() {
        if (!isLocalReviewMode()) return null;
        const notice = document.createElement('p');
        notice.className = 'level-chapter-summary review-mode-notice';
        notice.style.gridColumn = '1 / -1';
        notice.setAttribute('data-i18n', 'review.notice');
        notice.setAttribute('role', 'status');
        notice.textContent = text('review.notice', 'Kontrol modu · 50 bulmaca açık');
        return notice;
    }

    showChapters() {
        const list = document.getElementById('chapter-list');
        list.innerHTML = '';
        const reviewNotice = this._createReviewNotice();
        if (reviewNotice) list.appendChild(reviewNotice);

        const header = document.querySelector('#screen-chapters .screen-header h2');
        if (header) header.textContent = t('chapters.title');
        const starTotal = document.getElementById('chapters-stars-value');
        if (starTotal) starTotal.textContent = `${storage.getTotalStars()}/150`;

        for (const chapter of chapters) {
            const unlocked = storage.isChapterUnlocked(chapter.id);
            const levels = getLevelsByChapter(chapter.id);
            const completedCount = levels.filter(level => storage.isLevelCompleted(level.id)).length;
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'chapter-card' + (unlocked ? '' : ' locked') + (completedCount === levels.length ? ' completed' : '');
            card.dataset.chapter = String(chapter.id);
            card.setAttribute('aria-disabled', String(!unlocked));

            const art = document.createElement('div');
            art.className = 'chapter-art';
            const image = document.createElement('img');
            image.className = 'chapter-thumb';
            image.src = chapterImage(chapter);
            image.style.objectPosition = chapter.artwork?.focal || 'center';
            image.alt = '';
            image.loading = 'lazy';
            image.decoding = 'async';
            art.appendChild(image);

            const numDiv = document.createElement('div');
            numDiv.className = 'chapter-number';
            numDiv.textContent = String(chapter.id).padStart(2, '0');
            numDiv.setAttribute('aria-label', text('chapters.chapter_number', 'Bölüm {number}', { number: chapter.id }));
            art.appendChild(numDiv);

            const infoDiv = document.createElement('div');
            infoDiv.className = 'chapter-info';

            const nameSpan = document.createElement('div');
            nameSpan.className = 'chapter-name';
            nameSpan.textContent = tChapter(chapter, 'name');

            const period = document.createElement('div');
            period.className = 'chapter-period';
            period.textContent = tChapter(chapter, 'period');

            const diffSpan = document.createElement('div');
            diffSpan.className = 'chapter-difficulty';
            diffSpan.textContent = tDifficulty(chapter);

            const starsSpan = document.createElement('div');
            starsSpan.className = 'chapter-stars';
            const chapterStars = storage.getChapterStars(chapter.id);
            starsSpan.textContent = `\u2605 ${chapterStars}/15`;

            const progressDiv = document.createElement('div');
            progressDiv.className = 'chapter-progress';
            progressDiv.setAttribute('role', 'progressbar');
            progressDiv.setAttribute('aria-valuemin', '0');
            progressDiv.setAttribute('aria-valuemax', String(levels.length));
            progressDiv.setAttribute('aria-valuenow', String(completedCount));
            progressDiv.setAttribute('aria-label', text('chapters.progress', '{completed}/{total} bulmaca', { completed: completedCount, total: levels.length }));
            const progressFill = document.createElement('div');
            progressFill.className = 'chapter-progress-fill';
            progressFill.style.width = `${levels.length ? completedCount / levels.length * 100 : 0}%`;
            progressDiv.appendChild(progressFill);

            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(period);
            infoDiv.appendChild(diffSpan);
            infoDiv.appendChild(starsSpan);
            infoDiv.appendChild(progressDiv);

            card.appendChild(art);
            card.appendChild(infoDiv);

            const status = document.createElement('div');
            status.className = 'chapter-status';
            if (!unlocked) {
                const lock = document.createElement('span');
                lock.className = 'chapter-lock-icon';
                lock.textContent = '\u{1F512}';
                lock.setAttribute('aria-hidden', 'true');
                status.appendChild(lock);
                const reason = document.createElement('span');
                reason.className = 'chapter-lock-reason';
                reason.textContent = text('chapters.unlock_requirement', '{chapter} bölümünde {stars} yıldız topla', {
                    chapter: tChapter(chapters.find(ch => ch.id === chapter.id - 1) || chapter, 'name'), stars: 10,
                });
                infoDiv.appendChild(reason);
            } else {
                const chevron = document.createElement('span');
                chevron.className = 'chapter-chevron';
                chevron.textContent = '\u2192';
                chevron.setAttribute('aria-hidden', 'true');
                status.appendChild(chevron);
            }
            card.appendChild(status);

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
        this.currentChapter = chapter;
        this.applyChapterTheme(chapter);

        const img = document.getElementById('story-image');
        img.src = chapterImage(chapter);
        img.alt = tChapter(chapter, 'name');
        const header = document.querySelector('#screen-story .screen-header h2');
        if (header) header.textContent = tChapter(chapter, 'name');

        // Set text content — pulled from lang JSON so English/Spanish/French/
        // Japanese players don't see the Turkish originals in chapters.js.
        document.getElementById('story-title').textContent = tChapter(chapter, 'title');
        document.getElementById('story-period').textContent = tChapter(chapter, 'period');
        document.getElementById('story-text').textContent = tChapter(chapter, 'text');
        document.getElementById('story-mystery').textContent = tChapter(chapter, 'mystery');

        // Fun facts per civilization — icons stay local, labels come from
        // the active language. If translation is missing we fall back to the
        // hardcoded Turkish list so nothing renders blank.
        const icons = this._getChapterFactIcons(chapter.id);
        const factKey = `civilizations.${chapter.id}.facts`;
        const translated = t(factKey);
        const labels = Array.isArray(translated)
            ? translated
            : this._getChapterFacts(chapter.id).map(f => f.text);
        const factsEl = document.getElementById('story-facts');
        factsEl.innerHTML = '';
        for (let i = 0; i < labels.length; i++) {
            const tag = document.createElement('span');
            tag.className = 'story-fact';
            const icon = document.createElement('span');
            icon.className = 'story-fact-icon';
            icon.textContent = icons[i] || '';
            icon.setAttribute('aria-hidden', 'true');
            tag.append(icon, document.createTextNode(labels[i]));
            factsEl.appendChild(tag);
        }

        this.showScreen('story');
    }

    // Icons parallel the translated labels (civilizations.X.facts array).
    // Kept separate from the text so non-Turkish languages don't need to
    // repeat the emoji in every JSON file.
    _getChapterFactIcons(chapterId) {
        return (this._getChapterFacts(chapterId) || []).map(f => f.icon);
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
        this.currentChapter = chapter;
        this.applyChapterTheme(chapter);
        document.getElementById('level-screen-title').textContent = tChapter(chapter, 'name');

        const list = document.getElementById('level-list');
        list.innerHTML = '';

        const levels = getLevelsByChapter(chapter.id);
        const reviewNotice = this._createReviewNotice();
        if (reviewNotice) list.appendChild(reviewNotice);

        // Game mode selector
        const modeBar = document.createElement('div');
        modeBar.className = 'mode-selector';
        const modes = [
            { id: 'classic', label: t('levels.mode_classic'), icon: '\u{1F3AE}' },
            { id: 'timed',   label: t('levels.mode_timed'),   icon: '\u26A1' },
            { id: 'zen',     label: t('levels.mode_zen'),     icon: '\u{1F33F}' },
        ];
        const activeMode = storage.getGameMode();
        for (const m of modes) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mode-btn' + (m.id === activeMode ? ' active' : '');
            btn.setAttribute('aria-pressed', String(m.id === activeMode));
            btn.innerHTML = `<span class="mode-icon">${m.icon}</span><span>${m.label}</span>`;
            btn.addEventListener('click', () => {
                storage.setGameMode(m.id);
                this.showLevels(chapter);
            });
            modeBar.appendChild(btn);
        }
        // "What do these modes mean?" info button — opens an overlay that
        // explains Classic / Timed / Zen. First-time players kept asking
        // which mode to pick so this sits right next to the selector.
        const infoBtn = document.createElement('button');
        infoBtn.className = 'mode-info-btn';
        infoBtn.type = 'button';
        infoBtn.setAttribute('aria-label', t('modes.title') || 'Oyun Modları');
        infoBtn.textContent = '?';
        infoBtn.addEventListener('click', () => {
            document.getElementById('overlay-modes-info')?.classList.remove('hidden');
        });
        modeBar.appendChild(infoBtn);
        list.appendChild(modeBar);

        const summary = document.createElement('div');
        summary.className = 'level-chapter-summary';
        const completedCount = levels.filter(level => storage.isLevelCompleted(level.id)).length;
        const progressText = document.createElement('span');
        progressText.className = 'level-chapter-progress';
        progressText.textContent = text('levels.chapter_progress', '{completed}/{total} tamamlandı', {
            completed: completedCount, total: levels.length,
        });
        const chapterStars = document.createElement('span');
        chapterStars.className = 'level-chapter-stars';
        chapterStars.textContent = `★ ${storage.getChapterStars(chapter.id)}/${levels.length * 3}`;
        summary.append(progressText, chapterStars);
        list.appendChild(summary);

        const pathContainer = document.createElement('div');
        pathContainer.className = 'level-path level-journey';

        // Keep the next playable puzzle clear without a moving target or a
        // winding map: each row shows its real board and a useful status.
        const nextUpIdx = levels.findIndex((level, index) => !storage.isLevelCompleted(level.id)
            && !storage.isBossLocked(chapter.id, index + 1));

        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const completed = storage.isLevelCompleted(level.id);
            const stars = Math.max(0, Math.min(3, storage.getLevelScore(level.id)?.stars || 0));
            const isBoss = i === levels.length - 1;
            const bossLocked = storage.isBossLocked(chapter.id, i + 1);
            const nextUp = i === nextUpIdx;
            const node = document.createElement('button');
            node.type = 'button';
            node.className = 'level-node level-row' + (completed ? ' completed' : ' current')
                + (isBoss ? ' boss' : '') + (bossLocked ? ' locked-boss' : '') + (nextUp ? ' next-up' : '');
            node.dataset.levelId = level.id;
            node.setAttribute('aria-disabled', String(bossLocked));

            const preview = document.createElement('div');
            preview.className = 'level-preview';
            const thumb = document.createElement('canvas');
            thumb.className = 'level-thumb';
            thumb.width = 160;
            thumb.height = 160;
            thumb.setAttribute('aria-hidden', 'true');
            this._drawLevelThumbnail(thumb, level);
            preview.appendChild(thumb);
            const circle = document.createElement('span');
            circle.className = 'level-node-circle';
            circle.textContent = String(level.level).padStart(2, '0');
            circle.setAttribute('aria-hidden', 'true');
            preview.appendChild(circle);
            node.appendChild(preview);

            const details = document.createElement('div');
            details.className = 'level-row-details';
            const eyebrow = document.createElement('span');
            eyebrow.className = 'level-row-eyebrow';
            eyebrow.textContent = isBoss
                ? text('levels.boss', 'Final bulmacası')
                : text('levels.puzzle_number', 'Bulmaca {number}', { number: level.level });
            details.appendChild(eyebrow);
            const name = document.createElement('span');
            name.className = 'level-node-name';
            const nameKey = `puzzles.${level.id}`;
            const translatedName = t(nameKey);
            const shapeKey = `shapes.${level.shape}`;
            const translatedShape = level.shape ? t(shapeKey) : '';
            const shapeLabel = translatedShape && translatedShape !== shapeKey ? translatedShape : '';
            name.textContent = translatedName !== nameKey ? translatedName : shapeLabel || level.name;
            details.appendChild(name);
            const meta = document.createElement('span');
            meta.className = 'level-row-meta';
            meta.textContent = [
                translatedName !== nameKey && shapeLabel ? shapeLabel : tDifficulty(chapter),
                text('levels.arrows', '{count} ok', { count: level.paths.length }),
            ].filter(Boolean).join(' · ');
            details.appendChild(meta);

            const state = document.createElement('span');
            state.className = 'level-row-state';
            if (bossLocked) {
                const gate = storage.getBossGateProgress(chapter.id);
                state.classList.add('level-node-gate');
                state.textContent = `${text('levels.boss_requirement', 'İlk dört bulmacada {stars} yıldız topla', { stars: gate.required })} · ${gate.current}/${gate.required}`;
            } else {
                state.textContent = completed
                    ? text('levels.completed', 'Tamamlandı')
                    : nextUp ? text('levels.next', 'Sıradaki') : text('levels.ready', 'Oynamaya hazır');
            }
            details.appendChild(state);
            node.appendChild(details);

            const trailing = document.createElement('div');
            trailing.className = 'level-row-trailing';
            const starsEl = document.createElement('span');
            starsEl.className = 'level-node-stars';
            starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
            starsEl.setAttribute('aria-label', text('levels.star_count', '{stars}/3 yıldız', { stars }));
            trailing.appendChild(starsEl);
            const action = document.createElement('span');
            action.className = 'level-row-action';
            action.textContent = bossLocked ? '🔒' : '→';
            action.setAttribute('aria-hidden', 'true');
            trailing.appendChild(action);
            node.appendChild(trailing);

            if (!bossLocked) {
                node.addEventListener('click', () => this.onStartLevel?.(level, chapter));
            }
            pathContainer.appendChild(node);
        }

        list.appendChild(pathContainer);
        this.showScreen('levels');
    }

    _drawLevelThumbnail(canvas, level) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        const gw = level.gridWidth;
        const gh = level.gridHeight;
        const cs = Math.min((w - 20) / gw, (h - 20) / gh);
        const ox = (w - gw * cs) / 2;
        const oy = (h - gh * cs) / 2;
        // Thumbnails are drawn before they enter the DOM. Use their actual
        // display size when available, and the responsive card size otherwise.
        const displayWidth = canvas.getBoundingClientRect?.().width || (window.innerWidth <= 350 ? 58 : 68);
        const scale = displayWidth / w;
        const cellCss = cs * scale;
        const width = Math.min(1.3, Math.max(0.7, cellCss * 0.12), cellCss * 0.16) / scale;
        const headSize = Math.min(4, cellCss * 0.34) / scale;
        const surface = '#F6F0DE';
        const colors = ['#18584f', '#a44f34', '#806020'];
        // Match the original board's geometry-ranked decorative palette.
        // Preview colors never reveal a legal move or the rune sequence.
        const ranked = level.paths.map((path, index) => {
            const key = path.cells.map(([x, y]) => `${x},${y}`).join(';') + ':' + path.direction;
            let hash = 2166136261;
            for (let i = 0; i < key.length; i++) { hash ^= key.charCodeAt(i); hash = Math.imul(hash, 16777619); }
            return { index, key, hash: hash >>> 0 };
        }).sort((a, b) => a.hash - b.hash || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        const palette = new Map();
        const paletteOffset = ranked.length ? ranked[0].hash % colors.length : 0;
        ranked.forEach(({ index }, rank) => palette.set(index, colors[(rank + paletteOffset) % colors.length]));
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = surface;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(21,77,72,0.035)';
        for (const path of level.paths) {
            for (const cell of path.cells) {
                ctx.beginPath();
                ctx.arc(ox + (cell[0] + 0.5) * cs, oy + (cell[1] + 0.5) * cs, cs * 0.43, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const strokeBody = points => {
            const bends = points.filter((point, index) => {
                if (index === 0 || index === points.length - 1) return true;
                const before = points[index - 1], after = points[index + 1];
                const ax = point.x - before.x, ay = point.y - before.y;
                const bx = after.x - point.x, by = after.y - point.y;
                return Math.abs(ax * by - ay * bx) > 1e-7 || ax * bx + ay * by < 0;
            });
            ctx.beginPath();
            ctx.moveTo(bends[0].x, bends[0].y);
            for (let index = 1; index < bends.length - 1; index++) {
                const before = bends[index - 1], corner = bends[index], after = bends[index + 1];
                const inLength = Math.hypot(corner.x - before.x, corner.y - before.y);
                const outLength = Math.hypot(after.x - corner.x, after.y - corner.y);
                const radius = Math.min(cs * 0.16, 2 / scale, inLength / 2, outLength / 2);
                ctx.lineTo(corner.x - (corner.x - before.x) / inLength * radius,
                    corner.y - (corner.y - before.y) / inLength * radius);
                ctx.quadraticCurveTo(corner.x, corner.y,
                    corner.x + (after.x - corner.x) / outLength * radius,
                    corner.y + (after.y - corner.y) / outLength * radius);
            }
            ctx.lineTo(bends.at(-1).x, bends.at(-1).y);
            ctx.stroke();
        };

        for (const [index, p] of level.paths.entries()) {
            if (p.cells.length === 0) continue;
            const [dx, dy] = vectors[p.direction] || [1, 0];
            const tail = p.cells[0];
            const next = p.cells[1];
            const tailDx = next ? Math.sign(next[0] - tail[0]) : dx;
            const tailDy = next ? Math.sign(next[1] - tail[1]) : dy;
            const extension = next ? 0.42 : 0.35;
            const points = [{ x: ox + (tail[0] + 0.5 - tailDx * extension) * cs,
                y: oy + (tail[1] + 0.5 - tailDy * extension) * cs }];
            for (const [x, y] of p.cells) points.push({ x: ox + (x + 0.5) * cs, y: oy + (y + 0.5) * cs });
            const head = p.cells[p.cells.length - 1];
            const tipX = ox + (head[0] + 0.5 + dx * extension) * cs;
            const tipY = oy + (head[1] + 0.5 + dy * extension) * cs;
            points.push({ x: tipX, y: tipY });
            ctx.strokeStyle = palette.get(index);
            ctx.lineWidth = width;
            strokeBody(points);
            const spread = headSize * 0.5;
            ctx.beginPath();
            ctx.moveTo(tipX - dx * headSize - dy * spread, tipY - dy * headSize + dx * spread);
            ctx.lineTo(tipX, tipY);
            ctx.lineTo(tipX - dx * headSize + dy * spread, tipY - dy * headSize - dx * spread);
            ctx.stroke();
            if (!Number.isInteger(p.rune) || p.rune < 0 || p.rune > 3) continue;
            const x = ox + (tail[0] + 0.5) * cs, y = oy + (tail[1] + 0.5) * cs;
            const sizeCss = Math.min(6, cellCss * 0.48);
            const r = sizeCss / scale / 2;
            ctx.fillStyle = surface;
            ctx.lineWidth = Math.min(0.85, sizeCss * 0.16) / scale;
            ctx.beginPath();
            if (p.rune === 0) ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
            else {
                const vertices = p.rune === 1 ? [[0, -r], [r, 0], [0, r], [-r, 0]]
                    : p.rune === 2 ? [[0, -r], [r * 0.92, r * 0.72], [-r * 0.92, r * 0.72]]
                    : [[-r * 0.8, -r * 0.8], [r * 0.8, -r * 0.8], [r * 0.8, r * 0.8], [-r * 0.8, r * 0.8]];
                vertices.forEach(([vx, vy], vertex) => {
                    if (vertex === 0) ctx.moveTo(x + vx, y + vy);
                    else ctx.lineTo(x + vx, y + vy);
                });
                ctx.closePath();
            }
            ctx.fill();
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
        document.body.dataset.chapter = String(chapter.id);

        const levelsScreen = document.getElementById('screen-levels');
        if (levelsScreen) {
            levelsScreen.style.backgroundImage = `linear-gradient(180deg, rgba(244,247,244,0.96) 0%, rgba(244,247,244,0.9) 100%), url('${chapterImage(chapter)}')`;
            levelsScreen.style.backgroundSize = 'auto, cover';
            levelsScreen.style.backgroundPosition = 'center, center';
            levelsScreen.style.backgroundRepeat = 'no-repeat, no-repeat';
        }
    }
}
