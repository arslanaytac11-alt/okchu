// js/renderer.js
// Clean, legible arrow paths over a quiet board.
// Connected silhouettes, anchored zoom, and Reduce Motion support.

import { ArrowState, getDirectionVector } from './arrow.js';
import { ParticleSystem } from './particles.js';
import { getArrowStyle, getGridStyle } from './themes.js';
import { BOARD_VISUALS } from './balance.js?v=4';
import { silhouetteCells } from './puzzle-catalog.js';
import { createArrowRoute, sampleArrowMotion, arrowColorVariant, ARROW_COLORS, ARROW_DARK_COLORS, ARROW_ERROR_COLOR, ARROW_DARK_ERROR_COLOR } from './arrow-motion.js?v=3';
import { buildBoardOutline } from './board-outline.js';

const boardShapeCache = new Map();
const boardOutlineCache = new Map();

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cellSize = 40;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        this.scale = 1;
        this.minScale = 0.5;
        this.maxScale = 5;
        this.panX = 0;
        this.panY = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.animTime = 0;
        this.touchFeedback = null;
        // Predictive selection halo: stays visible from touchstart until
        // touchend (or pan/animation cancellation). Lets the player SEE which
        // arrow will fire BEFORE they lift their finger so they can correct
        // aim if it landed on the wrong one. Cleared by game.js on touchend.
        this.previewPath = null;
        this.blockedFeedback = null;
        this._boardShapeRuns = [];
        this._boardOutlines = [];
        this._boardShapeBounds = null;
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
        this._motionQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
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

    // Ink weight is measured on screen, so sparse boards and zoom never
    // turn a fine path into an oversized pipe. Dense overviews stay bounded
    // by their logical cells without shrinking the touch target.
    _getArrowMetrics() {
        const scale = Math.max(0.01, this.scale);
        const cellCss = this.cellSize * scale;
        const widthCss = Math.min(BOARD_VISUALS.arrowStrokeCss,
            Math.max(BOARD_VISUALS.minimumStroke, cellCss * BOARD_VISUALS.idealStrokeRatio),
            cellCss * BOARD_VISUALS.maximumStrokeRatio);
        const headCss = Math.min(BOARD_VISUALS.headSizeCss, cellCss * BOARD_VISUALS.headRatio);
        return { width: widthCss / scale, headSize: headCss / scale,
            headSpread: BOARD_VISUALS.headSpread, widthCss, headCss };
    }

    get reducedMotion() { return this._motionQuery?.matches || false; }
    get errorColor() { return this.theme.background === BOARD_VISUALS.darkBackground ? ARROW_DARK_ERROR_COLOR : ARROW_ERROR_COLOR; }

    showBlockedFeedback(path, blocker, duration = 900) {
        this.blockedFeedback = blocker ? { path, blocker, expiresAt: performance.now() + duration } : null;
    }

    clearBlockedFeedback() { this.blockedFeedback = null; }

    getBlockedFeedbackGeometry(now = performance.now()) {
        const cue = this.blockedFeedback;
        if (!cue || now >= cue.expiresAt || cue.path.isRemoved() || cue.path.state === ArrowState.REMOVING ||
            cue.blocker.path?.isRemoved() || cue.blocker.path?.state === ArrowState.REMOVING) return null;
        const head = cue.path.getHead(), { dx, dy } = getDirectionVector(cue.path.direction);
        // Both endpoints stay in grid units. Zoom/resize only projects them;
        // the ray stops at the first occupied cell, before entering its body.
        return {
            start: { x: head.x + 0.5 + dx * 0.44, y: head.y + 0.5 + dy * 0.44 },
            end: { x: cue.blocker.x + 0.5 - dx * 0.44, y: cue.blocker.y + 0.5 - dy * 0.44 },
            cell: { x: cue.blocker.x, y: cue.blocker.y },
            type: cue.blocker.type,
        };
    }

    drawBlockedFeedback() {
        const geometry = this.getBlockedFeedbackGeometry();
        if (!geometry) return;
        const ctx = this.ctx, cs = this.cellSize;
        const project = point => ({ x: this.gridOffsetX + point.x * cs, y: this.gridOffsetY + point.y * cs });
        const start = project(geometry.start), end = project(geometry.end);
        ctx.save();
        ctx.strokeStyle = this.errorColor;
        ctx.lineWidth = 1.6 / this.scale;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.9;
        ctx.setLineDash([3 / this.scale, 4 / this.scale]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Outline the exact colliding cell without recoloring its arrow or
        // highlighting an unrelated solution. No pulse, shake, or particles.
        const padding = cs * 0.07;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.roundRect(this.gridOffsetX + geometry.cell.x * cs + padding,
            this.gridOffsetY + geometry.cell.y * cs + padding, cs - padding * 2,
            cs - padding * 2, cs * 0.18);
        ctx.stroke();
        ctx.restore();
    }

    setBoardShape(shape, width, height, boardCells = null) {
        this._boardShapeRuns = [];
        this._boardOutlines = [];
        this._boardShapeBounds = null;
        if (!shape && !boardCells?.length) return;
        const authoredCells = Array.isArray(boardCells) && boardCells.length ?
            boardCells.slice().sort((a,b)=>a[1]-b[1]||a[0]-b[0]) : null;
        const cacheKey = authoredCells ? `cells:${width}:${height}:${authoredCells.map(cell=>cell.join(',')).join(';')}` : `${shape}:${width}:${height}`;
        if (!boardShapeCache.has(cacheKey)) {
            try {
                const rows = new Map();
                const cells = authoredCells || silhouetteCells(shape, width, height);
                boardOutlineCache.set(cacheKey, buildBoardOutline(cells));
                for (const [x, y] of cells) {
                    if (!rows.has(y)) rows.set(y, []);
                    rows.get(y).push(x);
                }
                const runs = [];
                for (const [y, xs] of rows) {
                    let start = xs[0], last = start;
                    for (const x of xs.slice(1)) {
                        if (x !== last + 1) { runs.push([start,y,last-start+1]); start = x; }
                        last = x;
                    }
                    runs.push([start,y,last-start+1]);
                }
                boardShapeCache.set(cacheKey, runs);
            } catch { return; } // Decoration never blocks a custom level.
        }
        this._boardShapeRuns = boardShapeCache.get(cacheKey);
        this._boardOutlines = boardOutlineCache.get(cacheKey) || [];
        if (this._boardShapeRuns.length) {
            this._boardShapeBounds = {
                left: Math.min(...this._boardShapeRuns.map(([x]) => x)),
                top: Math.min(...this._boardShapeRuns.map(([,y]) => y)),
                right: Math.max(...this._boardShapeRuns.map(([x,,length]) => x + length)),
                bottom: Math.max(...this._boardShapeRuns.map(([,y]) => y + 1)),
            };
        }
    }

    drawBoardShape() {
        if (!this._boardOutlines.length) return;
        const ctx = this.ctx, cs = this.cellSize;
        const dark = this.theme.background === BOARD_VISUALS.darkBackground;
        ctx.save();
        const bounds = this._boardShapeBounds;
        const surface = ctx.createLinearGradient(0, this.gridOffsetY + bounds.top * cs, 0, this.gridOffsetY + bounds.bottom * cs);
        const surfaceColors = dark ? BOARD_VISUALS.boardSurfaceDark : BOARD_VISUALS.boardSurfaceLight;
        surface.addColorStop(0, surfaceColors[0]);
        surface.addColorStop(1, surfaceColors[1]);
        ctx.fillStyle = surface;
        // The silhouette is a quiet paper impression, not a row of raised
        // stone cells. No ledge, border or shadow competes with the ink.
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.beginPath();
        for (const closedLoop of this._boardOutlines) {
            const loop = closedLoop.slice(0,-1).map(p => ({x:this.gridOffsetX+p.x*cs,y:this.gridOffsetY+p.y*cs}));
            const corners = loop.map((corner,i) => {
                const previous = loop[(i+loop.length-1)%loop.length], next=loop[(i+1)%loop.length];
                const before = Math.hypot(corner.x-previous.x,corner.y-previous.y);
                const after = Math.hypot(next.x-corner.x,next.y-corner.y);
                const r = Math.min(cs*0.14,before*0.25,after*0.25);
                return {corner,enter:{x:corner.x-(corner.x-previous.x)/before*r,y:corner.y-(corner.y-previous.y)/before*r},exit:{x:corner.x+(next.x-corner.x)/after*r,y:corner.y+(next.y-corner.y)/after*r}};
            });
            if (!corners.length) continue;
            ctx.moveTo(corners[0].enter.x,corners[0].enter.y);
            for (const {corner,enter,exit} of corners) {
                ctx.lineTo(enter.x,enter.y);
                ctx.quadraticCurveTo(corner.x,corner.y,exit.x,exit.y);
            }
            ctx.closePath();
        }
        ctx.fill('evenodd');
        ctx.restore();
    }

    resize(gridWidth, gridHeight, { preserveView = false } = {}) {
        const old = preserveView && this._gridWidth === gridWidth && this._gridHeight === gridHeight && this._cssWidth && this._cssHeight ? {
            scale: this.scale,
            fx: ((this._cssWidth / 2 - this.panX) / this.scale - this.gridOffsetX) / this.cellSize,
            fy: ((this._cssHeight / 2 - this.panY) / this.scale - this.gridOffsetY) / this.cellSize,
        } : null;
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const parentRect = this.canvas.parentElement?.classList?.contains('board-area') ? this.canvas.parentElement.getBoundingClientRect() : null;
        this._cssWidth = Math.max(1, parentRect?.width || this.canvas.clientWidth || rect.width);
        this._cssHeight = Math.max(1, parentRect?.height || this.canvas.clientHeight || rect.height);
        this._gridWidth = gridWidth;
        this._gridHeight = gridHeight;
        this.canvas.width = Math.round(this._cssWidth * dpr);
        this.canvas.height = Math.round(this._cssHeight * dpr);
        this.ctx.scale(dpr, dpr);

        // Fit the complete original silhouette, not empty outer grid rows.
        // Keep this footprint fixed as arrows leave to avoid a jumping board.
        const bounds = this._boardShapeBounds || { left:0, top:0, right:gridWidth, bottom:gridHeight };
        const fitWidth = bounds.right - bounds.left;
        const fitHeight = bounds.bottom - bounds.top;
        const padding = Math.max(20, BOARD_VISUALS.boardPadding);
        const maxCellW = (this._cssWidth - padding * 2) / fitWidth;
        const maxCellH = (this._cssHeight - padding * 2) / fitHeight;
        this.cellSize = Math.max(1, Math.floor(Math.min(maxCellW, maxCellH)));

        this.gridOffsetX = this._cssWidth / 2 - (bounds.left + bounds.right) / 2 * this.cellSize;
        this.gridOffsetY = this._cssHeight / 2 - (bounds.top + bounds.bottom) / 2 * this.cellSize;

        this.scale = old?.scale || 1;
        this.panX = old ? this._cssWidth / 2 - (this.gridOffsetX + old.fx * this.cellSize) * this.scale : 0;
        this.panY = old ? this._cssHeight / 2 - (this.gridOffsetY + old.fy * this.cellSize) * this.scale : 0;
        this._clampPan();
    }

    // Convert a client (viewport) point to canvas-local (CSS pixel) coords.
    // Use this for anchoring zoom so the point under the fingers stays put.
    _clientToCanvas(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (this._cssWidth || rect.width) / rect.width,
            y: (clientY - rect.top) * (this._cssHeight || rect.height) / rect.height
        };
    }

    setZoom(scale, clientX, clientY) {
        const { x: cx, y: cy } = this._clientToCanvas(clientX, clientY);
        const oldScale = this.scale;
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, scale));
        const ratio = this.scale / oldScale;
        this.panX = cx - (cx - this.panX) * ratio;
        this.panY = cy - (cy - this.panY) * ratio;
        this._clampPan();
    }

    setPan(dx, dy) {
        const rect = this.canvas.getBoundingClientRect();
        this.panX += dx * (this._cssWidth || rect.width) / rect.width;
        this.panY += dy * (this._cssHeight || rect.height) / rect.height;
        this._clampPan();
    }

    getVisibleGridBounds() {
        return {
            left: (-this.panX / this.scale - this.gridOffsetX) / this.cellSize,
            top: (-this.panY / this.scale - this.gridOffsetY) / this.cellSize,
            right: ((this._cssWidth - this.panX) / this.scale - this.gridOffsetX) / this.cellSize,
            bottom: ((this._cssHeight - this.panY) / this.scale - this.gridOffsetY) / this.cellSize,
        };
    }

    // Keep the grid on-screen: at least half the canvas worth of grid must
    // remain visible so users can never lose the board off the edge.
    _clampPan() {
        const rect = this.canvas.getBoundingClientRect();
        const width = this._cssWidth || rect.width;
        const height = this._cssHeight || rect.height;
        const margin = Math.min(width, height) / 3;
        const bounds = this._boardShapeBounds || {left:0,top:0,right:this._gridWidth||1,bottom:this._gridHeight||1};
        const left = (this.gridOffsetX + bounds.left * this.cellSize) * this.scale;
        const right = (this.gridOffsetX + bounds.right * this.cellSize) * this.scale;
        const top = (this.gridOffsetY + bounds.top * this.cellSize) * this.scale;
        const bottom = (this.gridOffsetY + bounds.bottom * this.cellSize) * this.scale;
        // Clamp the rendered content, rather than an unscaled viewport-sized
        // translation. Every edge of a magnified board must remain reachable.
        this.panX = Math.max(margin - right, Math.min(width - margin - left, this.panX));
        this.panY = Math.max(margin - bottom, Math.min(height - margin - top, this.panY));
    }

    // Reset zoom + pan to the initial fit-to-screen view.
    resetView(grid) {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        if (grid) this.resize(grid.width, grid.height);
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

        this.drawBoardShape();
        this.drawWalls(grid);

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

        this.drawBlockedFeedback();

        // Particles in world space
        if (!this.reducedMotion) this.burstParticles.draw(ctx);

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

        // Viewport bounds in world coordinates — skip dots that are off-screen.
        // Important for large grids (20x20+) where dot count grows quadratically.
        const dpr = window.devicePixelRatio || 1;
        const vw = this.canvas.width / dpr;
        const vh = this.canvas.height / dpr;
        const viewLeft = (-this.panX / this.scale) - this.cellSize;
        const viewTop = (-this.panY / this.scale) - this.cellSize;
        const viewRight = viewLeft + (vw / this.scale) + this.cellSize * 2;
        const viewBottom = viewTop + (vh / this.scale) + this.cellSize * 2;

        const minX = Math.max(0, Math.floor((viewLeft - this.gridOffsetX) / this.cellSize));
        const maxX = Math.min(grid.width, Math.ceil((viewRight - this.gridOffsetX) / this.cellSize));
        const minY = Math.max(0, Math.floor((viewTop - this.gridOffsetY) / this.cellSize));
        const maxY = Math.min(grid.height, Math.ceil((viewBottom - this.gridOffsetY) / this.cellSize));

        ctx.fillStyle = dotColor;
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const px = this.gridOffsetX + x * this.cellSize;
                const py = this.gridOffsetY + y * this.cellSize;
                const isLandmark = x % gs.landmarkInterval === 0 && y % gs.landmarkInterval === 0;
                const size = isLandmark ? gs.landmarkDotSize : gs.dotSize;

                ctx.beginPath();
                ctx.arc(px, py, size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Faint grid lines — also clipped to visible range
        ctx.strokeStyle = `rgba(120, 90, 50, ${gs.lineAlpha})`;
        ctx.lineWidth = 0.5;
        const lineTop = this.gridOffsetY + minY * this.cellSize;
        const lineBottom = this.gridOffsetY + maxY * this.cellSize;
        for (let x = minX; x <= maxX; x++) {
            const px = this.gridOffsetX + x * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(px, lineTop);
            ctx.lineTo(px, lineBottom);
            ctx.stroke();
        }
        const lineLeft = this.gridOffsetX + minX * this.cellSize;
        const lineRight = this.gridOffsetX + maxX * this.cellSize;
        for (let y = minY; y <= maxY; y++) {
            const py = this.gridOffsetY + y * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(lineLeft, py);
            ctx.lineTo(lineRight, py);
            ctx.stroke();
        }
    }

    drawWalls(grid) {
        if (!grid.walls || grid.walls.length === 0) return;
        const ctx = this.ctx;
        const cs = this.cellSize;
        const pad = Math.max(2, cs * 0.08);
        for (const [wx, wy] of grid.walls) {
            const px = this.gridOffsetX + wx * cs + pad;
            const py = this.gridOffsetY + wy * cs + pad;
            const sz = cs - pad * 2;
            // Stone block: warm gray gradient with brick outlining
            const grad = ctx.createLinearGradient(px, py, px, py + sz);
            grad.addColorStop(0, '#6e6357');
            grad.addColorStop(1, '#47403a');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(px, py, sz, sz, Math.max(3, cs * 0.1));
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = Math.max(1, cs * 0.04);
            ctx.stroke();
            // Inner highlight
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = Math.max(1, cs * 0.03);
            ctx.beginPath();
            ctx.roundRect(px + pad * 0.5, py + pad * 0.5, sz - pad, sz - pad, Math.max(2, cs * 0.08));
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
        if (!path.cells.length) return { points: [], tipX: 0, tipY: 0 };
        const geometry = path._visualGeometry || sampleArrowMotion(createArrowRoute(path.cells, path.direction));
        const project = point => ({
            x: this.gridOffsetX + point.x * this.cellSize,
            y: this.gridOffsetY + point.y * this.cellSize,
        });
        const tip = project(geometry.tip);
        // Open chevrons meet the complete shaft at the real tip. Idle and
        // departing arrows use this identical zero-inset construction.
        return { points: geometry.points.map(project), tipX: tip.x, tipY: tip.y };
    }

    _getRuneGeometry(path) {
        if (!Number.isInteger(path.rune) || path.rune < 0 || path.rune > 3 || !path.cells.length) return null;
        const geometry = path._visualGeometry || sampleArrowMotion(createArrowRoute(path.cells, path.direction));
        // The route starts just before its first cell. Keep the symbol at
        // the tail cell's center, then carry that same arc-length offset
        // along the moving window, including when its tail passes a bend.
        let remaining = path.cells.length === 1 ? 0.35 : 0.42;
        let anchor = geometry.points[geometry.points.length - 1];
        for (let index = 1; index < geometry.points.length; index++) {
            const before = geometry.points[index - 1], after = geometry.points[index];
            const length = Math.hypot(after.x - before.x, after.y - before.y);
            if (remaining <= length) {
                const fraction = length ? remaining / length : 0;
                anchor = { x: before.x + (after.x - before.x) * fraction,
                    y: before.y + (after.y - before.y) * fraction };
                break;
            }
            remaining -= length;
        }
        const scale = Math.max(0.01, this.scale);
        const sizeCss = Math.min(BOARD_VISUALS.runeSizeCss, this.cellSize * scale * BOARD_VISUALS.runeSizeRatio);
        return { rune: path.rune, x: this.gridOffsetX + anchor.x * this.cellSize,
            y: this.gridOffsetY + anchor.y * this.cellSize, gridY: anchor.y,
            size: sizeCss / scale, width: Math.min(BOARD_VISUALS.runeStrokeCss, sizeCss * 0.16) / scale };
    }

    _getBoardSurfaceColor(gridY) {
        const dark = this.theme.background === BOARD_VISUALS.darkBackground;
        if (!this._boardShapeBounds) return this.theme.background;
        const colors = dark ? BOARD_VISUALS.boardSurfaceDark : BOARD_VISUALS.boardSurfaceLight;
        const bounds = this._boardShapeBounds;
        const fraction = Math.max(0, Math.min(1, (gridY - bounds.top) / (bounds.bottom - bounds.top || 1)));
        const rgb = color => color.slice(1).match(/../g).map(value => parseInt(value, 16));
        const first = rgb(colors[0]), last = rgb(colors[1]);
        return '#' + first.map((value, index) => Math.round(value + (last[index] - value) * fraction)
            .toString(16).padStart(2, '0')).join('');
    }

    _drawRuneMarker(path, color) {
        const glyph = this._getRuneGeometry(path);
        if (!glyph) return;
        const ctx = this.ctx, r = glyph.size / 2;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = this._getBoardSurfaceColor(glyph.gridY);
        ctx.lineWidth = glyph.width;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (glyph.rune === 0) {
            ctx.arc(glyph.x, glyph.y, r * 0.9, 0, Math.PI * 2);
        } else {
            const vertices = glyph.rune === 1 ? [[0, -r], [r, 0], [0, r], [-r, 0]]
                : glyph.rune === 2 ? [[0, -r], [r * 0.92, r * 0.72], [-r * 0.92, r * 0.72]]
                : [[-r * 0.8, -r * 0.8], [r * 0.8, -r * 0.8], [r * 0.8, r * 0.8], [-r * 0.8, r * 0.8]];
            vertices.forEach(([x, y], index) => {
                if (index === 0) ctx.moveTo(glyph.x + x, glyph.y + y);
                else ctx.lineTo(glyph.x + x, glyph.y + y);
            });
            ctx.closePath();
        }
        // A matte interior keeps the four silhouettes distinct where the
        // arrow shaft crosses their centers. It matches the board surface.
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    _getPathColor(path) {
        const colors = this.theme.background === BOARD_VISUALS.darkBackground ? ARROW_DARK_COLORS : ARROW_COLORS;
        return path._flashColor || colors[arrowColorVariant(path)];
    }

    drawPath(path) {
        const ctx = this.ctx;
        if (!path.cells.length) return;
        const metrics = this._getArrowMetrics();
        const color = this._getPathColor(path);
        const { points, tipX, tipY } = this._buildPathPoints(path, metrics);
        if (points.length < 2) return;

        ctx.save();
        ctx.globalAlpha = path._visualGeometry?.alpha ?? 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = metrics.width;
        this._strokePoints(ctx, points);
        this._drawArrowHead(ctx, tipX, tipY, path.direction, color, metrics);
        this._drawRuneMarker(path, color);
        ctx.restore();
    }

    _strokePoints(ctx, points) {
        if (points.length < 2) return;
        // Ignore collinear cell centers so each elbow gets one smooth curve.
        const bends = points.filter((point, i) => {
            if (i === 0 || i === points.length - 1) return true;
            const previous = points[i - 1], next = points[i + 1];
            const ax = point.x - previous.x, ay = point.y - previous.y;
            const bx = next.x - point.x, by = next.y - point.y;
            return Math.abs(ax * by - ay * bx) > 1e-7 || ax * bx + ay * by < 0;
        });
        const radius = Math.min(this.cellSize * BOARD_VISUALS.bendRadiusRatio,
            BOARD_VISUALS.bendRadiusCss / Math.max(0.01, this.scale));
        ctx.beginPath();
        ctx.moveTo(bends[0].x, bends[0].y);
        for (let i = 1; i < bends.length - 1; i++) {
            const before = bends[i - 1], corner = bends[i], after = bends[i + 1];
            const inLength = Math.hypot(corner.x - before.x, corner.y - before.y);
            const outLength = Math.hypot(after.x - corner.x, after.y - corner.y);
            const r = Math.min(radius, inLength / 2, outLength / 2);
            const enter = { x: corner.x - (corner.x - before.x) / inLength * r, y: corner.y - (corner.y - before.y) / inLength * r };
            const leave = { x: corner.x + (after.x - corner.x) / outLength * r, y: corner.y + (after.y - corner.y) / outLength * r };
            ctx.lineTo(enter.x, enter.y);
            ctx.quadraticCurveTo(corner.x, corner.y, leave.x, leave.y);
        }
        const end = bends[bends.length - 1];
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }

    _drawArrowHead(ctx, tipX, tipY, direction, color, metrics) {
        const size = metrics.headSize;
        const spread = size * metrics.headSpread;
        const { dx, dy } = getDirectionVector(direction);
        const baseX = tipX - dx * size, baseY = tipY - dy * size;
        ctx.strokeStyle = color;
        ctx.lineWidth = metrics.width;
        ctx.beginPath();
        ctx.moveTo(baseX - dy * spread, baseY + dx * spread);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(baseX + dy * spread, baseY - dx * spread);
        ctx.stroke();
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
        this.drawPreviewHalo(path);
    }

    // Predictive selection halo. Drawn under the player's finger from
    // touchstart until touchend so they can SEE the arrow that will fire
    // and slide their finger to a different one if it landed wrong.
    // Selection keeps the same fine silhouette and uses a restrained accent.
    drawPreviewHalo(path) {
        if (!path || !path.cells || path.cells.length === 0) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.panX + this.shakeX, this.panY + this.shakeY);
        ctx.scale(this.scale, this.scale);
        const metrics = this._getArrowMetrics();
        const color = this.theme.background === BOARD_VISUALS.darkBackground ? BOARD_VISUALS.darkSelected : BOARD_VISUALS.selected;
        const selectedWidth = Math.min(this.cellSize * BOARD_VISUALS.maximumStrokeRatio,
            metrics.width + BOARD_VISUALS.selectedStrokeExtraCss / Math.max(0.01, this.scale));
        const selectedMetrics = { ...metrics, width: selectedWidth };
        const { points, tipX, tipY } = this._buildPathPoints(path, metrics);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = selectedWidth;
        this._strokePoints(ctx, points);
        this._drawArrowHead(ctx, tipX, tipY, path.direction, color, selectedMetrics);
        this._drawRuneMarker(path, color);
        ctx.restore();
    }

    // A quiet ring guides the first taps without hiding the arrow head.
    // Board coordinates keep it anchored through pinch zoom and panning.
    drawOnboardingPointer(path) {
        if (!path || !path.cells || path.cells.length === 0) return;
        const ctx = this.ctx;
        const head = path.cells[path.cells.length - 1];
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.scale, this.scale);
        const cx = this.gridOffsetX + head.x * this.cellSize + this.cellSize / 2;
        const cy = this.gridOffsetY + head.y * this.cellSize + this.cellSize / 2;
        // Pulse: 600 ms cycle, 0.85x..1.15x scale.
        const phase = (performance.now() % 600) / 600;
        const pulse = this.reducedMotion ? 1 : 0.92 + 0.16 * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
        const ring = this.cellSize * 0.55 * pulse;
        // Keep the arrow head visible: a quiet ring carries the cue.
        ctx.strokeStyle = BOARD_VISUALS.accent;
        ctx.lineWidth = Math.min(this.cellSize * 0.06, 2 / this.scale);
        ctx.beginPath();
        ctx.arc(cx, cy, ring, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    getCellFromPoint(clientX, clientY) {
        const { fx, fy } = this.getFractionalCellFromPoint(clientX, clientY);
        return { gridX: Math.floor(fx), gridY: Math.floor(fy) };
    }

    // Invert the same CSS-pixel translation/zoom used by drawGrid; DPR is
    // already handled by the backing store and must not be applied twice.
    getFractionalCellFromPoint(clientX, clientY) {
        const point = this._clientToCanvas(clientX, clientY);
        const x = (point.x - this.panX - this.shakeX) / this.scale;
        const y = (point.y - this.panY - this.shakeY) / this.scale;
        return { fx: (x - this.gridOffsetX) / this.cellSize, fy: (y - this.gridOffsetY) / this.cellSize };
    }

    setTheme(theme, chapterId) {
        Object.assign(this.theme, theme);
        Object.assign(this.theme, {
            background: BOARD_VISUALS.background,
            backgroundGradient: BOARD_VISUALS.gradient,
            arrowIdle: BOARD_VISUALS.ink,
            arrowRemoving: BOARD_VISUALS.accent,
            arrowRemoved: 'rgba(35,77,72,0.08)',
            hintColor: BOARD_VISUALS.accent,
        });
        this.chapterId = chapterId || 1;
        this.arrowStyle = getArrowStyle(this.chapterId);
        this.gridStyle = getGridStyle();
        this.ambientParticles.clear();
        this.burstParticles.clear();
        this._applyDarkMode();
    }

    _applyDarkMode() {
        if (!document.body.classList.contains('dark-mode')) return;
        this.theme.backgroundGradient = BOARD_VISUALS.darkGradient;
        this.theme.background = BOARD_VISUALS.darkBackground;
        this.theme.gridDot = 'rgba(180,160,120,0.08)';
        this.theme.arrowIdle = BOARD_VISUALS.darkInk;
        this.theme.arrowRemovable = BOARD_VISUALS.darkInk;
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

        if (this.reducedMotion) this.burstParticles.clear();
        else this.burstParticles.update(dt);
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
        if (this.reducedMotion) return;
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
