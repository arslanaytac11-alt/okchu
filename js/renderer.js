// js/renderer.js
// Draws connected arrow paths with thick lines, turns, and arrow heads
// Supports pinch-to-zoom and pan

import { ArrowState, getDirectionVector } from './arrow.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cellSize = 40;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        // Zoom & pan
        this.scale = 1;
        this.minScale = 0.5;
        this.maxScale = 3;
        this.panX = 0;
        this.panY = 0;
        this.theme = {
            background: '#f5f0e1',
            gridDot: '#d4c5a9',
            pathIdle: '#8b7355',
            pathRemovable: '#5c3d2e',
            pathRemoving: '#c0392b',
            removedDot: '#e0d5c0',
            pathWidth: 4,
            arrowHeadSize: 8,
            hintColor: '#f1c40f'
        };
    }

    resize(gridWidth, gridHeight) {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);

        const maxCellW = (rect.width - 20) / gridWidth;
        const maxCellH = (rect.height - 20) / gridHeight;
        this.cellSize = Math.floor(Math.min(maxCellW, maxCellH, 45));

        const totalW = this.cellSize * gridWidth;
        const totalH = this.cellSize * gridHeight;
        this.gridOffsetX = (rect.width - totalW) / 2;
        this.gridOffsetY = (rect.height - totalH) / 2;

        // Auto-zoom for large grids
        if (gridWidth > 12 || gridHeight > 12) {
            this.scale = Math.min(rect.width / (totalW + 40), rect.height / (totalH + 40));
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
        // Adjust pan to zoom toward center point
        const ratio = this.scale / oldScale;
        this.panX = centerX - (centerX - this.panX) * ratio;
        this.panY = centerY - (centerY - this.panY) * ratio;
    }

    setPan(dx, dy) {
        this.panX += dx;
        this.panY += dy;
    }

    clear() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.fillStyle = this.theme.background;
        this.ctx.fillRect(0, 0, rect.width, rect.height);
    }

    drawGrid(grid) {
        this.clear();
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.scale, this.scale);

        this.drawGridDots(grid);

        // Draw removed paths first (dots)
        for (const path of grid.paths) {
            if (path.state === ArrowState.REMOVED) {
                this.drawRemovedPath(path);
            }
        }

        // Draw idle paths
        for (const path of grid.paths) {
            if (path.state === ArrowState.IDLE) {
                this.drawPath(path);
            }
        }

        // Draw removable paths (on top, slightly brighter)
        for (const path of grid.paths) {
            if (path.state === ArrowState.REMOVABLE) {
                this.drawPath(path);
            }
        }

        // Draw removing paths (red, animating)
        for (const path of grid.paths) {
            if (path.state === ArrowState.REMOVING) {
                this.drawPath(path);
            }
        }

        ctx.restore();
    }

    drawGridDots(grid) {
        const ctx = this.ctx;
        ctx.fillStyle = this.theme.gridDot;
        for (let x = 0; x <= grid.width; x++) {
            for (let y = 0; y <= grid.height; y++) {
                const px = this.gridOffsetX + x * this.cellSize;
                const py = this.gridOffsetY + y * this.cellSize;
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawRemovedPath(path) {
        const ctx = this.ctx;
        ctx.fillStyle = this.theme.removedDot;
        for (const cell of path.cells) {
            const cx = this.gridOffsetX + cell.x * this.cellSize + this.cellSize / 2;
            const cy = this.gridOffsetY + cell.y * this.cellSize + this.cellSize / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawPath(path) {
        const ctx = this.ctx;
        const cells = path.cells;
        if (cells.length === 0) return;

        let color;
        switch (path.state) {
            case ArrowState.REMOVABLE:
                color = this.theme.pathRemovable;
                break;
            case ArrowState.REMOVING:
                color = this.theme.pathRemoving;
                break;
            default:
                color = this.theme.pathIdle;
        }

        const lineWidth = this.theme.pathWidth;

        // Draw the connected path as thick lines
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';

        if (cells.length === 1) {
            // Single cell - draw a short line with arrow
            const cell = cells[0];
            const cx = this.gridOffsetX + cell.x * this.cellSize + this.cellSize / 2;
            const cy = this.gridOffsetY + cell.y * this.cellSize + this.cellSize / 2;
            const { dx, dy } = getDirectionVector(path.direction);
            const halfLen = this.cellSize * 0.35;

            ctx.beginPath();
            ctx.moveTo(cx - dx * halfLen, cy - dy * halfLen);
            ctx.lineTo(cx + dx * halfLen, cy + dy * halfLen);
            ctx.stroke();

            this.drawArrowHead(cx + dx * halfLen, cy + dy * halfLen, path.direction, color);
            return;
        }

        // Multi-cell path: draw thick connected lines from cell center to cell center
        ctx.beginPath();
        const startCx = this.gridOffsetX + cells[0].x * this.cellSize + this.cellSize / 2;
        const startCy = this.gridOffsetY + cells[0].y * this.cellSize + this.cellSize / 2;

        // Extend the start beyond the first cell center (toward the cell edge)
        if (cells.length > 1) {
            const dx0 = cells[1].x - cells[0].x;
            const dy0 = cells[1].y - cells[0].y;
            // Start from the opposite edge of first cell
            ctx.moveTo(startCx - dx0 * this.cellSize * 0.45, startCy - dy0 * this.cellSize * 0.45);
        } else {
            ctx.moveTo(startCx, startCy);
        }

        for (let i = 0; i < cells.length; i++) {
            const cx = this.gridOffsetX + cells[i].x * this.cellSize + this.cellSize / 2;
            const cy = this.gridOffsetY + cells[i].y * this.cellSize + this.cellSize / 2;
            ctx.lineTo(cx, cy);
        }

        // Extend the end toward the arrow direction
        const lastCell = cells[cells.length - 1];
        const lastCx = this.gridOffsetX + lastCell.x * this.cellSize + this.cellSize / 2;
        const lastCy = this.gridOffsetY + lastCell.y * this.cellSize + this.cellSize / 2;
        const { dx: adx, dy: ady } = getDirectionVector(path.direction);
        const endExtend = this.cellSize * 0.35;
        ctx.lineTo(lastCx + adx * endExtend, lastCy + ady * endExtend);

        ctx.stroke();

        // Draw arrow head at the end
        this.drawArrowHead(
            lastCx + adx * endExtend,
            lastCy + ady * endExtend,
            path.direction,
            color
        );

        // Draw small cap at start
        if (cells.length > 1) {
            const dx0 = cells[1].x - cells[0].x;
            const dy0 = cells[1].y - cells[0].y;
            const capX = startCx - dx0 * this.cellSize * 0.45;
            const capY = startCy - dy0 * this.cellSize * 0.45;
            ctx.fillStyle = color;
            ctx.fillRect(
                capX - lineWidth / 2 - 1,
                capY - lineWidth / 2 - 1,
                lineWidth + 2,
                lineWidth + 2
            );
        }
    }

    drawArrowHead(tipX, tipY, direction, color) {
        const ctx = this.ctx;
        const size = this.theme.arrowHeadSize;
        const { dx, dy } = getDirectionVector(direction);

        ctx.fillStyle = color;
        ctx.beginPath();

        if (dx !== 0) {
            // Horizontal arrow
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX - dx * size, tipY - size * 0.6);
            ctx.lineTo(tipX - dx * size, tipY + size * 0.6);
        } else {
            // Vertical arrow
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX - size * 0.6, tipY - dy * size);
            ctx.lineTo(tipX + size * 0.6, tipY - dy * size);
        }
        ctx.closePath();
        ctx.fill();
    }

    drawHintHighlight(path) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.scale, this.scale);

        ctx.strokeStyle = this.theme.hintColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);

        for (const cell of path.cells) {
            const cx = this.gridOffsetX + cell.x * this.cellSize + this.cellSize / 2;
            const cy = this.gridOffsetY + cell.y * this.cellSize + this.cellSize / 2;
            const r = this.cellSize * 0.4;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.restore();
    }

    // Convert screen coordinates to grid cell, accounting for zoom/pan
    getCellFromPoint(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left - this.panX) / this.scale;
        const y = (clientY - rect.top - this.panY) / this.scale;

        const gridX = Math.floor((x - this.gridOffsetX) / this.cellSize);
        const gridY = Math.floor((y - this.gridOffsetY) / this.cellSize);

        return { gridX, gridY };
    }

    setTheme(theme) {
        Object.assign(this.theme, theme);
    }
}
