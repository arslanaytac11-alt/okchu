// Offline-only deterministic authoring. No generation runs during gameplay.
// Each newly peeled arrow has a clear exit through the remaining silhouette;
// dependencies may point only to arrows already peeled, proving acyclicity.
import {createRuneSolver} from './rune-order.js';
import {silhouetteCells} from './puzzle-catalog.js';

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

// Three independent spatial chains, visibly joined by long row bridges.
// The code cycle couples their order; geometry itself does not collapse the
// puzzle into one forced spine. A portrait layout leaves long hooks legible.
// Each chain's frontier is its first remaining path for every removed prefix.
export function authorSealGeometry(chainCounts,{bodyCells=5}={}) {
    if(!Array.isArray(chainCounts)||chainCounts.length!==3||chainCounts.some(n=>!Number.isInteger(n)||n<3||n>25)) {
        throw new RangeError('Seal geometry requires three chain lengths from 3 to 25');
    }
    if(bodyCells!==3&&bodyCells!==5)throw new RangeError('Seal hooks contain 3 or 5 cells');
    const rowsFor=n=>n>=20?5:n>=15?4:n>=9?3:2;
    const rows=chainCounts.map(n=>{
        const count=rowsFor(n),normal=n-(count-1),base=Math.floor(normal/count),extra=normal%count;
        return Array.from({length:count},(_,i)=>base+(i<extra?1:0));
    });
    function snake(rowLengths) {
        const paths=[];
        for(let row=0;row<rowLengths.length;row++) {
            const y=row*4;
            if(row) {
                const previousRight=2*rowLengths[row-1],cells=[[0,y],[0,y-1]];
                for(let x=1;x<=previousRight;x++)cells.push([x,y-1]);
                cells.push([previousRight,y-2]);paths.push({cells,direction:'up'});
            }
            for(let column=0;column<rowLengths[row];column++) {
                const x=1+column*2,cells=bodyCells===5 ?
                    [[x,y+2],[x,y+1],[x+1,y+1],[x+1,y],[x,y]] : [[x+1,y+1],[x+1,y],[x,y]];
                paths.push({cells,direction:'left'});
            }
        }
        return {paths,width:2*Math.max(...rowLengths)+1,height:(rowLengths.length-1)*4+(bodyCells===5?3:2)};
    }
    const [a,b,c]=rows.map(snake),gap=1,width=Math.max(a.width+gap+b.width,c.height);
    const bottomY=Math.max(a.height,b.height)+2,bottomX=Math.floor((width-c.height)/2);
    const first=a.paths;
    const second=b.paths.map(p=>({cells:p.cells.map(([x,y])=>[width-1-x,y]),direction:p.direction==='left'?'right':'up'}));
    const third=c.paths.map(p=>({cells:p.cells.map(([x,y])=>[bottomX+y,bottomY+c.width-1-x]),
        direction:p.direction==='left'?'down':'left'}));
    const paths=[...first,...second,...third],boardCells=paths.flatMap(path=>path.cells);
    return {gridWidth:width,gridHeight:bottomY+c.width,paths,boardCells,
        geometry:{kind:'seals',version:1,layout:'portrait-three',chainCounts:chainCounts.slice(),rowLengths:rows,bodyCells}};
}

export function campaignTargetArrows(chapter, position) {
    const ranges=[[10,18],[20,28],[25,34],[30,40],[35,45],[40,50],[45,55],[50,60],[55,65],[60,75]];
    if(chapter===1 && position===2)return 16;
    const [minimum,maximum]=ranges[chapter-1];
    return Math.round(minimum+(maximum-minimum)*(position-1)/4);
}

export function campaignRuneCycles(chapter, position) {
    if(chapter===1 && position<3)return [];
    if(chapter===1)return position<5 ? [[0,1]] : [[0,1],[0,1,0,2]];
    if(chapter<4)return [[0,1,2],[0,1,0,2],[0,0,1,2]];
    if(chapter<7)return [[0,1,0,2],[0,1,2],[0,0,1,2],[0,1,1,2]];
    return [[0,1,0,2,1,3],[0,0,1,2,1,3],[0,0,1,1,2,3],[0,1,0,1,2,3],[0,1,2,1,0,3]];
}

export function campaignCriticalTarget(chapter, position) {
    if(chapter===1)return position<3?0:position===3?1:position===4?2:3;
    return Math.min(8,3+Math.floor((chapter-2)*0.75)+(position===5?1:0));
}

export function campaignDeepTargets(chapter,position) {
    if(chapter===1)return {};
    if(chapter<=6)return {4:3};
    if(chapter===7)return {4:3,6:2};
    if(chapter===8)return {6:3};
    if(chapter===9)return {6:4};
    return position===1?{6:4}:position===5?{6:5,8:3}:{6:5};
}

// Authored word used as a verified finite candidate, not a claimed difficulty
// shortcut. Its all-winning-route H6/H8 minima are 5/3, longest quiet run 16.
export const FINAL_SEAL_WORD = Object.freeze({runeCycle:Object.freeze([0,1,0,1,2,3]),
    runes:Object.freeze([0,1,0,3,1,0,1,2,1,1,3,0,1,1,3,0,1,0,1,1,2,2,1,0,2,
        1,2,0,1,2,3,1,2,0,1,3,0,1,0,2,1,3,0,3,1,0,1,0,1,3,
        0,3,0,0,0,2,0,2,1,2,0,3,0,0,1,3,0,1,0,1,2,3,0,1,0])});

export function campaignDimensions(shape, targetArrows, maxLength=4) {
    const expectedLength={3:2.1,4:2.5,5:2.9,6:3.3}[maxLength]||2.5;
    let best=null;
    for(let width=9;width<=26;width++) {
        const height=width+2,cells=silhouetteCells(shape,width,height);
        const distance=Math.abs(cells.length-targetArrows*expectedLength);
        if(!best||distance<best.distance)best={gridWidth:width,gridHeight:height,cells,distance};
    }
    return best;
}

// Assignment always starts from a valid spatial order. Exact analysis then
// grades the EASIEST winning route, not a cherry-picked difficult solution.
// Unknown searches are rejected; the candidate budget is fixed and finite.
export function authorRuneOrder(level, {
    seed=1,cycles=[[0,1,2]],assignmentCandidates=16,maxStates=20000,
    minimumCriticalTarget=3,targetTrapLookahead=3,minimumDeepTargets={},
    minimumDeepBranchingTargets={},maximumNoCriticalRun=Infinity,curatedCandidates=[],stopWhenTargetsMet=false,
}={}) {
    const spatial=createRuneSolver(level),n=level.paths.length;
    let best=null,unknownCandidates=0,acceptedCandidates=0;
    const seen=new Set();
    for(let candidate=-curatedCandidates.length;candidate<assignmentCandidates;candidate++) {
        const curated=candidate<0?curatedCandidates[candidate+curatedCandidates.length]:null;
        const cycle=curated?curated.runeCycle:cycles[candidate%cycles.length];
        let runes;
        if(curated) {
            if(curated.runes.length!==n)throw new Error('Curated rune word has the wrong length');
            runes=curated.runes.slice();
        } else {
            const rng=random(seed+candidate*104729),removed=[],order=[];
            while(order.length<n) {
                const moves=spatial.spatialMoves(removed);
                if(!moves.length)throw new Error('Authoring input has no spatial solution');
                const next=candidate===0 ? moves[0] : moves[Math.floor(rng()*moves.length)];
                removed.push(next);order.push(next);
            }
            runes=new Array(n);order.forEach((index,step)=>runes[index]=cycle[step%cycle.length]);
        }
        const signature=`${cycle.join(',')}:${runes.join(',')}`;
        if(seen.has(signature))continue;seen.add(signature);
        const coded={...level,runeCycle:cycle.slice(),paths:level.paths.map((path,index)=>({...path,rune:runes[index]}))};
        const audit=createRuneSolver(coded,{maxStates}).audit();
        if(audit.status==='unknown') {unknownCandidates++;continue;}
        if(!audit.solvable)throw new Error('Assigned verified order became unsolvable');
        acceptedCandidates++;
        const criticalShortfall=Math.max(0,minimumCriticalTarget-audit.minimumCriticalDecisions);
        const horizonShortfall=Math.max(0,targetTrapLookahead-audit.trapLookaheadMedian);
        const deepPenalty=Object.entries(minimumDeepTargets).reduce((sum,[horizon,target])=>{
            const shortfall=Math.max(0,target-audit.minimumDeepCriticalDecisions[horizon]);
            return sum+shortfall*shortfall*600;
        },0);
        const branchingPenalty=Object.entries(minimumDeepBranchingTargets).reduce((sum,[horizon,target])=>{
            const shortfall=Math.max(0,target-audit.minimumDeepBranchingDecisions[horizon]);
            return sum+shortfall*shortfall*300;
        },0);
        const quietShortfall=Math.max(0,audit.maximumNoCriticalRun-maximumNoCriticalRun);
        const penalty=deepPenalty+branchingPenalty+quietShortfall*quietShortfall*80+
            criticalShortfall*criticalShortfall*120+horizonShortfall*12+
            Math.max(0,0.2-audit.unsafeChoiceRatio)*30+
            Math.max(0,2-audit.legalMoves.length)*2+audit.reachableStates/20000-
            Math.min(audit.minimumCriticalDecisions,minimumCriticalTarget+2)*0.5+
            Math.max(0,audit.minimumCriticalDecisions-minimumCriticalTarget-2)*(minimumCriticalTarget<4?2:.3);
        if(!best||penalty<best.penalty)best={level:coded,audit,penalty,
            assignment:{seed,candidate,cycle:cycle.slice(),assignmentCandidates,maxStates,minimumCriticalTarget,targetTrapLookahead,
                minimumDeepTargets:{...minimumDeepTargets},minimumDeepBranchingTargets:{...minimumDeepBranchingTargets},
                maximumNoCriticalRun:Number.isFinite(maximumNoCriticalRun)?maximumNoCriticalRun:null,stopWhenTargetsMet,
                curatedCandidate:curated?candidate+curatedCandidates.length:null}};
        if(stopWhenTargetsMet&&criticalShortfall===0&&deepPenalty===0&&branchingPenalty===0&&quietShortfall===0)break;
    }
    return best ? {...best,unknownCandidates,acceptedCandidates} : {level:null,audit:null,unknownCandidates,acceptedCandidates};
}
