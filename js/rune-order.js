// Exact, pure order puzzle engine. No DOM, storage, generation or Grid import.
// Successful removals advance the visible rune cycle by one. Geometry and
// code eligibility both constrain each move; an eligible move may be unsafe.
import { getDirectionVector } from './arrow.js';

const isRune = value => Number.isInteger(value) && value >= 0 && value <= 3;
const cellKey = (x, y) => `${x},${y}`;
export const DEEP_HORIZONS = Object.freeze([4,6,8]);
const horizonCounts = values => Object.fromEntries(DEEP_HORIZONS.map((h,index)=>[h,values[index]]));
const median = values => {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a,b) => a-b), middle = Math.floor(sorted.length/2);
    return sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
};

export function hasRuneOrder(level) {
    return Array.isArray(level?.runeCycle) && level.runeCycle.length >= 2 && level.runeCycle.length <= 6 &&
        level.runeCycle.every(isRune) && Array.isArray(level.paths) && level.paths.every(path => isRune(path.rune));
}

function compileGeometry(level) {
    const width=level?.gridWidth, height=level?.gridHeight;
    if (!Number.isInteger(width) || width<=0 || !Number.isInteger(height) || height<=0 || !Array.isArray(level.paths)) {
        throw new TypeError('Rune solver requires valid grid dimensions and paths');
    }
    const owner=new Map(), walls=new Set();
    for (const cell of level.walls || []) {
        if (!Array.isArray(cell) || cell.length!==2 || !cell.every(Number.isInteger) ||
            cell[0]<0 || cell[0]>=width || cell[1]<0 || cell[1]>=height) throw new TypeError('Invalid wall cell');
        walls.add(cellKey(...cell));
    }
    level.paths.forEach((path,index) => {
        if (!getDirectionVector(path.direction) || !Array.isArray(path.cells) || !path.cells.length) throw new TypeError(`Invalid path ${index}`);
        path.cells.forEach((cell,position) => {
            if (!Array.isArray(cell) || cell.length!==2 || !cell.every(Number.isInteger) ||
                cell[0]<0 || cell[0]>=width || cell[1]<0 || cell[1]>=height) throw new TypeError(`Invalid path cell ${index}`);
            const key=cellKey(...cell);
            if (owner.has(key) || walls.has(key)) throw new TypeError(`Overlapping path cell ${key}`);
            if (position && Math.abs(cell[0]-path.cells[position-1][0])+Math.abs(cell[1]-path.cells[position-1][1])!==1) {
                throw new TypeError(`Disconnected path ${index}`);
            }
            owner.set(key,index);
        });
    });
    const bits=level.paths.map((_,index)=>1n<<BigInt(index)), wallBlocked=[];
    const dependencies=level.paths.map((path,index) => {
        const {dx,dy}=getDirectionVector(path.direction), [hx,hy]=path.cells.at(-1);
        let mask=0n, blocked=false;
        for(let x=hx+dx,y=hy+dy;x>=0&&y>=0&&x<width&&y<height;x+=dx,y+=dy) {
            if (walls.has(cellKey(x,y))) blocked=true;
            const other=owner.get(cellKey(x,y));
            if (other!==undefined && other!==index) mask|=bits[other];
        }
        wallBlocked.push(blocked);
        return mask;
    });
    return {bits,dependencies,wallBlocked};
}

export function createRuneSolver(level, {maxStates=20000} = {}) {
    if (!Number.isInteger(maxStates) || maxStates<1) throw new RangeError('maxStates must be a positive integer');
    const {bits,dependencies,wallBlocked}=compileGeometry(level), n=bits.length;
    if (level.runeCycle!==undefined && !hasRuneOrder(level)) throw new TypeError('Invalid rune cycle or path rune');
    const cycle=hasRuneOrder(level) ? level.runeCycle.slice() : null;
    const runes=level.paths.map(path=>path.rune), full=(1n<<BigInt(n))-1n;
    const memo=new Map();let peakExplored=0;
    const budgetError=Symbol('state budget exceeded');
    function stateFromIndices(indices) {
        if (!Array.isArray(indices)) throw new TypeError('Removed indices must be an array');
        let mask=0n;
        for(const index of indices) {
            if (!Number.isInteger(index) || index<0 || index>=n) throw new RangeError('Invalid removed index');
            if ((mask&bits[index])!==0n) throw new RangeError('Duplicate removed index');
            mask|=bits[index];
        }
        return {mask,count:indices.length};
    }
    const required=count=>cycle ? cycle[count%cycle.length] : null;
    function legal(mask,count,spatialOnly=false) {
        const rune=required(count), choices=[];
        for(let index=0;index<n;index++) {
            if ((mask&bits[index])===0n && !wallBlocked[index] &&
                (dependencies[index]&mask)===dependencies[index] &&
                (spatialOnly || !cycle || runes[index]===rune)) choices.push(index);
        }
        return choices;
    }
    function visit(mask,count) {
        const cached=memo.get(mask);
        if (cached?.complete) return cached;
        if (memo.size>=maxStates) throw budgetError;
        const node={complete:false,legal:[],safe:[],winningOrders:0n,bestNext:null,routeCritical:0,routeTrapSum:0,
            minimumCritical:0,maximumCritical:0,minimumDeep:[0,0,0],maximumDeep:[0,0,0],
            minimumCoupledDeep:[0,0,0],maximumCoupledDeep:[0,0,0],minimumBranchesWithin:[0,0,0,0,0],
            noCriticalPrefix:0,maximumNoCriticalRun:0,forcedPrefix:0,maximumForcedRun:0,minStuck:0,maxStuck:0};
        memo.set(mask,node);peakExplored=Math.max(peakExplored,memo.size);
        if(mask===full) {node.winningOrders=1n;node.complete=true;return node;}
        node.legal=legal(mask,count);
        for(const index of node.legal) {
            const child=visit(mask|bits[index],count+1);
            node.winningOrders+=child.winningOrders;
            if(child.winningOrders>0n)node.safe.push(index);
        }
        if(node.safe.length) {
            const critical=node.legal.length>node.safe.length;
            const traps=node.legal.filter(index=>!node.safe.includes(index)).map(index=>1+memo.get(mask|bits[index]).minStuck);
            const localTrapSum=traps.reduce((sum,distance)=>sum+distance,0);
            node.minimumCritical=Math.min(...node.safe.map(index=>memo.get(mask|bits[index]).minimumCritical))+(critical?1:0);
            node.maximumCritical=Math.max(...node.safe.map(index=>memo.get(mask|bits[index]).maximumCritical))+(critical?1:0);
            for(const [position,horizon] of DEEP_HORIZONS.entries()) {
                // Even the fastest continuation after this wrong choice
                // must require `horizon` removals before a stuck board.
                // Grade every winning continuation, not one sampled route.
                const deep=traps.some(distance=>distance>=horizon)?1:0;
                node.minimumDeep[position]=Math.min(...node.safe.map(index=>memo.get(mask|bits[index]).minimumDeep[position]))+deep;
                node.maximumDeep[position]=Math.max(...node.safe.map(index=>memo.get(mask|bits[index]).maximumDeep[position]))+deep;
                const coupled=node.legal.filter(index=>!node.safe.includes(index)).some(index=>{
                    const child=memo.get(mask|bits[index]);
                    return 1+child.minStuck>=horizon&&child.minimumBranchesWithin[Math.min(4,horizon-1)]>=1;
                })?1:0;
                node.minimumCoupledDeep[position]=Math.min(...node.safe.map(index=>memo.get(mask|bits[index]).minimumCoupledDeep[position]))+coupled;
                node.maximumCoupledDeep[position]=Math.max(...node.safe.map(index=>memo.get(mask|bits[index]).maximumCoupledDeep[position]))+coupled;
            }
            node.noCriticalPrefix=critical?0:1+Math.max(...node.safe.map(index=>memo.get(mask|bits[index]).noCriticalPrefix));
            node.maximumNoCriticalRun=Math.max(node.noCriticalPrefix,...node.safe.map(index=>memo.get(mask|bits[index]).maximumNoCriticalRun));
            node.forcedPrefix=node.legal.length===1?1+Math.max(...node.safe.map(index=>memo.get(mask|bits[index]).forcedPrefix)):0;
            node.maximumForcedRun=Math.max(node.forcedPrefix,...node.safe.map(index=>memo.get(mask|bits[index]).maximumForcedRun));
            for(const index of node.safe) {
                const child=memo.get(mask|bits[index]);
                const previous=node.bestNext===null ? null : memo.get(mask|bits[node.bestNext]);
                // Hints follow an easiest winning route, with index order as
                // a stable tie-break. Grade uses the minimum over ALL routes.
                if(!previous || child.minimumCritical<previous.minimumCritical) node.bestNext=index;
            }
            const best=memo.get(mask|bits[node.bestNext]);
            node.routeCritical=best.routeCritical+(critical?1:0);
            node.routeTrapSum=best.routeTrapSum+localTrapSum;
        } else if(node.legal.length) {
            node.minStuck=1+Math.min(...node.legal.map(index=>memo.get(mask|bits[index]).minStuck));
            node.maxStuck=1+Math.max(...node.legal.map(index=>memo.get(mask|bits[index]).maxStuck));
            // Reject artificial depth caused only by a forced corridor. A
            // coupled wrong branch must encounter another legal decision in
            // every continuation, within its first four subsequent moves.
            for(let window=1;window<=4;window++)node.minimumBranchesWithin[window]=
                (node.legal.length>1?1:0)+Math.min(...node.legal.map(index=>memo.get(mask|bits[index]).minimumBranchesWithin[window-1]));
        }
        node.complete=true;return node;
    }
    function solutionFrom(mask,count) {
        const result=[];
        while(mask!==full) {
            const node=memo.get(mask);
            if(!node?.complete || node.bestNext===null)return [];
            result.push(node.bestNext);mask|=bits[node.bestNext];count++;
        }
        return result;
    }
    function analyze(removedIndices=[]) {
        const {mask,count}=stateFromIndices(removedIndices), choices=legal(mask,count);
        try {
            const node=visit(mask,count), solved=node.winningOrders>0n;
            return {status:solved?'solvable':'unsolvable',solvable:solved,legalMoves:choices,
                safeMoves:node.safe.slice(),solution:solved?solutionFrom(mask,count):[],
                explored:memo.size,budgetExceeded:false,removedCount:count,requiredRune:required(count)};
        } catch(error) {
            if(error!==budgetError)throw error;
            // A bounded search cannot prove failure. Keep only finished cache
            // nodes; never expose an unproven hint or silently label it stuck.
            for(const [key,node]of memo)if(!node.complete)memo.delete(key);
            return {status:'unknown',solvable:null,legalMoves:choices,safeMoves:[],solution:[],
                explored:peakExplored,budgetExceeded:true,removedCount:count,requiredRune:required(count)};
        }
    }
    function audit() {
        const initial=analyze([]);
        if(initial.status==='unknown')return {...initial,reachableStates:initial.explored,winningOrders:null,
            minimumCriticalDecisions:null,maximumCriticalDecisions:null,
            minimumDeepCriticalDecisions:null,maximumDeepCriticalDecisions:null,
            minimumDeepBranchingDecisions:null,maximumDeepBranchingDecisions:null,maximumNoCriticalRun:null,maximumForcedRun:null};
        // analyze() also accepts arbitrary removed sets. Those queries may
        // add unreachable cache nodes; campaign grades describe only states
        // reached by legal moves from the intact board.
        const reachable=new Set(),pending=[0n];
        while(pending.length) {
            const mask=pending.pop();
            if(reachable.has(mask))continue;
            reachable.add(mask);
            for(const index of memo.get(mask).legal)pending.push(mask|bits[index]);
        }
        let mixedChoiceStates=0,winningDecisionStates=0,unsafeChoices=0,decisionChoices=0,deadEnds=0;
        const unsafeChoicesByEarliestDeadend={};
        for(const mask of reachable) {
            const node=memo.get(mask);
            if(mask!==full && !node.legal.length)deadEnds++;
            if(node.winningOrders>0n && node.legal.length>1) {
                winningDecisionStates++;decisionChoices+=node.legal.length;
                unsafeChoices+=node.legal.length-node.safe.length;
                if(node.legal.length>node.safe.length)mixedChoiceStates++;
                for(const index of node.legal.filter(index=>!node.safe.includes(index))) {
                    const distance=1+memo.get(mask|bits[index]).minStuck;
                    unsafeChoicesByEarliestDeadend[distance]=(unsafeChoicesByEarliestDeadend[distance]||0)+1;
                }
            }
        }
        const criticalSteps=[],trapLookaheads=[],solutionDeep=[0,0,0];let mask=0n,count=0,totalLegal=0,totalUnsafe=0;
        for(const pick of initial.solution) {
            const node=memo.get(mask), unsafe=node.legal.filter(index=>!node.safe.includes(index));
            totalLegal+=node.legal.length;totalUnsafe+=unsafe.length;
            if(unsafe.length) {
                const lookaheads=unsafe.map(index=>1+memo.get(mask|bits[index]).minStuck);
                criticalSteps.push({step:count,legalMoves:node.legal.slice(),safeMoves:node.safe.slice(),
                    unsafeMoves:unsafe,minimumTrapLookahead:Math.min(...lookaheads),
                    unsafeLookaheads:unsafe.map((index,position)=>({index,earliestDeadend:lookaheads[position]}))});
                trapLookaheads.push(...lookaheads);
                DEEP_HORIZONS.forEach((horizon,position)=>{if(lookaheads.some(distance=>distance>=horizon))solutionDeep[position]++;});
            }
            mask|=bits[pick];count++;
        }
        return {...initial,reachableStates:reachable.size,winningOrders:memo.get(0n).winningOrders.toString(),
            mixedChoiceStates,winningDecisionStates,deadEnds,criticalDecisionsOnSolution:criticalSteps.length,
            minimumCriticalDecisions:initial.solvable?memo.get(0n).minimumCritical:null,
            maximumCriticalDecisions:initial.solvable?memo.get(0n).maximumCritical:null,
            minimumDeepCriticalDecisions:initial.solvable?horizonCounts(memo.get(0n).minimumDeep):null,
            maximumDeepCriticalDecisions:initial.solvable?horizonCounts(memo.get(0n).maximumDeep):null,
            minimumDeepBranchingDecisions:initial.solvable?horizonCounts(memo.get(0n).minimumCoupledDeep):null,
            maximumDeepBranchingDecisions:initial.solvable?horizonCounts(memo.get(0n).maximumCoupledDeep):null,
            maximumNoCriticalRun:initial.solvable?memo.get(0n).maximumNoCriticalRun:null,
            maximumForcedRun:initial.solvable?memo.get(0n).maximumForcedRun:null,
            deepCriticalDecisionsOnSolution:horizonCounts(solutionDeep),
            immediateUnsafeChoices:unsafeChoicesByEarliestDeadend[1]||0,unsafeChoicesByEarliestDeadend,
            criticalChoiceDensity:n?criticalSteps.length/n:0,criticalSteps,
            unsafeChoiceRatio:decisionChoices?unsafeChoices/decisionChoices:0,
            solutionUnsafeChoiceRatio:totalLegal?totalUnsafe/totalLegal:0,
            trapLookaheadMedian:median(trapLookaheads),trapLookaheads,
            // Includes the selected wrong removal; e.g. 3 means two more
            // eligible removals can follow before the earliest stuck state.
            trapLookaheadIncludesWrongMove:true};
    }
    return {analyze,audit,pathCount:n,runeCycle:cycle?.slice()||null,
        spatialMoves(removedIndices=[]) {const {mask,count}=stateFromIndices(removedIndices);return legal(mask,count,true);}};
}
