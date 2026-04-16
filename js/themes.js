// js/themes.js
// Per-chapter atmosphere: ambient particle configs and background silhouettes

export const AMBIENT_PARTICLES = {
    1: { // Egypt - sand
        shape: 'circle', color: '#c9a96e', count: 15,
        spawnArea: 'top', vx: 15, vy: 8, life: 5, size: 1.5, gravity: 3,
    },
    2: { // Greek - olive leaves
        shape: 'leaf', color: '#7a9a4a', count: 12,
        spawnArea: 'top', vx: 5, vy: 12, life: 6, size: 2.5, gravity: 2,
    },
    3: { // Rome - sparks
        shape: 'spark', color: '#d4733a', count: 10,
        spawnArea: 'bottom', vx: 8, vy: -30, life: 2, size: 2, gravity: -5,
    },
    4: { // Viking - snow
        shape: 'flake', color: '#d0e8f0', count: 18,
        spawnArea: 'top', vx: 10, vy: 15, life: 7, size: 2, gravity: 1,
    },
    5: { // Ottoman - petals
        shape: 'petal', color: '#c44060', count: 12,
        spawnArea: 'top', vx: 6, vy: 10, life: 6, size: 2.5, gravity: 2,
    },
    6: { // China - cherry blossom
        shape: 'petal', color: '#e8a0b0', count: 15,
        spawnArea: 'top', vx: 8, vy: 8, life: 7, size: 2, gravity: 1.5,
    },
    7: { // Maya - fireflies
        shape: 'circle', color: '#c0d040', count: 14,
        spawnArea: 'random', vx: 12, vy: 12, life: 3, size: 2, gravity: 0,
        pulse: true,
    },
    8: { // India - gold dust
        shape: 'circle', color: '#d4a830', count: 16,
        spawnArea: 'bottom', vx: 5, vy: -8, life: 4, size: 1.5, gravity: -2,
    },
    9: { // Medieval - fog
        shape: 'circle', color: '#b0b8c0', count: 10,
        spawnArea: 'left', vx: 12, vy: 2, life: 8, size: 8, gravity: 0,
    },
    10: { // Final - mixed
        mixed: true, cycle: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
};

export const SILHOUETTES = {
    1: drawPyramids,
    2: drawColumns,
    3: drawArches,
    4: drawShip,
    5: drawMosque,
    6: drawPagoda,
    7: drawTemple,
    8: drawPalace,
    9: drawCastle,
    10: drawPanorama,
};

// Arrow style config per chapter bracket
export const ARROW_STYLES = {
    simple: { lineWidth: 0.09, dash: null, headStyle: 'simple', shimmer: false },
    patterned: { lineWidth: 0.09, dash: [4, 3], headStyle: 'simple', shimmer: false },
    ornate: { lineWidth: 0.09, dash: null, headStyle: 'forked', shimmer: false },
    golden: { lineWidth: 0.10, dash: null, headStyle: 'forked', shimmer: true },
};

export function getArrowStyle(chapterId) {
    if (chapterId <= 3) return ARROW_STYLES.simple;
    if (chapterId <= 6) return ARROW_STYLES.patterned;
    if (chapterId <= 9) return ARROW_STYLES.ornate;
    return ARROW_STYLES.golden;
}

export function getGridStyle() {
    return {
        dotSize: 2.5,
        landmarkInterval: 4,
        landmarkDotSize: 3.5,
        lineAlpha: 0.04,
    };
}

// --- Silhouette Drawing Functions ---

function drawPyramids(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(160, 130, 80, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h);
    ctx.lineTo(w * 0.15, h * 0.82);
    ctx.lineTo(w * 0.25, h);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h);
    ctx.lineTo(w * 0.35, h * 0.72);
    ctx.lineTo(w * 0.52, h);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.55, h);
    ctx.lineTo(w * 0.62, h * 0.86);
    ctx.lineTo(w * 0.69, h);
    ctx.fill();
    ctx.restore();
}

function drawColumns(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(140, 130, 120, ${alpha})`;
    const colW = w * 0.025;
    for (const xp of [0.08, 0.16, 0.84, 0.92]) {
        const x = w * xp;
        ctx.fillRect(x - colW / 2, h * 0.65, colW, h * 0.35);
        ctx.fillRect(x - colW * 0.7, h * 0.64, colW * 1.4, h * 0.02);
    }
    ctx.fillRect(w * 0.065, h * 0.63, w * 0.115, h * 0.015);
    ctx.fillRect(w * 0.825, h * 0.63, w * 0.115, h * 0.015);
    ctx.restore();
}

function drawArches(ctx, w, h, alpha) {
    ctx.save();
    ctx.strokeStyle = `rgba(150, 120, 90, ${alpha})`;
    ctx.lineWidth = 3;
    const archW = w * 0.12;
    for (const xp of [0.2, 0.5, 0.8]) {
        const cx = w * xp;
        ctx.beginPath();
        ctx.arc(cx, h * 0.88, archW, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = `rgba(150, 120, 90, ${alpha})`;
        ctx.fillRect(cx - archW - 2, h * 0.88, 4, h * 0.12);
        ctx.fillRect(cx + archW - 2, h * 0.88, 4, h * 0.12);
    }
    ctx.restore();
}

function drawShip(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(100, 80, 60, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.92);
    ctx.quadraticCurveTo(w * 0.2, h * 0.85, w * 0.4, h * 0.88);
    ctx.lineTo(w * 0.05, h * 0.95);
    ctx.fill();
    ctx.fillRect(w * 0.22, h * 0.72, 2, h * 0.16);
    ctx.beginPath();
    ctx.moveTo(w * 0.225, h * 0.73);
    ctx.quadraticCurveTo(w * 0.30, h * 0.78, w * 0.225, h * 0.85);
    ctx.fill();
    ctx.restore();
}

function drawMosque(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(120, 90, 80, ${alpha})`;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.88, w * 0.12, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(w * 0.38, h * 0.88, w * 0.24, h * 0.12);
    const minW = 3;
    ctx.fillRect(w * 0.32 - minW / 2, h * 0.7, minW, h * 0.3);
    ctx.fillRect(w * 0.68 - minW / 2, h * 0.7, minW, h * 0.3);
    ctx.beginPath();
    ctx.arc(w * 0.32, h * 0.7, 4, 0, Math.PI * 2);
    ctx.arc(w * 0.68, h * 0.7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawPagoda(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(120, 100, 80, ${alpha})`;
    const cx = w * 0.85;
    for (let i = 0; i < 4; i++) {
        const y = h * (0.75 + i * 0.06);
        const halfW = (4 - i) * w * 0.025;
        ctx.beginPath();
        ctx.moveTo(cx - halfW, y);
        ctx.lineTo(cx, y - h * 0.03);
        ctx.lineTo(cx + halfW, y);
        ctx.fill();
        ctx.fillRect(cx - halfW * 0.6, y, halfW * 1.2, h * 0.03);
    }
    ctx.restore();
}

function drawTemple(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(100, 110, 80, ${alpha})`;
    for (let i = 0; i < 5; i++) {
        const y = h * (0.82 + i * 0.035);
        const halfW = (5 - i) * w * 0.04;
        ctx.fillRect(w * 0.15 - halfW, y, halfW * 2, h * 0.035);
    }
    ctx.fillRect(w * 0.13, h * 0.79, w * 0.04, h * 0.035);
    ctx.restore();
}

function drawPalace(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(140, 110, 70, ${alpha})`;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.85, w * 0.08, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(w * 0.42, h * 0.85, w * 0.16, h * 0.15);
    ctx.beginPath();
    ctx.arc(w * 0.35, h * 0.88, w * 0.04, Math.PI, 0);
    ctx.arc(w * 0.65, h * 0.88, w * 0.04, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(w * 0.498, h * 0.76, 3, h * 0.09);
    ctx.restore();
}

function drawCastle(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(100, 100, 110, ${alpha})`;
    ctx.fillRect(w * 0.65, h * 0.82, w * 0.25, h * 0.18);
    ctx.fillRect(w * 0.63, h * 0.74, w * 0.05, h * 0.26);
    ctx.fillRect(w * 0.87, h * 0.74, w * 0.05, h * 0.26);
    const bw = w * 0.015;
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(w * 0.67 + i * w * 0.04, h * 0.80, bw, h * 0.025);
    }
    ctx.restore();
}

function drawPanorama(ctx, w, h, alpha) {
    drawPyramids(ctx, w, h, alpha * 0.5);
    drawMosque(ctx, w, h, alpha * 0.5);
    drawCastle(ctx, w, h, alpha * 0.5);
}
