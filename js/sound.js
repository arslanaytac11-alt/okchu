// js/sound.js
export class SoundManager {
    constructor() {
        this.enabled = false; // Sounds disabled
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

    setComboLevel(level) {
        this._comboLevel = level;
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
                // Quick swoosh - short filtered noise burst
                const bufLen = ctx.sampleRate * 0.12;
                const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufLen; i++) {
                    const env = Math.pow(1 - i / bufLen, 3);
                    data[i] = (Math.random() * 2 - 1) * env;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(1500, now);
                filter.frequency.exponentialRampToValueAtTime(400, now + 0.12);
                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0.08, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(ctx.destination);
                noise.start(now);
                // Short pop tone
                const osc = ctx.createOscillator();
                const oscGain = ctx.createGain();
                osc.connect(oscGain); oscGain.connect(ctx.destination);
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
                osc.type = 'sine';
                oscGain.gain.setValueAtTime(0.06, now);
                oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
                break;
            }
            case 'wrong': {
                // Deep thud + dissonant buzz
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
                osc1.frequency.value = 80; osc1.type = 'sine';
                osc2.frequency.value = 95; osc2.type = 'sine';
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc1.start(now); osc1.stop(now + 0.35);
                osc2.start(now); osc2.stop(now + 0.35);
                break;
            }
            case 'combo': {
                // Pitch-scaled rising chime
                const comboLevel = Math.min(this._comboLevel || 2, 10);
                const baseFreq = 600 + comboLevel * 60;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);
                osc.type = 'triangle';
                gain.gain.setValueAtTime(0.08 + comboLevel * 0.01, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
                if (comboLevel >= 8) {
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.connect(gain2); gain2.connect(ctx.destination);
                    osc2.frequency.value = baseFreq * 2;
                    osc2.type = 'sine';
                    gain2.gain.setValueAtTime(0.05, now);
                    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc2.start(now); osc2.stop(now + 0.2);
                }
                break;
            }
            case 'heartbeat': {
                // Deep bass pulse for critical time
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 50;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                osc.start(now); osc.stop(now + 0.4);
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
