// js/renderer.js
// Clean arrow renderer with variable-width arrows (5 sizes based on path length)
// Supports L-shaped, U-shaped multi-cell arrow paths

import { ArrowState, getDirectionVector } from './arrow.js';
import { ParticleSystem } from './particles.js';
import { AMBIENT_PARTICLES, SILHOUETTES, getArrowStyle, getGridStyle } from './themes.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cellSize = 40;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        this.scale = 1;
        this.minScale = 0.5;
        this.maxScale = 3;
        this.panX = 0;
        this.panY = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.animTime = 0;
        this.touchFeedback = null;
        this.ambientParticles = new ParticleSystem();
        this.burstParticles = new ParticleSystem();
        this.chapterId = 1;
        this.arrowStyle = getArrowStyle(1);
        this.gridStyle = getGridStyle();
        this._ambientTimer = 0;
        this._lastTime = 0;
        this._vignetteAlpha = 0;
        this._crackEffect = null;
        this._bgImage = null;
        this._bgImageLoaded = false;
        this._preloadedBgs = {};
        this.theme = {
            background: '#e8dcc0',
            backgroundGradient: ['#f0e4c8', '#e0d0a8'],
            gridDot: 'rgba(120,90,50,0.06)',
            arrowIdle: '#3a3028',
            arrowRemovable: '#3a3028',
            arrowRemoving: '#c04030',
            arrowRemoved: 'rgba(120,90,50,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#c04030',
            removableGlow: 'rgba(90,60,30,0.12)',
        };
    }

    // Fixed thin arrow metrics - all arrows same width, only length varies
    _getArrowMetrics() {
        const cs = this.cellSize;
        return { width: cs * 0.07, headSize: cs * 0.25, headSpread: 0.50 };
    }

    resize(gridWidth, gridHeight) {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);

        const padding = 8;
        const maxCellW = (rect.width - padding * 2) / gridWidth;
        const maxCellH = (rect.height - padding * 2) / gridHeight;
        this.cellSize = Math.floor(Math.min(maxCellW, maxCellH));

        const totalW = this.cellSize * gridWidth;
        const totalH = this.cellSize * gridHeight;
        this.gridOffsetX = (rect.width - totalW) / 2;
        this.gridOffsetY = (rect.height - totalH) / 2;

        if (gridWidth > 16 || gridHeight > 16) {
            this.scale = Math.min(rect.width / (totalW + 30), rect.height / (totalH + 30));
            if (this.scale > 1) this.scale = 1;
        } else {
            this.scale = 1;
        }
        this.panX = 0;
        this.panY = 0;
    }

    setZoom(scale, centerX, centerY) {
        const oldScale = this.scale;
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, scale));
        const ratio = this.scale / oldScale;
        this.panX = centerX - (centerX - this.panX) * ratio;
        this.panY = centerY - (centerY - this.panY) * ratio;
    }

    setPan(dx, dy) {
        this.panX += dx;
        this.panY += dy;
    }

    clear() {
        const { ctx, canvas } = this;
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);

        // Gradient background
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, this.theme.backgroundGradient?.[0] || this.theme.background);
        grad.addColorStop(1, this.theme.backgroundGradient?.[1] || this.theme.background);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    drawGrid(grid) {
        if (!grid || this.cellSize <= 0) return;
        this.clear();
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(this.panX + this.shakeX, this.panY + this.shakeY);
        ctx.scale(this.scale, this.scale);

        this.drawGridDots(grid);

        // Viewport culling bounds for performance
        const dpr = window.devicePixelRatio || 1;
        const vw = this.canvas.width / dpr;
        const vh = this.canvas.height / dpr;
        const margin = this.cellSize * 2;
        const viewLeft = (-this.panX / this.scale) - margin;
        const viewTop = (-this.panY / this.scale) - margin;
        const viewRight = viewLeft + (vw / this.scale) + margin * 2;
        const viewBottom = viewTop + (vh / this.scale) + margin * 2;

        const isVisible = (path) => {
            for (const c of path.cells) {
                const px = this.gridOffsetX + c.x * this.cellSize;
                const py = this.gridOffsetY + c.y * this.cellSize;
                if (px >= viewLeft && px <= viewRight && py >= viewTop && py <= viewBottom) return true;
            }
            return false;
        };

        // Layer order: removed -> idle/removable -> removing
        for (const path of grid.paths) {
            if (path.state === ArrowState.REMOVED && isVisible(path)) this.drawRemovedPath(path);
        }
        for (const path of grid.paths) {
            if ((path.state === ArrowState.IDLE || path.state === ArrowState.REMOVABLE) && isVisible(path)) {
                this.drawPath(path, false);
            }
        }
        for (const path of grid.paths) {
            if (path.state === ArrowState.REMOVING) this.drawPath(path, false, true);
        }

        // Particles in world space
        this.ambientParticles.draw(ctx);
        this.burstParticles.draw(ctx);

        ctx.restore();

        // Screen-space overlays
        this._drawCrackEffect();
        this._drawVignette();
    }

    drawGridDots(grid) {
        if (this.cellSize <= 0) return;
        const ctx = this.ctx;
        const gs = this.gridStyle;
        const dotColor = this.theme.gridDot;

        for (let x = 0; x <= grid.width; x++) {
            for (let y = 0; y <= grid.height; y++) {
                const px = this.gridOffsetX + x * this.cellSize;
                const py = this.gridOffsetY + y * this.cellSize;
                const isLandmark = x % gs.landmarkInterval === 0 && y % gs.landmarkInterval === 0;
                const size = isLandmark ? gs.landmarkDotSize : gs.dotSize;

                ctx.beginPath();
                ctx.arc(px, py, size / 2, 0, Math.PI * 2);
                ctx.fillStyle = dotColor;
                ctx.fill();
            }
        }

        // Faint grid lines
        ctx.strokeStyle = `rgba(120, 90, 50, ${gs.lineAlpha})`;
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= grid.width; x++) {
            const px = this.gridOffsetX + x * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(px, this.gridOffsetY);
            ctx.lineTo(px, this.gridOffsetY + grid.height * this.cellSize);
            ctx.stroke();
        }
        for (let y = 0; y <= grid.height; y++) {
            const py = this.gridOffsetY + y * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(this.gridOffsetX, py);
            ctx.lineTo(this.gridOffsetX + grid.width * this.cellSize, py);
            ctx.stroke();
        }
    }

    drawRemovedPath(path) {
        const ctx = this.ctx;
        for (const cell of path.cells) {
            ctx.fillStyle = this.theme.arrowRemoved;
            ctx.beginPath();
            ctx.arc(
                this.gridOffsetX + cell.x * this.cellSize + this.cellSize / 2,
                this.gridOffsetY + cell.y * this.cellSize + this.cellSize / 2,
                1.5, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    _cellCenter(cell) {
        return {
            x: this.gridOffsetX + cell.x * this.cellSize + this.cellSize / 2,
            y: this.gridOffsetY + cell.y * this.cellSize + this.cellSize / 2
        };
    }

    _buildPathPoints(path, metrics) {
        const cells = path.cells;
        if (cells.length === 0) return { points: [], tipX: 0, tipY: 0 };

        const points = [];
        const cs = this.cellSize;
        const headSize = metrics.headSize;

        if (cells.length === 1) {
            const c = this._cellCenter(cells[0]);
            const { dx, dy } = getDirectionVector(path.direction);
            const halfLen = cs * 0.35;
            points.push({ x: c.x - dx * halfLen, y: c.y - dy * halfLen });
            const tipX = c.x + dx * halfLen;
            const tipY = c.y + dy * halfLen;
            points.push({ x: tipX - dx * headSize * 0.6, y: tipY - dy * headSize * 0.6 });
            return { points, tipX, tipY };
        }

        // Tail extension
        const first = this._cellCenter(cells[0]);
        const second = this._cellCenter(cells[1]);
        const dx0 = Math.sign(second.x - first.x);
        const dy0 = Math.sign(second.y - first.y);
        points.push({ x: first.x - dx0 * cs * 0.42, y: first.y - dy0 * cs * 0.42 });

        // Cell centers
        for (const cell of cells) points.push(this._cellCenter(cell));

        // Head extension
        const last = this._cellCenter(cells[cells.length - 1]);
        const { dx: adx, dy: ady } = getDirectionVector(path.direction);
        const tipX = last.x + adx * cs * 0.42;
        const tipY = last.y + ady * cs * 0.42;
        points.push({ x: tipX - adx * headSize * 0.55, y: tipY - ady * headSize * 0.55 });

        return { points, tipX, tipY };
    }

    drawPath(path, isRemovable = false, isRemoving = false) {
        const ctx = this.ctx;
        if (path.cells.length === 0) return;

        // Snake animation: only draw visible cells
        if (path._snakeCellStates) {
            this._drawSnakePath(path);
            return;
        }

        const metrics = this._getArrowMetrics();
        const color = isRemoving ? (path._flashColor || this.theme.arrowRemoving) : this.theme.arrowIdle;
        const { points, tipX, tipY } = this._buildPathPoints(path, metrics);
        if (points.length < 2) return;

        // Touch press scale effect
        let touchScale = 1;
        let touchCx = 0, touchCy = 0;
        if (this.touchFeedback && this.touchFeedback.path === path) {
            const touchElapsed = performance.now() - this.touchFeedback.startTime;
            if (touchElapsed < 100) {
                const tp = touchElapsed / 100;
                touchScale = 1 + 0.05 * Math.sin(tp * Math.PI);
                // Compute centroid of path points for scale origin
                for (const pt of points) { touchCx += pt.x; touchCy += pt.y; }
                touchCx /= points.length;
                touchCy /= points.length;
            } else {
                this.touchFeedback = null;
            }
        }

        if (touchScale !== 1) {
            ctx.save();
            ctx.translate(touchCx, touchCy);
            ctx.scale(touchScale, touchScale);
            ctx.translate(-touchCx, -touchCy);
        }

        // Removable glow
        if (isRemovable) {
            ctx.strokeStyle = this.theme.removableGlow;
            ctx.lineWidth = metrics.width + 8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            this._strokePoints(ctx, points);

            // Subtle pulse glow for removable arrows
            if (this.animTime > 0) {
                const pulse = 0.5 + 0.5 * Math.sin(this.animTime / 800);
                const glowAlpha = 0.04 + pulse * 0.06;
                ctx.strokeStyle = `rgba(100,70,30,${glowAlpha})`;
                ctx.lineWidth = metrics.width + 6;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                this._strokePoints(ctx, points);
            }
        }

        // Main line with chapter-based style
        // Main line - clean solid style
        const style = this.arrowStyle;
        ctx.strokeStyle = color;
        ctx.lineWidth = style.lineWidth * this.cellSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this._strokePoints(ctx, points);

        // Arrow head
        this._drawArrowHead(ctx, tipX, tipY, path.direction, color, metrics);

        // Tail rounded cap
        const tail = points[0];
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(tail.x, tail.y, (style.lineWidth * this.cellSize) * 0.5, 0, Math.PI * 2);
        ctx.fill();

        if (touchScale !== 1) {
            ctx.restore();
        }
    }

    _drawSnakePath(path) {
        const ctx = this.ctx;
        const metrics = this._getArrowMetrics();
        const states = path._snakeCellStates;
        const color = this.theme.arrowRemoving || '#c04030';

        // Collect visible cells with their alpha
        const visibleCells = [];
        for (let i = 0; i < path.cells.length; i++) {
            if (!states[i].visible) continue;
            visibleCells.push({ cell: path.cells[i], alpha: states[i].alpha, idx: i });
        }
        if (visibleCells.length === 0) return;

        // Use min alpha of all visible cells for consistent look
        const minAlpha = Math.min(...visibleCells.map(v => v.alpha));
        ctx.globalAlpha = minAlpha;

        // Build a temporary path object with only visible cells for normal drawing
        const tempPath = {
            cells: visibleCells.map(v => v.cell),
            direction: path.direction,
            colorIndex: path.colorIndex,
            _flashColor: null,
        };

        // Draw using normal path rendering
        const { points, tipX, tipY } = this._buildPathPoints(tempPath, metrics);
        if (points.length >= 2) {
            ctx.strokeStyle = color;
            ctx.lineWidth = metrics.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            this._strokePoints(ctx, points);
            this._drawArrowHead(ctx, tipX, tipY, path.direction, color, metrics);

            // Tail cap
            const tail = points[0];
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(tail.x, tail.y, metrics.width * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    _strokePoints(ctx, points) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
    }

    _drawArrowHead(ctx, tipX, tipY, direction, color, metrics) {
        const size = metrics.headSize;
        const spread = size * metrics.headSpread;
        const { dx, dy } = getDirectionVector(direction);

        let p1, p2, p3;
        if (dx !== 0) {
            p1 = { x: tipX + dx * 1, y: tipY };
            p2 = { x: tipX - dx * size, y: tipY - spread };
            p3 = { x: tipX - dx * size, y: tipY + spread };
        } else {
            p1 = { x: tipX, y: tipY + dy * 1 };
            p2 = { x: tipX - spread, y: tipY - dy * size };
            p3 = { x: tipX + spread, y: tipY - dy * size };
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
    }

    drawGhostTrail(cells, direction, alpha) {
        if (!cells || cells.length === 0) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.scale, this.scale);

        const metrics = this._getArrowMetrics();
        // Build ghost points from original cell positions
        const ghostPath = { cells, direction };
        const { points } = this._buildPathPoints(ghostPath, metrics);

        if (points.length >= 2) {
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = this.theme.arrowIdle;
            ctx.lineWidth = metrics.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([4, 6]);
            this._strokePoints(ctx, points);
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    drawHintHighlight(path) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.scale, this.scale);

        for (const cell of path.cells) {
            const cx = this.gridOffsetX + cell.x * this.cellSize + this.cellSize / 2;
            const cy = this.gridOffsetY + cell.y * this.cellSize + this.cellSize / 2;
            ctx.strokeStyle = this.theme.hintColor;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(cx, cy, this.cellSize * 0.35, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.restore();
    }

    getCellFromPoint(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left - this.panX) / this.scale;
        const y = (clientY - rect.top - this.panY) / this.scale;
        return {
            gridX: Math.floor((x - this.gridOffsetX) / this.cellSize),
            gridY: Math.floor((y - this.gridOffsetY) / this.cellSize)
        };
    }

    setTheme(theme, chapterId) {
        Object.assign(this.theme, theme);
        this.chapterId = chapterId || 1;
        this.arrowStyle = getArrowStyle(this.chapterId);
        this.gridStyle = getGridStyle();
        this.ambientParticles.clear();
        this.burstParticles.clear();
        this._loadBgImage(this.chapterId);
        this._applyDarkMode();
    }

    _applyDarkMode() {
        if (!document.body.classList.contains('dark-mode')) return;
        this.theme.backgroundGradient = ['#1a1a2e', '#0e0e1a'];
        this.theme.background = '#121220';
        this.theme.gridDot = 'rgba(180,160,120,0.08)';
        this.theme.arrowIdle = '#c4b896';
        this.theme.arrowRemovable = '#c4b896';
        this.theme.arrowRemoving = '#e06050';
        this.theme.arrowRemoved = 'rgba(180,160,120,0.06)';
        this.theme.removableGlow = 'rgba(200,180,120,0.1)';
        this.theme.hintColor = '#c49a5c';
    }

    _loadBgImage(chapterId) {
        const names = {
            1: 'egypt', 2: 'greek', 3: 'rome', 4: 'viking', 5: 'ottoman',
            6: 'china', 7: 'maya', 8: 'india', 9: 'medieval', 10: 'final'
        };
        const name = names[chapterId];
        if (!name) return;

        // Use cached if available
        if (this._preloadedBgs[name]) {
            this._bgImage = this._preloadedBgs[name];
            this._bgImageLoaded = true;
            return;
        }

        this._bgImageLoaded = false;
        this._bgImage = null;
        const img = new Image();
        img.onload = () => {
            this._bgImage = img;
            this._bgImageLoaded = true;
            this._preloadedBgs[name] = img;
        };
        img.src = `assets/backgrounds/bg-${name}.jpg`;
    }

    tick(time) {
        const dt = this._lastTime ? (time - this._lastTime) / 1000 : 0.016;
        this._lastTime = time;
        this.animTime = time;

        this.ambientParticles.update(dt);
        this.burstParticles.update(dt);

        this._ambientTimer -= dt;
        if (this._ambientTimer <= 0) {
            this._spawnAmbientParticle();
            this._ambientTimer = 0.3 + Math.random() * 0.4;
        }
    }

    _spawnAmbientParticle() {
        let config = AMBIENT_PARTICLES[this.chapterId];
        if (!config) return;

        if (config.mixed) {
            const idx = config.cycle[Math.floor(Math.random() * config.cycle.length)];
            config = AMBIENT_PARTICLES[idx];
        }

        if (this.ambientParticles.count >= (config.count || 15)) return;

        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        let x, y;

        switch (config.spawnArea) {
            case 'top':    x = Math.random() * w; y = -10; break;
            case 'bottom': x = Math.random() * w; y = h + 10; break;
            case 'left':   x = -10; y = Math.random() * h; break;
            case 'random': x = Math.random() * w; y = Math.random() * h; break;
            default:       x = Math.random() * w; y = -10;
        }

        const vx = (Math.random() - 0.3) * (config.vx || 10);
        const vy = config.vy || 10;

        this.ambientParticles.spawn(x, y, vx, vy, {
            life: config.life || 4,
            size: config.size || 2,
            color: config.color || '#ffffff',
            gravity: config.gravity || 0,
            rotationSpeed: 1,
            shape: config.shape || 'circle',
        });
    }

    setVignetteAlpha(alpha) {
        this._vignetteAlpha = alpha;
    }

    _drawVignette() {
        if (!this._vignetteAlpha || this._vignetteAlpha <= 0) return;
        const { ctx, canvas } = this;
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
        grad.addColorStop(0, 'rgba(200, 30, 30, 0)');
        grad.addColorStop(1, `rgba(200, 30, 30, ${this._vignetteAlpha})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    showCrackEffect(cx, cy) {
        this._crackEffect = { cx, cy, start: performance.now(), duration: 300 };
    }

    _drawCrackEffect() {
        if (!this._crackEffect) return;
        const elapsed = performance.now() - this._crackEffect.start;
        if (elapsed > this._crackEffect.duration) {
            this._crackEffect = null;
            return;
        }
        const { ctx } = this;
        const alpha = 1 - elapsed / this._crackEffect.duration;
        const { cx, cy } = this._crackEffect;

        ctx.save();
        ctx.strokeStyle = `rgba(200, 40, 40, ${alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + 0.3;
            const len = 20 + Math.random() * 30;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            const midX = cx + Math.cos(angle) * len * 0.5 + (Math.random() - 0.5) * 8;
            const midY = cy + Math.sin(angle) * len * 0.5 + (Math.random() - 0.5) * 8;
            ctx.lineTo(midX, midY);
            ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            ctx.stroke();
        }
        ctx.restore();
    }
}
