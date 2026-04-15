// js/renderer.js
// Clean arrow renderer with variable-width arrows (5 sizes based on path length)
// Supports L-shaped, U-shaped multi-cell arrow paths

import { ArrowState, getDirectionVector } from './arrow.js';

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

        const padding = 16;
        const maxCellW = (rect.width - padding * 2) / gridWidth;
        const maxCellH = (rect.height - padding * 2) / gridHeight;
        this.cellSize = Math.floor(Math.min(maxCellW, maxCellH, 40));

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
        const ctx = this.ctx;
        const rect = this.canvas.getBoundingClientRect();
        if (this.theme.backgroundGradient) {
            const grad = ctx.createLinearGradient(0, 0, 0, rect.height);
            grad.addColorStop(0, this.theme.backgroundGradient[0]);
            grad.addColorStop(1, this.theme.backgroundGradient[1]);
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = this.theme.background;
        }
        ctx.fillRect(0, 0, rect.width, rect.height);
    }

    drawGrid(grid) {
        this.clear();
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(this.panX + this.shakeX, this.panY + this.shakeY);
        ctx.scale(this.scale, this.scale);

        this.drawGridDots(grid);

        // Layer order: removed -> idle/removable -> removing
        // NO visual difference between idle and removable - player must figure it out
        for (const path of grid.paths) {
            if (path.state === ArrowState.REMOVED) this.drawRemovedPath(path);
        }
        for (const path of grid.paths) {
            if (path.state === ArrowState.IDLE || path.state === ArrowState.REMOVABLE) {
                this.drawPath(path, false);
            }
        }
        for (const path of grid.paths) {
            if (path.state === ArrowState.REMOVING) this.drawPath(path, false, true);
        }

        ctx.restore();
    }

    drawGridDots(grid) {
        const ctx = this.ctx;
        for (let x = 0; x <= grid.width; x++) {
            for (let y = 0; y <= grid.height; y++) {
                ctx.fillStyle = this.theme.gridDot;
                ctx.beginPath();
                ctx.arc(
                    this.gridOffsetX + x * this.cellSize,
                    this.gridOffsetY + y * this.cellSize,
                    1, 0, Math.PI * 2
                );
                ctx.fill();
            }
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

        // Main line
        ctx.strokeStyle = color;
        ctx.lineWidth = metrics.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this._strokePoints(ctx, points);

        // Arrow head
        this._drawArrowHead(ctx, tipX, tipY, path.direction, color, metrics);

        // Tail rounded cap
        const tail = points[0];
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(tail.x, tail.y, metrics.width * 0.5, 0, Math.PI * 2);
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

        for (let i = 0; i < path.cells.length; i++) {
            if (!states[i].visible) continue;
            const cell = path.cells[i];
            const cx = this.gridOffsetX + cell.x * this.cellSize + this.cellSize / 2;
            const cy = this.gridOffsetY + cell.y * this.cellSize + this.cellSize / 2;
            const alpha = states[i].alpha;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = metrics.width;
            ctx.lineCap = 'round';

            // Draw cell dot
            ctx.beginPath();
            ctx.arc(cx, cy, metrics.width * 0.6, 0, Math.PI * 2);
            ctx.fill();

            // Connect to next visible cell
            if (i < path.cells.length - 1 && states[i + 1].visible) {
                const nextCell = path.cells[i + 1];
                const nx = this.gridOffsetX + nextCell.x * this.cellSize + this.cellSize / 2;
                const ny = this.gridOffsetY + nextCell.y * this.cellSize + this.cellSize / 2;
                ctx.globalAlpha = Math.min(alpha, states[i + 1].alpha);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(nx, ny);
                ctx.stroke();
            }

            // Arrow head on last visible cell
            const isLastVisible = !states.slice(i + 1).some(s => s.visible);
            if (isLastVisible || i === path.cells.length - 1) {
                ctx.globalAlpha = alpha;
                this._drawArrowHead(ctx, cx, cy, path.direction, color, metrics);
            }
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

    setTheme(theme) {
        Object.assign(this.theme, theme);
    }

    tick(time) {
        this.animTime = time;
    }
}
