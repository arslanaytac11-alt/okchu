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
        for (let i = 0; i < 3; i++) {
            const icon = document.createElement('div');
            icon.className = 'life-icon ' + (i < this.lives ? 'alive' : 'dead');
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
