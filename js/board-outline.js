// Unit-grid contours for the union of occupied cells. Screen-coordinate
// outer loops wind clockwise; holes wind counterclockwise. Loops are closed.
export function buildBoardOutline(cells) {
    const key = (x, y) => `${x},${y}`;
    const occupied = new Map();
    for (const [x, y] of cells) {
        if (![x, y, x - 1, x + 1, y - 1, y + 1].every(Number.isSafeInteger)) {
            throw new TypeError('Board cells must have safe integer grid coordinates.');
        }
        occupied.set(key(x, y), [x, y]);
    }
    const edges = [], outgoing = new Map(), loops = [];
    const add = (x, y, nx, ny, direction) => {
        const edge = { from:{x, y}, to:{x:nx, y:ny}, direction, used:false };
        edges.push(edge);
        const k = key(x, y);
        if (!outgoing.has(k)) outgoing.set(k, []);
        outgoing.get(k).push(edge);
    };
    for (const [x, y] of occupied.values()) {
        if (!occupied.has(key(x, y - 1))) add(x, y, x + 1, y, 0);
        if (!occupied.has(key(x + 1, y))) add(x + 1, y, x + 1, y + 1, 1);
        if (!occupied.has(key(x, y + 1))) add(x + 1, y + 1, x, y + 1, 2);
        if (!occupied.has(key(x - 1, y))) add(x, y + 1, x, y, 3);
    }
    const turnPriority = [1, 0, 3, 2]; // right, straight, left, reverse
    const emit = points => {
        const corners = points.filter((p, i) => {
            const previous = points[(i + points.length - 1) % points.length];
            const next = points[(i + 1) % points.length];
            return !((previous.x === p.x && p.x === next.x) || (previous.y === p.y && p.y === next.y));
        });
        loops.push([...corners, {...corners[0]}]);
    };
    for (const start of edges) {
        if (start.used) continue;
        let edge = start;
        const points = [];
        do {
            if (edge.used) throw new Error('Board contour did not close.');
            edge.used = true;
            points.push(edge.from);
            const candidates = outgoing.get(key(edge.to.x, edge.to.y));
            edge = candidates.reduce((best, next) =>
                turnPriority[(next.direction - edge.direction + 4) % 4] <
                turnPriority[(best.direction - edge.direction + 4) % 4] ? next : best);
        } while (edge !== start);
        // A hole can touch an exterior at one vertex. Split that weakly
        // simple walk at repeated vertices so each returned loop is simple.
        const chain = [], seen = new Map();
        for (const point of [...points, points[0]]) {
            const k = key(point.x, point.y);
            if (seen.has(k)) {
                const cycle = chain.splice(seen.get(k));
                for (const vertex of cycle) seen.delete(key(vertex.x, vertex.y));
                emit(cycle);
            }
            seen.set(k, chain.length);
            chain.push(point);
        }
    }
    return loops;
}
