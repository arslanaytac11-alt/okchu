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
    constructor(cells, direction, colorIndex) {
        // cells: array of [x, y] pairs forming the connected path
        this.cells = cells.map(c => ({ x: c[0], y: c[1] }));
        this.direction = direction;
        this.state = ArrowState.IDLE;
        this.animProgress = 0;
        this.colorIndex = colorIndex || 0;

        // Mechanic fields (set by level loader based on chapter)
        this.armor = 0;           // >0 means armored, decrements on tap
        this.frozenUntil = 0;     // timestamp when freeze expires
        this.mirrorPairId = null;  // string id linking mirror pairs
        this.chainGroupId = null;  // string id linking chain groups
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
