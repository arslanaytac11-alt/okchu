// js/renderer.js

import { ArrowState } from './arrow.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cellSize = 40;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        this.theme = {
            background: '#f5f0e1',
            gridDot: '#d4c5a9',
            arrowIdle: '#7a5c3e',
            arrowRemovable: '#5c3d2e',
            arrowRemoving: '#c0392b',
            removedDot: '#e0d5c0',
            arrowLineWidth: 3,
            arrowHeadSize: 10
        };
    }

    resize(gridWidth, gridHeight) {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);

        const maxCellW = (rect.width - 40) / gridWidth;
        const maxCellH = (rect.height - 40) / gridHeight;
        this.cellSize = Math.floor(Math.min(maxCellW, maxCellH, 50));

        const totalW = this.cellSize * gridWidth;
        const totalH = this.cellSize * gridHeight;
        this.gridOffsetX = (rect.width - totalW) / 2;
        this.gridOffsetY = (rect.height - totalH) / 2;
    }

    clear() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.fillStyle = this.theme.background;
        this.ctx.fillRect(0, 0, rect.width, rect.height);
    }

    drawGrid(grid) {
        this.clear();
        this.drawGridDots(grid);
        for (const arrow of grid.arrows) {
            if (arrow.state === ArrowState.REMOVED) {
                this.drawRemovedCell(arrow);
            } else {
                this.drawArrow(arrow);
            }
        }
    }

    drawGridDots(grid) {
        const ctx = this.ctx;
        ctx.fillStyle = this.theme.gridDot;
        for (let x = 0; x <= grid.width; x++) {
            for (let y = 0; y <= grid.height; y++) {
                const px = this.gridOffsetX + x * this.cellSize;
                const py = this.gridOffsetY + y * this.cellSize;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawRemovedCell(arrow) {
        const ctx = this.ctx;
        const cx = this.gridOffsetX + arrow.x * this.cellSize + this.cellSize / 2;
        const cy = this.gridOffsetY + arrow.y * this.cellSize + this.cellSize / 2;
        ctx.fillStyle = this.theme.removedDot;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawArrow(arrow) {
        const ctx = this.ctx;
        const cx = this.gridOffsetX + arrow.x * this.cellSize + this.cellSize / 2;
        const cy = this.gridOffsetY + arrow.y * this.cellSize + this.cellSize / 2;
        const halfLen = this.cellSize * 0.45;
        const headSize = this.theme.arrowHeadSize;

        let color;
        switch (arrow.state) {
            case ArrowState.REMOVABLE:
                color = this.theme.arrowRemovable;
                break;
            case ArrowState.REMOVING:
                color = this.theme.arrowRemoving;
                break;
            default:
                color = this.theme.arrowIdle;
        }

        const { dx, dy } = arrow.getDirectionVector();
        const startX = cx - dx * halfLen;
        const startY = cy - dy * halfLen;
        const endX = cx + dx * halfLen;
        const endY = cy + dy * halfLen;

        ctx.strokeStyle = color;
        ctx.lineWidth = this.theme.arrowLineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Arrow line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = color;
        ctx.beginPath();
        if (dx !== 0) {
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - dx * headSize, endY - headSize / 2);
            ctx.lineTo(endX - dx * headSize, endY + headSize / 2);
        } else {
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - headSize / 2, endY - dy * headSize);
            ctx.lineTo(endX + headSize / 2, endY - dy * headSize);
        }
        ctx.closePath();
        ctx.fill();
    }

    getCellFromPoint(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const gridX = Math.floor((x - this.gridOffsetX) / this.cellSize);
        const gridY = Math.floor((y - this.gridOffsetY) / this.cellSize);

        return { gridX, gridY };
    }

    setTheme(theme) {
        Object.assign(this.theme, theme);
    }
}
