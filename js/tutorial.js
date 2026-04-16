// js/tutorial.js
// First-time player tutorial

const TUTORIAL_KEY = 'ok_bulmacasi_tutorial_done';

const STEPS = [
    {
        icon: '\u{1F3AF}',
        title: 'Ok Bulmacasina Hos Geldin!',
        text: 'Amacin gridde bulunan tum oklari dogru sirayla kaldirmak.',
    },
    {
        icon: '\u{1F4A1}',
        title: 'Hangi Oku Tiklayacaksin?',
        text: 'Bir ok, ucunun gosterdigi yonde yolu aciksa kaldirilabilir. Onunu baska bir ok engelliyorsa tiklanmaz!',
    },
    {
        icon: '\u{2705}',
        title: 'Dogru Hamle',
        text: 'Yolu acik bir oku tiklarsan, ok yilan gibi kayarak ekrandan cikar. Puan kazanirsin!',
    },
    {
        icon: '\u{274C}',
        title: 'Yanlis Hamle',
        text: 'Engelli bir oku tiklarsan can kaybedersin ve sureden 5 saniye duser. 3 canin var, dikkatli ol!',
    },
    {
        icon: '\u{23F1}',
        title: 'Zamana Karsi Yaris',
        text: 'Her seviyede bir sure limitin var. Dogru hamleler +3 saniye kazandirir. Sureyi iyi kullan!',
    },
    {
        icon: '\u{2B50}',
        title: 'Yildiz Topla',
        text: 'Hizli bitir ve hata yapma - 3 yildiz kazan! Yildizlar yeni bolumlerin kilidini acar.',
    },
];

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

        // Build dots
        this.dotsEl.innerHTML = '';
        for (let i = 0; i < STEPS.length; i++) {
            const dot = document.createElement('span');
            dot.className = 'tutorial-dot' + (i === 0 ? ' active' : '');
            this.dotsEl.appendChild(dot);
        }

        this._renderStep();
        this.overlay.classList.remove('hidden');
    }

    _renderStep() {
        const step = STEPS[this.currentStep];
        this.iconEl.textContent = step.icon;
        this.titleEl.textContent = step.title;
        this.textEl.textContent = step.text;

        // Update dots
        const dots = this.dotsEl.querySelectorAll('.tutorial-dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === this.currentStep));

        // Last step button text
        this.nextBtn.textContent = this.currentStep === STEPS.length - 1 ? 'Basla!' : 'Devam';
    }

    next() {
        this.currentStep++;
        if (this.currentStep >= STEPS.length) {
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
