// js/grid.js

import { ArrowPath, ArrowState, getDirectionVector } from './arrow.js';

export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.paths = [];
    }

    addPath(cells, direction) {
        const path = new ArrowPath(cells, direction);
        this.paths.push(path);
        return path;
    }

    // Find which non-removed path owns a cell
    getPathAt(x, y) {
        return this.paths.find(p => !p.isRemoved() && p.state !== ArrowState.REMOVING && p.hasCell(x, y)) || null;
    }

    // Check if any non-removed path has a cell at (x, y)
    isCellOccupied(x, y) {
        return this.paths.some(p => !p.isRemoved() && p.state !== ArrowState.REMOVING && p.hasCell(x, y));
    }

    // A path is removable if from its arrow head, going in its direction,
    // there are no occupied cells until the grid edge
    isPathClear(path) {
        if (path.isRemoved()) return false;
        const head = path.getHead();
        const { dx, dy } = getDirectionVector(path.direction);
        let cx = head.x + dx;
        let cy = head.y + dy;

        while (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) {
            // Check if any OTHER path occupies this cell
            for (const other of this.paths) {
                if (other === path || other.isRemoved() || other.state === ArrowState.REMOVING) continue;
                if (other.hasCell(cx, cy)) return false;
            }
            cx += dx;
            cy += dy;
        }
        return true;
    }

    updateRemovableStates() {
        for (const path of this.paths) {
            if (path.isRemoved() || path.state === ArrowState.REMOVING) continue;
            path.state = this.isPathClear(path) ? ArrowState.REMOVABLE : ArrowState.IDLE;
        }
    }

    removePath(path) {
        path.state = ArrowState.REMOVING;
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

    loadFromData(pathsData) {
        this.paths = [];
        for (const data of pathsData) {
            this.addPath(data.cells, data.direction);
        }
        this.updateRemovableStates();
    }
}
