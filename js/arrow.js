// js/arrow.js
// ArrowPath: A path of connected cells with an arrow head at the end

export const Direction = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
};

export const ArrowState = {
    IDLE: 'idle',
    REMOVABLE: 'removable',
    REMOVING: 'removing',
    REMOVED: 'removed'
};

export function getDirectionVector(direction) {
    switch (direction) {
        case Direction.UP: return { dx: 0, dy: -1 };
        case Direction.DOWN: return { dx: 0, dy: 1 };
        case Direction.LEFT: return { dx: -1, dy: 0 };
        case Direction.RIGHT: return { dx: 1, dy: 0 };
    }
}

export class ArrowPath {
    constructor(cells, direction) {
        // cells: array of [x, y] pairs forming the connected path
        this.cells = cells.map(c => ({ x: c[0], y: c[1] }));
        this.direction = direction;
        this.state = ArrowState.IDLE;
        this.animProgress = 0;
    }

    // The arrow head cell (last cell in array)
    getHead() {
        return this.cells[this.cells.length - 1];
    }

    // Check if this path occupies a given cell
    hasCell(x, y) {
        return this.cells.some(c => c.x === x && c.y === y);
    }

    isRemoved() {
        return this.state === ArrowState.REMOVED;
    }
}
