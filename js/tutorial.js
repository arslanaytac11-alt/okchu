// js/tutorial.js
// First-time player tutorial

import { t } from './i18n.js?v=3';

const TUTORIAL_KEY = 'ok_bulmacasi_tutorial_done';

const STEPS = [{key:1, icon:'↗'}, {key:2, icon:'→'}, {key:6, icon:'✦'}];

function buildSteps() {
    return STEPS.map(({icon, key}) => ({
        key,
        icon,
        title: t(`tutorial.step${key}_title`),
        text: t(`tutorial.step${key}_text`),
    }));
}

// These small diagrams use straight connected paths so the removal order is
// unambiguous: the vertical path occupies a cell in front of the right arrow.
const SVG_START = '<svg viewBox="0 0 320 154" aria-hidden="true" focusable="false">';
const DEMO_ARROW_RIGHT = '<path d="M34 78H129" fill="none"/><path d="M116 65L131 78L116 91" fill="none"/>';
const DEMO_BLOCKER = '<path d="M191 124V30" fill="none"/><path d="M177 43L191 28L205 43" fill="none"/>';
const DEMO_GRID = '<path class="tutorial-demo-grid" d="M20 28H300M20 78H300M20 128H300M41 12V142M91 12V142M141 12V142M191 12V142M241 12V142M291 12V142"/>';

function buildDemo(key) {
    if (key === 1) {
        return SVG_START + DEMO_GRID +
            '<path class="tutorial-demo-ray" d="M148 78H295"/>' +
            '<g class="tutorial-demo-path tutorial-demo-free">' + DEMO_ARROW_RIGHT + '</g>' +
            '<circle class="tutorial-demo-tap" cx="108" cy="78" r="20"/>' +
            '</svg>';
    }
    if (key === 2) {
        const blockedRow = SVG_START + DEMO_GRID +
            '<path class="tutorial-demo-ray" d="M148 78H178"/>' +
            '<g class="tutorial-demo-path">' + DEMO_ARROW_RIGHT + '</g>' +
            '<g class="tutorial-demo-path tutorial-demo-obstacle">' + DEMO_BLOCKER + '</g>' +
            '<path class="tutorial-demo-cross" d="M154 53L165 64M165 53L154 64"/>' +
            '<text class="tutorial-demo-number" x="15" y="19">1</text></svg>';
        const clearRow = SVG_START + DEMO_GRID +
            '<path class="tutorial-demo-ray" d="M148 78H295"/>' +
            '<g class="tutorial-demo-path">' + DEMO_ARROW_RIGHT + '</g>' +
            '<path class="tutorial-demo-check" d="M174 43L182 51L199 33"/>' +
            '<text class="tutorial-demo-number" x="15" y="19">2</text></svg>';
        return '<div class="tutorial-demo-animated">' + SVG_START + DEMO_GRID +
            '<path class="tutorial-demo-ray" d="M148 78H295"/>' +
            '<g class="tutorial-demo-path tutorial-demo-waiting">' + DEMO_ARROW_RIGHT + '</g>' +
            '<g class="tutorial-demo-path tutorial-demo-obstacle tutorial-demo-blocker">' + DEMO_BLOCKER + '</g>' +
            '<path class="tutorial-demo-cross tutorial-demo-blocked-mark" d="M154 53L165 64M165 53L154 64"/>' +
            '<path class="tutorial-demo-check tutorial-demo-open-mark" d="M174 43L182 51L199 33"/>' +
            '</svg></div><div class="tutorial-demo-static">' + blockedRow + clearRow + '</div>';
    }
    return '<div class="tutorial-reward-stars" aria-hidden="true"><span>★</span><span>★</span><span>★</span></div>' +
        '<div class="tutorial-reward-path" aria-hidden="true"><span>↗</span><span>→</span><span>↑</span></div>';
}

export class Tutorial {
    constructor() {
        this.currentStep = 0;
        this.overlay = document.getElementById('overlay-tutorial');
        this.titleEl = document.getElementById('tutorial-title');
        this.textEl = document.getElementById('tutorial-text');
        this.iconEl = document.getElementById('tutorial-icon');
        this.dotsEl = document.getElementById('tutorial-dots');
        this.nextBtn = document.getElementById('btn-tutorial-next');
        this.skipBtn = document.getElementById('btn-tutorial-skip');
        this._onComplete = null;

        this.demoEl = document.createElement('figure');
        this.demoEl.className = 'tutorial-demo';
        this.demoEl.setAttribute('role', 'img');
        this.titleEl.parentElement.insertBefore(this.demoEl, this.titleEl);
        this.titleEl.parentElement.classList.add('has-demo');

        this.nextBtn.addEventListener('click', () => this.next());
        this.skipBtn.addEventListener('click', () => this.complete());
    }

    shouldShow() {
        return !localStorage.getItem(TUTORIAL_KEY);
    }

    show(onComplete) {
        if (!this.shouldShow()) {
            if (onComplete) onComplete();
            return;
        }
        this._onComplete = onComplete;
        this.currentStep = 0;
        // Rebuild from current language — user may have just picked it on first launch.
        this.steps = buildSteps();

        // Build dots
        this.dotsEl.innerHTML = '';
        for (let i = 0; i < this.steps.length; i++) {
            const dot = document.createElement('span');
            dot.className = 'tutorial-dot' + (i === 0 ? ' active' : '');
            this.dotsEl.appendChild(dot);
        }

        this.skipBtn.textContent = t('tutorial.skip');
        this._renderStep();
        this.overlay.classList.remove('hidden');
    }

    _renderStep() {
        const step = this.steps[this.currentStep];
        this.iconEl.textContent = step.icon;
        this.titleEl.textContent = step.title;
        this.textEl.textContent = step.text;
        this.demoEl.innerHTML = buildDemo(step.key);
        this.demoEl.dataset.step = String(step.key);
        this.demoEl.setAttribute('aria-label', step.text);

        // Update dots
        const dots = this.dotsEl.querySelectorAll('.tutorial-dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === this.currentStep));

        // Last step button text
        this.nextBtn.textContent = this.currentStep === this.steps.length - 1
            ? t('tutorial.start')
            : t('tutorial.next');
    }

    next() {
        this.currentStep++;
        if (this.currentStep >= this.steps.length) {
            this.complete();
        } else {
            this._renderStep();
        }
    }

    complete() {
        localStorage.setItem(TUTORIAL_KEY, 'true');
        this.overlay.classList.add('hidden');
        if (this._onComplete) this._onComplete();
    }
}
