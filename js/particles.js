// js/particles.js
// Reusable particle system for ambient, burst, and celebration effects

export class Particle {
    constructor(x, y, vx, vy, life, size, color, gravity, rotation, rotationSpeed, shape) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.color = color;
        this.gravity = gravity || 0;
        this.rotation = rotation || 0;
        this.rotationSpeed = rotationSpeed || 0;
        this.shape = shape || 'circle';
        this.alpha = 1;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.rotation += this.rotationSpeed * dt;
        this.life -= dt;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }

    get dead() {
        return this.life <= 0;
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this._pool = [];
    }

    _getParticle(x, y, vx, vy, life, size, color, gravity, rotation, rotationSpeed, shape) {
        let p = this._pool.pop();
        if (p) {
            p.x = x; p.y = y; p.vx = vx; p.vy = vy;
            p.life = life; p.maxLife = life; p.size = size;
            p.color = color; p.gravity = gravity || 0;
            p.rotation = rotation || 0;
            p.rotationSpeed = rotationSpeed || 0;
            p.shape = shape || 'circle'; p.alpha = 1;
            return p;
        }
        return new Particle(x, y, vx, vy, life, size, color, gravity, rotation, rotationSpeed, shape);
    }

    burst(x, y, count, config) {
        const {
            speed = 100, spread = Math.PI * 2, angle = 0,
            life = 0.6, lifeVar = 0.2,
            size = 3, sizeVar = 1,
            color = '#ffffff', colors = null,
            gravity = 80, rotationSpeed = 2,
            shape = 'circle',
        } = config;

        // Performance: cap total particles at 200
        const maxSpawn = Math.min(count, 200 - this.particles.length);
        for (let i = 0; i < maxSpawn; i++) {
            const a = angle + (Math.random() - 0.5) * spread;
            const s = speed * (0.5 + Math.random() * 0.5);
            const c = colors ? colors[Math.floor(Math.random() * colors.length)] : color;
            const p = this._getParticle(
                x, y,
                Math.cos(a) * s, Math.sin(a) * s,
                life + (Math.random() - 0.5) * lifeVar,
                size + (Math.random() - 0.5) * sizeVar,
                c, gravity,
                Math.random() * Math.PI * 2,
                (Math.random() - 0.5) * rotationSpeed,
                shape
            );
            this.particles.push(p);
        }
    }

    spawn(x, y, vx, vy, config) {
        const {
            life = 3, size = 2, color = '#ffffff',
            gravity = 0, rotationSpeed = 0.5, shape = 'circle',
        } = config;
        const p = this._getParticle(
            x, y, vx, vy, life, size, color,
            gravity, Math.random() * Math.PI * 2,
            (Math.random() - 0.5) * rotationSpeed, shape
        );
        this.particles.push(p);
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].dead) {
                this._pool.push(this.particles[i]);
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;

            switch (p.shape) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'square':
                    ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
                    break;
                case 'leaf':
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.6, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'flake':
                    ctx.lineWidth = p.size * 0.3;
                    ctx.strokeStyle = p.color;
                    for (let j = 0; j < 6; j++) {
                        const a = (j / 6) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
                        ctx.stroke();
                    }
                    break;
                case 'spark':
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.size * 2, p.size * 0.4, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'petal':
                    ctx.beginPath();
                    ctx.moveTo(0, -p.size);
                    ctx.quadraticCurveTo(p.size, 0, 0, p.size);
                    ctx.quadraticCurveTo(-p.size, 0, 0, -p.size);
                    ctx.fill();
                    break;
            }
            ctx.restore();
        }
    }

    clear() {
        this._pool.push(...this.particles);
        this.particles.length = 0;
    }

    get count() {
        return this.particles.length;
    }
}
