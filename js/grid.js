// js/grid.js

import { Arrow, ArrowState, Direction } from './arrow.js';

export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.arrows = [];
    }

    addArrow(x, y, direction) {
        const arrow = new Arrow(x, y, direction);
        this.arrows.push(arrow);
        return arrow;
    }

    getArrowAt(x, y) {
        return this.arrows.find(a => a.x === x && a.y === y && !a.isRemoved()) || null;
    }

    isPathClear(arrow) {
        if (arrow.isRemoved()) return false;

        const { dx, dy } = arrow.getDirectionVector();
        let cx = arrow.x + dx;
        let cy = arrow.y + dy;

        while (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) {
            if (this.getArrowAt(cx, cy)) {
                return false;
            }
            cx += dx;
            cy += dy;
        }

        return true;
    }

    updateRemovableStates() {
        for (const arrow of this.arrows) {
            if (arrow.isRemoved() || arrow.state === ArrowState.REMOVING) continue;
            arrow.state = this.isPathClear(arrow) ? ArrowState.REMOVABLE : ArrowState.IDLE;
        }
    }

    removeArrow(arrow) {
        arrow.state = ArrowState.REMOVING;
    }

    finalizeRemoval(arrow) {
        arrow.state = ArrowState.REMOVED;
        this.updateRemovableStates();
    }

    getActiveArrows() {
        return this.arrows.filter(a => !a.isRemoved());
    }

    isCleared() {
        return this.getActiveArrows().length === 0;
    }

    getRemovableArrows() {
        return this.arrows.filter(a => a.state === ArrowState.REMOVABLE);
    }

    loadFromData(arrowData) {
        this.arrows = [];
        for (const data of arrowData) {
            this.addArrow(data.x, data.y, data.direction);
        }
        this.updateRemovableStates();
    }
}
