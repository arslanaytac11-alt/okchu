// js/menu-bg.js
// Animated floating arrow particles for menu background

export class MenuBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.running = false;
        this.animId = null;
        this.resize();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.w = rect.width;
        this.h = rect.height;
    }

    init(count = 18) {
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push(this._createParticle(true));
        }
    }

    _createParticle(randomY = false) {
        const directions = ['up', 'down', 'left', 'right'];
        const dir = directions[Math.floor(Math.random() * 4)];
        const size = 12 + Math.random() * 24;
        const speed = 0.15 + Math.random() * 0.35;
        const alpha = 0.03 + Math.random() * 0.07;
        const drift = (Math.random() - 0.5) * 0.2;

        return {
            x: Math.random() * this.w,
            y: randomY ? Math.random() * this.h : this.h + size,
            size,
            direction: dir,
            speed,
            alpha,
            baseAlpha: alpha,
            drift,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.005,
            pulse: Math.random() * Math.PI * 2,
            color: this._randomColor()
        };
    }

    _randomColor() {
        // Neon colors for dark theme
        const colors = [
            'rgba(0,229,255,',
            'rgba(255,45,120,',
            'rgba(0,255,65,',
            'rgba(255,255,0,',
            'rgba(255,140,0,',
            'rgba(168,85,247,',
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.init();
        this._loop();
    }

    stop() {
        this.running = false;
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }

    _loop() {
        if (!this.running) return;
        this._update();
        this._draw();
        this.animId = requestAnimationFrame(() => this._loop());
    }

    _update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.y -= p.speed;
            p.x += p.drift;
            p.rotation += p.rotSpeed;
            p.pulse += 0.02;
            p.alpha = p.baseAlpha + Math.sin(p.pulse) * 0.02;

            // Remove off-screen, replace
            if (p.y < -p.size * 2 || p.x < -p.size * 2 || p.x > this.w + p.size * 2) {
                this.particles[i] = this._createParticle(false);
                this.particles[i].y = this.h + this.particles[i].size;
                this.particles[i].x = Math.random() * this.w;
            }
        }
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        for (const p of this.particles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.alpha;
            this._drawArrowShape(ctx, p);
            ctx.restore();
        }
    }

    _drawArrowShape(ctx, p) {
        const s = p.size;
        const halfS = s / 2;
        const shaftW = s * 0.18;
        const headW = s * 0.45;
        const headL = s * 0.4;

        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.strokeStyle = p.color + (p.alpha * 1.5) + ')';
        ctx.lineWidth = 1;

        ctx.beginPath();
        // Arrow pointing up (shaft + head)
        // Shaft
        ctx.moveTo(-shaftW, halfS);
        ctx.lineTo(-shaftW, -halfS + headL);
        // Left wing
        ctx.lineTo(-headW, -halfS + headL);
        // Tip
        ctx.lineTo(0, -halfS);
        // Right wing
        ctx.lineTo(headW, -halfS + headL);
        ctx.lineTo(shaftW, -halfS + headL);
        // Shaft right
        ctx.lineTo(shaftW, halfS);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}
