// js/tutorial.js
// First-time player tutorial

import { t } from './i18n.js';

const TUTORIAL_KEY = 'ok_bulmacasi_tutorial_done';

const STEP_ICONS = ['\u{1F3AF}', '\u{1F4A1}', '\u{2705}', '\u{274C}', '\u{23F1}', '\u{2B50}'];

function buildSteps() {
    return STEP_ICONS.map((icon, i) => ({
        icon,
        title: t(`tutorial.step${i + 1}_title`),
        text: t(`tutorial.step${i + 1}_text`),
    }));
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
