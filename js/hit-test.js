// Deterministic selection in CSS pixels. Clearance never changes which arrow wins.
export function hitTestPath(grid, renderer, clientX, clientY) {
    if (!grid || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    const { fx, fy } = renderer.getFractionalCellFromPoint(clientX, clientY);
    if (!Number.isFinite(fx) || !Number.isFinite(fy) || fx < 0 || fy < 0 || fx >= grid.width || fy >= grid.height) return null;
    const paths = grid.paths.filter(p => !p.isRemoved() && p.state !== 'removing');
    const exact = paths.filter(p => p.hasCell(Math.floor(fx), Math.floor(fy)));
    // Overlapping data is ambiguous: never choose by array/z-order.
    if (exact.length) return exact.length === 1 ? exact[0] : null;
    const rect = renderer.canvas.getBoundingClientRect();
    const sx = rect.width / (renderer._cssWidth || rect.width);
    const sy = rect.height / (renderer._cssHeight || rect.height);
    const size = renderer.cellSize * renderer.scale * Math.min(sx, sy);
    const radius = Math.min(12, size * 0.45);
    const point = { x: renderer.gridOffsetX + fx * renderer.cellSize, y: renderer.gridOffsetY + fy * renderer.cellSize };
    const ranked = paths.map(path => {
        const { points, tipX, tipY } = renderer._buildPathPoints(path, renderer._getArrowMetrics());
        const line = [...points, { x: tipX, y: tipY }];
        let distance = Infinity;
        for (let i = 1; i < line.length; i++) {
            const a = line[i - 1], b = line[i];
            const dx = (b.x - a.x) * sx, dy = (b.y - a.y) * sy;
            const px = (point.x - a.x) * sx, py = (point.y - a.y) * sy;
            const ratio = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)));
            distance = Math.min(distance, Math.hypot(px - ratio * dx, py - ratio * dy) * renderer.scale);
        }
        return { path, distance };
    }).filter(p => p.distance <= radius).sort((a, b) => a.distance - b.distance);
    if (!ranked.length || (ranked[1] && ranked[1].distance - ranked[0].distance < Math.min(3, size * 0.12))) return null;
    return ranked[0].path;
}
