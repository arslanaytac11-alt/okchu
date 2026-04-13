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

export class Arrow {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.state = ArrowState.IDLE;
        this.animProgress = 0;
    }

    getDirectionVector() {
        switch (this.direction) {
            case Direction.UP: return { dx: 0, dy: -1 };
            case Direction.DOWN: return { dx: 0, dy: 1 };
            case Direction.LEFT: return { dx: -1, dy: 0 };
            case Direction.RIGHT: return { dx: 1, dy: 0 };
        }
    }

    isRemoved() {
        return this.state === ArrowState.REMOVED;
    }
}
