// js/lives.js

import { storage } from './storage.js';

export class LivesManager {
    constructor() {
        this.lives = storage.getLives();
        this.timerInterval = null;
        this.onLivesChanged = null;
        this.onTimerTick = null;
    }

    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            this.lives = storage.getLives();
            if (this.onLivesChanged) this.onLivesChanged(this.lives);
            if (this.lives >= 3) {
                this.stopTimer();
            }
            if (this.onTimerTick) {
                const remaining = storage.getTimeUntilNextLife();
                this.onTimerTick(remaining);
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    loseLife() {
        this.lives = storage.loseLife();
        if (this.onLivesChanged) this.onLivesChanged(this.lives);
        if (this.lives < 3) this.startTimer();
        return this.lives;
    }

    addLife() {
        this.lives = storage.addLife();
        if (this.onLivesChanged) this.onLivesChanged(this.lives);
        return this.lives;
    }

    getCurrentLives() {
        this.lives = storage.getLives();
        return this.lives;
    }

    hasLives() {
        return this.getCurrentLives() > 0;
    }

    renderLives(container) {
        container.innerHTML = '';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-label', `${this.lives}/3`);
        for (let i = 0; i < 3; i++) {
            const icon = document.createElement('div');
            icon.className = 'life-icon ' + (i < this.lives ? 'alive' : 'dead');
            icon.setAttribute('aria-hidden', 'true');
            icon.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21S3 15.5 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-9 12-9 12Z"/></svg>';
            container.appendChild(icon);
        }
    }

    formatTime(ms) {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}
