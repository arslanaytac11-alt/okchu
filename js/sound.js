// js/sound.js
export class SoundManager {
    constructor() {
        this.enabled = true;
        this.ctx = null;
    }

    _ensureContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    play(name) {
        if (!this.enabled) return;
        this._ensureContext();
        const ctx = this.ctx;

        switch (name) {
            case 'tap': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 800; osc.type = 'sine';
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
                break;
            }
            case 'remove': {
                // Whoosh (filtered noise)
                const noise = ctx.createBufferSource();
                const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
                }
                noise.buffer = buffer;
                const noiseGain = ctx.createGain();
                noiseGain.gain.value = 0.06;
                noise.connect(noiseGain); noiseGain.connect(ctx.destination);
                noise.start(ctx.currentTime);
                // Ting
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 1200; osc.type = 'sine';
                gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime + 0.05); osc.stop(ctx.currentTime + 0.3);
                break;
            }
            case 'wrong': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 200; osc.type = 'square';
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
                break;
            }
            case 'complete': {
                [523, 659, 784].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.frequency.value = freq; osc.type = 'sine';
                    const t = ctx.currentTime + i * 0.15;
                    gain.gain.setValueAtTime(0.1, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                    osc.start(t); osc.stop(t + 0.4);
                });
                break;
            }
            case 'swoosh': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.04, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
                break;
            }
        }
    }
}

export const sound = new SoundManager();
