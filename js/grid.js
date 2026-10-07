// js/grid.js

import { ArrowPath, ArrowState, getDirectionVector } from './arrow.js';

export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.paths = [];
        this.walls = []; // [[x,y], ...] immovable obstacles that block path clearance
    }

    addPath(cells, direction, colorIndex) {
        const path = new ArrowPath(cells, direction, colorIndex);
        this.paths.push(path);
        return path;
    }

    isWall(x, y) {
        return this.walls.some(w => w[0] === x && w[1] === y);
    }

    // Find which non-removed path owns a cell
    getPathAt(x, y) {
        return this.paths.find(p => !p.isRemoved() && p.state !== ArrowState.REMOVING && p.hasCell(x, y)) || null;
    }

    // Check if any non-removed path has a cell at (x, y) — walls also count as occupied
    isCellOccupied(x, y) {
        if (this.isWall(x, y)) return true;
        return this.paths.some(p => !p.isRemoved() && p.state !== ArrowState.REMOVING && p.hasCell(x, y));
    }

    // Scan the exit once, in travel order. The same result drives clearance
    // and causal feedback, so a cue can never point past the actual obstacle.
    // Grid boundaries are exits, not blockers; malformed/custom heads return
    // no drawable blocker instead of producing an unbounded ray.
    getFirstBlocker(path) {
        if (!path || path.isRemoved()) return null;
        const head = path.getHead();
        const vector = getDirectionVector(path.direction);
        if (!head || !vector || !Number.isInteger(head.x) || !Number.isInteger(head.y) ||
            head.x < 0 || head.x >= this.width || head.y < 0 || head.y >= this.height) return null;
        const { dx, dy } = vector;
        let cx = head.x + dx;
        let cy = head.y + dy;
        let distance = 1;

        while (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) {
            // Walls always block
            if (this.isWall(cx, cy)) return { type: 'wall', x: cx, y: cy, path: null, distance };
            // Check if any OTHER path occupies this cell
            for (const other of this.paths) {
                if (other === path || other.isRemoved() || other.state === ArrowState.REMOVING) continue;
                if (other.hasCell(cx, cy)) return { type: 'path', x: cx, y: cy, path: other, distance };
            }
            cx += dx;
            cy += dy;
            distance++;
        }
        return null;
    }

    // A path is removable when its exit reaches the grid edge unobstructed.
    isPathClear(path) {
        if (!path || path.isRemoved() || !path.getHead() || !getDirectionVector(path.direction)) return false;
        const head = path.getHead();
        if (!Number.isInteger(head.x) || !Number.isInteger(head.y) || head.x < 0 || head.x >= this.width || head.y < 0 || head.y >= this.height) return false;
        return this.getFirstBlocker(path) === null;
    }

    updateRemovableStates() {
        for (const path of this.paths) {
            if (path.isRemoved() || path.state === ArrowState.REMOVING) continue;
            path.state = this.isPathClear(path) ? ArrowState.REMOVABLE : ArrowState.IDLE;
        }
    }

    removePath(path) {
        path.state = ArrowState.REMOVING;
        path.snakeProgress = 0;
    }

    finalizeRemoval(path) {
        path.state = ArrowState.REMOVED;
        this.updateRemovableStates();
    }

    getActivePaths() {
        return this.paths.filter(p => !p.isRemoved());
    }

    isCleared() {
        return this.getActivePaths().length === 0;
    }

    getRemovablePaths() {
        return this.paths.filter(p => p.state === ArrowState.REMOVABLE);
    }

    loadFromData(pathsData, walls = []) {
        this.paths = [];
        this.walls = walls.map(w => [w[0], w[1]]);
        for (let i = 0; i < pathsData.length; i++) {
            const data = pathsData[i];
            this.addPath(data.cells, data.direction, i % 8);
        }
        this.updateRemovableStates();
    }
}
