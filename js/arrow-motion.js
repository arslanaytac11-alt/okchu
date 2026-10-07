// Arrow geometry stays in grid units. A departure is a moving window along
// the original tail-to-tip route, extended straight through the exit.
import { getDirectionVector } from './arrow.js';

const EPSILON = 1e-9;
const samePoint = (a, b) => Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
const segmentLength = (a, b) => Math.abs(b.x - a.x) + Math.abs(b.y - a.y);

export function createArrowRoute(cells, direction) {
    const vector = getDirectionVector(direction);
    if (!vector || !cells?.length) throw new TypeError('An arrow needs cells and an exit direction');
    const centers = cells.map(cell => ({
        x: (Array.isArray(cell) ? cell[0] : cell.x) + 0.5,
        y: (Array.isArray(cell) ? cell[1] : cell.y) + 0.5,
    }));
    const { dx, dy } = vector;
    const head = centers[centers.length - 1];
    let points;
    if (centers.length === 1) {
        points = [
            { x: head.x - dx * 0.35, y: head.y - dy * 0.35 },
            { x: head.x + dx * 0.35, y: head.y + dy * 0.35 },
        ];
    } else {
        const first = centers[0], next = centers[1];
        points = [
            { x: first.x - Math.sign(next.x - first.x) * 0.42, y: first.y - Math.sign(next.y - first.y) * 0.42 },
            ...centers,
            { x: head.x + dx * 0.42, y: head.y + dy * 0.42 },
        ];
    }
    points = points.filter((point, i) => i === 0 || !samePoint(point, points[i - 1]));
    const distances = [0];
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        if (!Number.isFinite(b.x + b.y) || (Math.abs(a.x - b.x) > EPSILON && Math.abs(a.y - b.y) > EPSILON)) {
            throw new TypeError('Arrow routes must contain finite, axis-aligned segments');
        }
        distances.push(distances[i - 1] + segmentLength(a, b));
    }
    return { points, distances, length: distances[distances.length - 1], direction, dx, dy };
}

export function pointOnArrowRoute(route, distance) {
    const d = Math.max(0, distance);
    const tip = route.points[route.points.length - 1];
    if (d >= route.length) return { x: tip.x + route.dx * (d - route.length), y: tip.y + route.dy * (d - route.length) };
    for (let i = 1; i < route.points.length; i++) {
        if (d <= route.distances[i]) {
            const a = route.points[i - 1], b = route.points[i];
            const fraction = (d - route.distances[i - 1]) / (route.distances[i] - route.distances[i - 1]);
            return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
        }
    }
    return { ...tip };
}

// The span never shrinks: bends pass through the tail as the head advances.
export function sampleArrowMotion(route, distance = 0) {
    const start = Math.max(0, distance), end = start + route.length;
    const points = [pointOnArrowRoute(route, start)];
    for (let i = 1; i < route.points.length; i++) {
        if (route.distances[i] > start + EPSILON && route.distances[i] < end - EPSILON) points.push({ ...route.points[i] });
    }
    const tip = pointOnArrowRoute(route, end);
    if (!samePoint(points[points.length - 1], tip)) points.push(tip);
    return { points, tip, length: route.length, alpha: 1 };
}

// Keep the shaft under the filled arrowhead without replacing the route.
export function arrowShaftPoints(geometry, headInset) {
    const points = geometry.points.map(point => ({ ...point }));
    let remaining = Math.max(0, headInset);
    while (points.length > 1 && remaining > EPSILON) {
        const end = points[points.length - 1], before = points[points.length - 2];
        const length = segmentLength(before, end);
        if (remaining >= length) { points.pop(); remaining -= length; }
        else {
            const fraction = (length - remaining) / length;
            points[points.length - 1] = { x: before.x + (end.x - before.x) * fraction, y: before.y + (end.y - before.y) * fraction };
            remaining = 0;
        }
    }
    return points;
}

export function arrowExitDistance(route, bounds) {
    const tip = route.points[route.points.length - 1];
    const clearance = route.dx > 0 ? bounds.right - tip.x : route.dx < 0 ? tip.x - bounds.left : route.dy > 0 ? bounds.bottom - tip.y : tip.y - bounds.top;
    return route.length + Math.max(0, clearance) + 1;
}

// Accelerates through the exit, with no deceleration while still on screen.
export function arrowDepartureEase(progress) {
    const t = Math.max(0, Math.min(1, progress));
    return 0.18 * t + 0.82 * t * t;
}

export const ARROW_ERROR_COLOR = '#dc3545';
export const ARROW_DARK_ERROR_COLOR = '#ff8f88';
export const ARROW_COLORS = Object.freeze(['#18584f', '#a44f34', '#806020']);
export const ARROW_DARK_COLORS = Object.freeze(['#80ceb9', '#f0ad8d', '#e5c366']);

// Assign decoration once from the complete original board. Sorting geometry
// hashes avoids using solution/peeling order, while cycling the three colors
// keeps a small silhouette from accidentally becoming almost monochrome.
export function assignBalancedArrowColors(paths) {
    const ranked = paths.map(path => {
        const key = path.cells.map(cell => `${cell.x},${cell.y}`).join(';') + ':' + path.direction;
        let hash = 2166136261;
        for (let i=0;i<key.length;i++) { hash ^= key.charCodeAt(i); hash = Math.imul(hash,16777619); }
        return {path,key,hash:hash>>>0};
    }).sort((a,b)=>a.hash-b.hash||(a.key<b.key?-1:a.key>b.key?1:0));
    const offset = ranked.length ? ranked[0].hash%ARROW_COLORS.length : 0;
    ranked.forEach(({path},rank)=>Object.defineProperty(path,'paletteIndex',{
        value:(rank+offset)%ARROW_COLORS.length,enumerable:true,writable:false,configurable:false,
    }));
}

// Decoration depends on the original geometry, never on removability.
export function arrowColorVariant(path) {
    if (Number.isInteger(path.paletteIndex)) return ((path.paletteIndex%ARROW_COLORS.length)+ARROW_COLORS.length)%ARROW_COLORS.length;
    const first = path.cells[0];
    const direction = ['up', 'right', 'down', 'left'].indexOf(path.direction);
    const value = (first.x + 17) * 31 + (first.y + 11) * 17 + path.cells.length * 7 + direction + (path.colorIndex || 0);
    return ((value % ARROW_COLORS.length) + ARROW_COLORS.length) % ARROW_COLORS.length;
}
