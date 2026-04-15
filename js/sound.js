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

        const now = ctx.currentTime;

        switch (name) {
            case 'tap': {
                // Short percussive click
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 1000; osc.type = 'sine';
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now); osc.stop(now + 0.05);
                break;
            }
            case 'remove': {
                // Swoosh: descending filtered noise + rising confirmation tone
                const bufLen = ctx.sampleRate * 0.25;
                const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufLen; i++) {
                    const env = Math.pow(1 - i / bufLen, 1.5);
                    data[i] = (Math.random() * 2 - 1) * env * 0.5;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(2000, now);
                filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);
                filter.Q.value = 2;
                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0.15, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(ctx.destination);
                noise.start(now);
                // Rising tone
                const osc = ctx.createOscillator();
                const oscGain = ctx.createGain();
                osc.connect(oscGain); oscGain.connect(ctx.destination);
                osc.frequency.setValueAtTime(600, now + 0.05);
                osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);
                osc.type = 'sine';
                oscGain.gain.setValueAtTime(0.08, now + 0.05);
                oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now + 0.05); osc.stop(now + 0.3);
                break;
            }
            case 'wrong': {
                // Low thud + dissonant buzz
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
                osc1.frequency.value = 120; osc1.type = 'sine';
                osc2.frequency.value = 135; osc2.type = 'sine';
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc1.start(now); osc1.stop(now + 0.3);
                osc2.start(now); osc2.stop(now + 0.3);
                break;
            }
            case 'combo': {
                // Rising chime
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
                osc.type = 'triangle';
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
                break;
            }
            case 'complete': {
                // Triumphant fanfare
                [523, 659, 784, 1047].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.frequency.value = freq;
                    osc.type = i < 2 ? 'sine' : 'triangle';
                    const t = now + i * 0.12;
                    gain.gain.setValueAtTime(0.12, t);
                    gain.gain.setValueAtTime(0.12, t + 0.15);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                    osc.start(t); osc.stop(t + 0.5);
                });
                break;
            }
        }
    }
}

export const sound = new SoundManager();
