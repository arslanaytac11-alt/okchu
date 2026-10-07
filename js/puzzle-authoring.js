// Offline-only deterministic authoring. No generation runs during gameplay.
// Each newly peeled arrow has a clear exit through the remaining silhouette;
// dependencies may point only to arrows already peeled, proving acyclicity.
const DIRECTIONS = [['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]];
const key = (x,y) => `${x},${y}`;
export function campaignTargetDepth(chapter, position) {
    if (chapter === 1) return [2,3,4,5,6][position-1];
    return chapter+3+[0,0,1,1,2][position-1];
}
function random(seed) {
    let state = seed >>> 0;
    return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}

export function authorSilhouette(cells, width, height, seed, {
    targetDepth = 5, initialChoices = 4, maxLength = 5, turnChance = 0.55,
} = {}) {
    // Canonical cell order makes repeated generation independent of the last
    // authored paths' grouping/order and of the caller's cell enumeration.
    const ordered = cells.slice().sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
    const rng = random(seed), remaining = new Set(ordered.map(([x,y])=>key(x,y)));
    const peeled = new Map(), depths = [], paths = [];
    let freePaths = 0, maximumDepth = 0;
    while (remaining.size) {
        const candidates = [];
        for (const cell of remaining) {
            const [x,y] = cell.split(',').map(Number);
            for (const [direction,dx,dy] of DIRECTIONS) {
                let clear = true;
                const dependencies = new Set();
                for (let cx=x+dx,cy=y+dy;cx>=0&&cx<width&&cy>=0&&cy<height;cx+=dx,cy+=dy) {
                    if (remaining.has(key(cx,cy))) { clear=false; break; }
                    const previous = peeled.get(key(cx,cy));
                    if (previous !== undefined) dependencies.add(previous);
                }
                if (clear) candidates.push({x,y,direction,dx,dy,depth:1+Math.max(0,...[...dependencies].map(i=>depths[i]))});
            }
        }
        if (!candidates.length) throw new Error('Silhouette has no peelable frontier');
        const free = candidates.filter(c=>c.depth===1);
        const dependent = candidates.filter(c=>c.depth>1&&c.depth<=targetDepth);
        let pool;
        if (freePaths < initialChoices && free.length) {
            pool = free;
        } else if (dependent.length) {
            // Grow a spine, but often branch to an earlier depth so the board
            // retains multiple legal routes rather than a forced single chain.
            const goal = rng()<0.68 ? Math.min(targetDepth,maximumDepth+1) :
                2+Math.floor(rng()*Math.max(1,Math.min(targetDepth-1,maximumDepth)));
            const distance = Math.min(...dependent.map(c=>Math.abs(c.depth-goal)));
            pool = dependent.filter(c=>Math.abs(c.depth-goal)===distance);
        } else if (free.length) {
            pool = free;
        } else {
            const shallowest = Math.min(...candidates.map(c=>c.depth));
            pool = candidates.filter(c=>c.depth===shallowest);
        }
        const head = pool[Math.floor(rng()*pool.length)];
        const body = [[head.x,head.y]], index = paths.length;
        remaining.delete(key(head.x,head.y));
        const desiredLength = 2+Math.floor(rng()*Math.max(1,maxLength-1));
        while (body.length < desiredLength) {
            const [x,y] = body[body.length-1];
            const neighbors = DIRECTIONS.map(([,dx,dy])=>[x+dx,y+dy]).filter(([nx,ny])=>remaining.has(key(nx,ny)));
            if (!neighbors.length) break;
            const [px,py] = body.length===1 ? [x+head.dx,y+head.dy] : body[body.length-2];
            const straight = neighbors.find(([nx,ny])=>nx===2*x-px&&ny===2*y-py);
            const corners = neighbors.filter(([nx,ny])=>nx!==2*x-px||ny!==2*y-py);
            const turn = body.length>1&&corners.length&&rng()<turnChance;
            const next = turn ? corners[Math.floor(rng()*corners.length)] : straight||neighbors[Math.floor(rng()*neighbors.length)];
            body.push(next); remaining.delete(key(...next));
        }
        const path = {cells:body.reverse(),direction:head.direction};
        for (const [x,y] of body) peeled.set(key(x,y),index);
        depths.push(head.depth);
        maximumDepth = Math.max(maximumDepth,head.depth);
        if (head.depth===1) freePaths++;
        paths.push(path);
    }
    return paths;
}

export function pathVariety(paths) {
    let bent = 0, u = 0, z = 0, turns = 0;
    for (const path of paths) {
        const runs = [];
        for (let i=1;i<path.cells.length;i++) {
            const vector = [path.cells[i][0]-path.cells[i-1][0],path.cells[i][1]-path.cells[i-1][1]];
            if (!runs.length||runs.at(-1)[0]!==vector[0]||runs.at(-1)[1]!==vector[1]) runs.push(vector);
        }
        if (runs.length>1) { bent++; turns += runs.length-1; }
        for (let i=2;i<runs.length;i++) {
            const dot = runs[i-2][0]*runs[i][0]+runs[i-2][1]*runs[i][1];
            if (dot===-1) { u++; break; }
            if (dot===1) { z++; break; }
        }
    }
    return {bentPaths:bent,uPaths:u,zPaths:z,turns};
}
