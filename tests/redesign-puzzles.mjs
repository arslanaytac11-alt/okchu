import assert from 'node:assert/strict';
import { allLevels, getLevelById, getNextLevel } from '../js/levels.js';
import { Grid } from '../js/grid.js';
import { auditPuzzle, silhouetteCells, carveSilhouette } from '../js/puzzle-catalog.js';
import { validateAllLevels, validateLevel } from '../js/level-validator.js';
import { getPuzzleTimeLimit } from '../js/balance.js';
import { Renderer } from '../js/renderer.js';
import { hitTestPath } from '../js/hit-test.js';
import { ArrowState, getDirectionVector } from '../js/arrow.js';
import { createRuneSolver, hasRuneOrder } from '../js/rune-order.js';

const chapterKeys = ['egypt','greek','rome','viking','ottoman','china','maya','india','medieval','final'];
const expectedIds = chapterKeys.flatMap(key => [1,2,3,4,5].map(n => `${key}_${n}`));
assert.deepEqual(allLevels.map(l => l.id), expectedIds, 'Existing save IDs and order must remain compatible');
assert.equal(validateAllLevels(allLevels).filter(r => r.solvable).length, 50);
assert.equal(getLevelById('unknown'), null);
assert.equal(getNextLevel('final_5'), null);

assert.equal(allLevels.filter(hasRuneOrder).length, 48, 'Only the first two guides omit the visible code');
assert.ok(allLevels.slice(0, 2).every(level => !hasRuneOrder(level)));
assert.ok(allLevels.slice(2).every(hasRuneOrder));

let gridSolutions = 0, safeChoiceSolutions = 0, exactStateChecks = 0;
let unsafeChoiceChecks = 0, deadEndChecks = 0, recoverySolutions = 0;
const details = [];
function loadGrid(level) {
    const grid = new Grid(level.gridWidth, level.gridHeight);
    grid.loadFromData(level.paths, level.walls || [], level.runeCycle || []);
    return grid;
}
function checkState(grid, level, solver, removed) {
    const analysis = solver.analyze(removed);
    assert.notEqual(analysis.status, 'unknown', `${level.id}: a search limit cannot prove a move safe`);
    const actual = grid.paths.flatMap((path, index) => grid.isPathClear(path) ? [index] : []);
    assert.deepEqual(actual, analysis.legalMoves, `${level.id}: real Grid geometry and rune phase must agree with exact analysis`);
    assert.deepEqual(grid.getRemovedIndices(), removed.slice().sort((a, b) => a - b));
    const required = hasRuneOrder(level) ? level.runeCycle[removed.length % level.runeCycle.length] : null;
    assert.equal(grid.getCurrentRune(), required, `${level.id}: successful removal/undo drives the visible code`);
    assert.equal(analysis.requiredRune, required);
    exactStateChecks++;
    return analysis;
}
function remove(grid, index) {
    assert.equal(grid.isPathClear(grid.paths[index]), true, 'A simulated move must be eligible in the real Grid');
    grid.finalizeRemoval(grid.paths[index]);
}
for (const level of allLevels) {
    const audit = auditPuzzle(level);
    assert.equal(audit.solvable, true, `${level.id}: ${audit.errors}`);
    assert.ok(level.gridWidth <= 26 && level.gridHeight <= 32, `${level.id}: reviewed phone board cap; dense boards require zoom`);
    assert.equal(audit.totalPaths, level.balance.totalPaths);
    assert.equal(audit.dependencyDepth, level.balance.dependencyDepth);
    assert.equal(audit.blockedRatio, level.balance.blockedRatio);
    const actualCells = level.paths.flatMap(p => p.cells).map(c => c.join(',')).sort();
    const footprint = level.boardCells || silhouetteCells(level.shape, level.gridWidth, level.gridHeight);
    assert.equal(new Set(footprint.map(cell => cell.join(','))).size, footprint.length,
        `${level.id}: authored board footprint has no duplicate cells`);
    assert.deepEqual(actualCells, footprint.map(c => c.join(',')).sort(), `${level.id}: complete authored footprint must agree with every logical cell`);
    const solver = createRuneSolver(level), runeAudit = solver.audit();
    assert.equal(runeAudit.status, 'solvable', `${level.id}: exact winning continuation required`);
    assert.equal(runeAudit.budgetExceeded, false);
    for (const horizon of [4,6,8]) {
        const minimum = runeAudit.minimumDeepCriticalDecisions[horizon];
        const maximum = runeAudit.maximumDeepCriticalDecisions[horizon];
        const canonical = runeAudit.criticalSteps.filter(step =>
            step.unsafeLookaheads.some(option => option.earliestDeadend >= horizon)).length;
        assert.ok(Number.isInteger(minimum) && minimum >= 0 && minimum <= runeAudit.minimumCriticalDecisions);
        assert.ok(Number.isInteger(maximum) && maximum >= minimum && maximum <= runeAudit.maximumCriticalDecisions);
        assert.equal(runeAudit.deepCriticalDecisionsOnSolution[horizon], canonical,
            `${level.id}: deep canonical count must come from actual unsafe branch horizons`);
        assert.ok(canonical >= minimum && canonical <= maximum);
        const target = level.balance.authoring?.deepTargets?.[horizon];
        if (target !== undefined) assert.ok(minimum >= target,
            `${level.id}: an easier winning route must not evade the ${horizon}-move depth floor`);
    }
    assert.equal(level.solution.length, level.paths.length, `${level.id}: recorded solution removes every arrow`);
    assert.equal(new Set(level.solution).size, level.paths.length, `${level.id}: recorded solution cannot repeat arrows`);
    let grid = loadGrid(level), removed = [];
    if (hasRuneOrder(level)) {
        const runtimeAnalysis = grid.getRuneAnalysis();
        assert.equal(runtimeAnalysis.status, 'solvable');
        assert.deepEqual(runtimeAnalysis.safeMoves, runeAudit.safeMoves, `${level.id}: gameplay hint solver agrees with exact proof`);
    }
    for (const index of level.solution) {
        const state = checkState(grid, level, solver, removed);
        assert.ok(state.safeMoves.includes(index), `${level.id}: recorded solution must use an exactly proven safe move`);
        remove(grid, index); removed.push(index);
    }
    assert.equal(checkState(grid, level, solver, removed).status, 'solvable');
    assert.equal(grid.isCleared(), true); gridSolutions++;
    // Coded boards intentionally have eligible but losing choices. Vary only
    // EXACT safe choices: no greedy spatial order or unknown search is accepted.
    for (let seed = 1; seed <= 20; seed++) {
        grid = loadGrid(level); removed = [];
        let randomState = seed * 53;
        while (!grid.isCleared()) {
            const state = checkState(grid, level, solver, removed);
            assert.equal(state.status, 'solvable', `${level.id}: safe route must retain a winning continuation`);
            assert.ok(state.safeMoves.length, `${level.id}: exact safe route got stuck`);
            randomState = (randomState * 1664525 + 1013904223) >>> 0;
            const next = state.safeMoves[randomState % state.safeMoves.length];
            remove(grid, next); removed.push(next);
        }
        assert.equal(checkState(grid, level, solver, removed).status, 'solvable');
        safeChoiceSolutions++;
    }
    if (hasRuneOrder(level)) {
        assert.ok(runeAudit.minimumCriticalDecisions >= 1, `${level.id}: even the easiest winning route must require an order decision`);
        assert.equal(runeAudit.criticalDecisionsOnSolution, runeAudit.minimumCriticalDecisions,
            `${level.id}: grade the easiest route, never a cherry-picked maximum`);
        const critical = runeAudit.criticalSteps[0];
        assert.ok(critical?.unsafeMoves.length, `${level.id}: critical choice must be real`);
        grid = loadGrid(level); removed = runeAudit.solution.slice(0, critical.step);
        for (const index of removed) remove(grid, index);
        const before = checkState(grid, level, solver, removed), wrong = critical.unsafeMoves[0];
        assert.ok(before.legalMoves.includes(wrong) && !before.safeMoves.includes(wrong), `${level.id}: losing move is eligible, not a blocked tap`);
        const trapMoves = [wrong]; remove(grid, wrong); removed.push(wrong); unsafeChoiceChecks++;
        let trapped = checkState(grid, level, solver, removed);
        assert.equal(trapped.status, 'unsolvable', `${level.id}: an unsafe choice really removes every winning continuation`);
        while (trapped.legalMoves.length) {
            const next = trapped.legalMoves[0]; remove(grid, next); removed.push(next); trapMoves.push(next);
            trapped = checkState(grid, level, solver, removed);
            assert.equal(trapped.status, 'unsolvable');
        }
        assert.equal(grid.isCleared(), false, `${level.id}: a dead end cannot be mistaken for completion`);
        assert.equal(grid.getRemovablePaths().length, 0); deadEndChecks++;
        // Restore the original paths exactly as gameplay undo restores states;
        // each rollback must also restore the visible phase, not only geometry.
        for (const index of trapMoves.reverse()) {
            assert.equal(removed.pop(), index);
            grid.paths[index].state = ArrowState.IDLE; grid.updateRemovableStates();
            checkState(grid, level, solver, removed);
        }
        const recovered = checkState(grid, level, solver, removed);
        assert.equal(recovered.status, 'solvable');
        assert.deepEqual(recovered.safeMoves, before.safeMoves, `${level.id}: undo recovers the original safe choices`);
        for (const index of recovered.solution) {remove(grid, index); removed.push(index);}
        assert.equal(grid.isCleared(), true); recoverySolutions++;
    }
    assert.ok(getPuzzleTimeLimit(level) >= 40 + level.paths.length * 2.8);
    assert.equal(getPuzzleTimeLimit(level, 'timed'), Math.round(getPuzzleTimeLimit(level) * 0.65));
    assert.equal(getPuzzleTimeLimit(level, 'classic', {type:'time',multiplier:0.6}), Math.round(getPuzzleTimeLimit(level) * 0.6));
    details.push({id:level.id, shape:level.shape, arrows:audit.totalPaths, dependencyDepth:audit.dependencyDepth,
        initialChoices:audit.initialChoices, minimumCriticalDecisions:runeAudit.minimumCriticalDecisions,
        maximumCriticalDecisions:runeAudit.maximumCriticalDecisions, reachableStates:runeAudit.reachableStates,
        trapLookaheadMedian:runeAudit.trapLookaheadMedian,
        minimumDeepCriticalDecisions:runeAudit.minimumDeepCriticalDecisions,
        maximumDeepCriticalDecisions:runeAudit.maximumDeepCriticalDecisions,
        minimumDeepBranchingDecisions:runeAudit.minimumDeepBranchingDecisions,
        maximumNoCriticalRun:runeAudit.maximumNoCriticalRun,
        immediateUnsafeChoices:runeAudit.immediateUnsafeChoices});
}
assert.deepEqual(allLevels.slice(0,2).map(l => l.paths.length), [10,16], 'Reauthored ordinary guides retain the two-step rule introduction');
assert.equal(gridSolutions, 50); assert.equal(safeChoiceSolutions, 1000);
assert.equal(unsafeChoiceChecks, 48); assert.equal(deadEndChecks, 48); assert.equal(recoverySolutions, 48);
const chapterCriticalDecisions = chapterKeys.map((_, i) => details.slice(i * 5, i * 5 + 5)
    .reduce((sum, level) => sum + level.minimumCriticalDecisions, 0) / 5);
assert.equal(allLevels.filter(level => level.boardCells?.length).length, 45,
    'All nine later chapters use the new actual seal geometry, keeping the five Egyptian introductions');
const chapterDeepDecisions = chapterKeys.map((_, i) => Object.fromEntries([4,6,8].map(horizon =>
    [horizon,details.slice(i * 5,i * 5 + 5).reduce((sum,level)=>sum+level.minimumDeepCriticalDecisions[horizon],0)/5])));
// Raw critical counts can rise while every wrong choice is obvious. Final
// progression is enforced through exact minimumDeepTargets and branching
// floors in the independent level audit, rather than this count average.

// Reject genuine unsolvable and malformed fixtures, including >32 arrows
// that the previous bit-mask BFS could not represent.
const cycle = {gridWidth:4,gridHeight:4,paths:[{cells:[[1,1]],direction:'right'},{cells:[[2,1]],direction:'left'}]};
assert.equal(validateLevel(cycle).solvable, false);
assert.equal(validateLevel({...cycle,walls:[[3,1]],paths:[cycle.paths[0]]}).solvable, false);
assert.equal(validateLevel({gridWidth:4,gridHeight:4,paths:[{cells:[[1,1],[3,1]],direction:'up'}]}).solvable, false);
assert.equal(validateLevel({gridWidth:40,gridHeight:2,paths:Array.from({length:40},(_,i)=>({cells:[[i,0]],direction:'up'}))}).solvable, true);
const cells = silhouetteCells('pyramid', 11, 13);
assert.deepEqual(carveSilhouette(cells,11,13,42), carveSilhouette(cells,11,13,42), 'Authoring must be reproducible');
const unknown = createRuneSolver(allLevels[2], {maxStates:1}).analyze([]);
assert.equal(unknown.status, 'unknown'); assert.equal(unknown.solvable, null);
assert.deepEqual(unknown.safeMoves, []); assert.deepEqual(unknown.solution, []);

// Geometry-only canvas fixture; this verifies fit/resize and focal mapping,
// not physical touch quality or WKWebView rendering.
globalThis.window = {devicePixelRatio:3,matchMedia:()=>({matches:false})};
globalThis.document = {body:{classList:{contains:()=>false}}};
let width = 320, height = 430;
const context = new Proxy({}, {get:(_target, name) => name === 'createLinearGradient' ? ()=>({addColorStop(){}}) : ()=>{}});
const canvas = {
    clientWidth:320,clientHeight:430,
    parentElement:{classList:{contains:name=>name==='board-area'},getBoundingClientRect:()=>({width,height})},
    getContext:()=>context,getBoundingClientRect:()=>({left:17,top:80,width,height}),
};
const renderer = new Renderer(canvas);
renderer.resize(15,17);
assert.equal(canvas.width, 960);
assert.equal(canvas.height, 1290);
renderer.setZoom(2, 177, 295);
const before = renderer.getFractionalCellFromPoint(177,295);
width = 760; height = 400;
renderer.resize(15,17,{preserveView:true});
const after = renderer.getFractionalCellFromPoint(17 + width/2,80 + height/2);
assert.ok(Math.abs(before.fx-after.fx)<1e-9 && Math.abs(before.fy-after.fy)<1e-9, 'Resizing must keep the board center on the same cell');
assert.equal(renderer.scale, 2);
assert.equal(renderer._cssWidth, 760, 'Board area governs size even with stale canvas.clientWidth');
renderer.resetView({width:15,height:17});
assert.equal(renderer.scale,1);assert.equal(renderer.panX,0);assert.equal(renderer.panY,0);
const metrics = renderer._getArrowMetrics();
assert.ok(metrics.widthCss > 0 && metrics.widthCss <= 2.35, 'Thin shaft has a fixed CSS-pixel cap');
assert.ok(metrics.widthCss <= renderer.cellSize * renderer.scale * .16, 'Small cells must not turn shafts into solid bars');
assert.ok(metrics.headCss > 0 && metrics.headCss <= 8, 'The open chevron keeps a small screen-space cap');
renderer._motionQuery.matches = true;
assert.equal(renderer.reducedMotion,true);
renderer.setTheme({},10);
assert.equal(renderer.theme.arrowIdle,'#234d48');

let silhouetteFitCases=0,silhouetteHitCases=0,fitFocalCases=0,originalFootprintChecks=0;
for (const [poseWidth,poseHeight] of [[320,450],[390,530],[760,300]]) for (const level of allLevels) {
    width=poseWidth;height=poseHeight;
    renderer.setBoardShape(level.shape,level.gridWidth,level.gridHeight,level.boardCells);
    renderer.resize(level.gridWidth,level.gridHeight);
    const bounds=renderer._boardShapeBounds;
    assert.ok(bounds,`${level.id}: original silhouette bounds`);
    const expectedSize=Math.floor(Math.min((width-40)/(bounds.right-bounds.left),(height-40)/(bounds.bottom-bounds.top)));
    assert.equal(renderer.cellSize,expectedSize,`${level.id}: fit the silhouette, not empty grid margins`);
    const left=renderer.gridOffsetX+bounds.left*renderer.cellSize,right=renderer.gridOffsetX+bounds.right*renderer.cellSize;
    const top=renderer.gridOffsetY+bounds.top*renderer.cellSize,bottom=renderer.gridOffsetY+bounds.bottom*renderer.cellSize;
    assert.ok(left>=20&&top>=20&&right<=width-20&&bottom<=height-20,'Complete footprint needs safe padding');
    assert.ok(Math.abs((left+right)/2-width/2)<1e-8&&Math.abs((top+bottom)/2-height/2)<1e-8,'Original silhouette must be centered');
    const grid=new Grid(level.gridWidth,level.gridHeight);grid.loadFromData(level.paths);
    for(const path of grid.paths){
        const metrics=renderer._getArrowMetrics();
        assert.ok(metrics.widthCss>0&&metrics.widthCss<=2.35,`${level.id}: slim screen-space shaft cap`);
        assert.ok(metrics.widthCss<=renderer.cellSize*renderer.scale*.16,`${level.id}: shaft preserves visible cell separation`);
        assert.ok(metrics.headCss>0&&metrics.headCss<=8,`${level.id}: chevron remains compact`);
        const {points,tipX,tipY}=renderer._buildPathPoints(path,metrics),{dx,dy}=getDirectionVector(path.direction);
        const vertices=[...points,{x:tipX,y:tipY},{x:tipX-dx*metrics.headSize-dy*metrics.headSize*metrics.headSpread,y:tipY-dy*metrics.headSize+dx*metrics.headSize*metrics.headSpread},{x:tipX-dx*metrics.headSize+dy*metrics.headSize*metrics.headSpread,y:tipY-dy*metrics.headSize-dx*metrics.headSize*metrics.headSpread}];
        assert.ok(vertices.every(p=>p.x>=10&&p.x<=width-10&&p.y>=10&&p.y<=height-10),`${level.id}: large arrowheads cannot clip`);
        const head=path.getHead();const x=17+renderer.gridOffsetX+(head.x+.5)*renderer.cellSize,y=80+renderer.gridOffsetY+(head.y+.5)*renderer.cellSize;
        assert.equal(hitTestPath(grid,renderer,x,y),path,`${level.id}: fitted origin must preserve exact head ownership`);
        silhouetteHitCases++;
    }
    silhouetteFitCases++;
    renderer.setZoom(1.8,17+width/2,80+height/2);
    const focal=renderer.getFractionalCellFromPoint(17+width/2,80+height/2);
    [width,height]=height>width?[760,300]:[390,530];
    renderer.resize(level.gridWidth,level.gridHeight,{preserveView:true});
    const resizedFocal=renderer.getFractionalCellFromPoint(17+width/2,80+height/2);
    assert.ok(Math.abs(focal.fx-resizedFocal.fx)<1e-8&&Math.abs(focal.fy-resizedFocal.fy)<1e-8,'Resize preserves the original cell under the board center');
    assert.equal(renderer.scale,1.8);fitFocalCases++;
    const originalFit=[renderer.cellSize,renderer.gridOffsetX,renderer.gridOffsetY,JSON.stringify(renderer._boardShapeBounds)];
    grid.finalizeRemoval(grid.paths[0]);renderer.resize(level.gridWidth,level.gridHeight,{preserveView:true});
    assert.deepEqual([renderer.cellSize,renderer.gridOffsetX,renderer.gridOffsetY,JSON.stringify(renderer._boardShapeBounds)],originalFit,'Removing an arrow must never shrink/refit the remaining board');originalFootprintChecks++;
}
const sphinx=allLevels[1];width=354;height=529;renderer.setBoardShape(sphinx.shape,sphinx.gridWidth,sphinx.gridHeight);renderer.resize(sphinx.gridWidth,sphinx.gridHeight);
assert.ok(renderer.cellSize*(renderer._boardShapeBounds.right-renderer._boardShapeBounds.left)>=300,'Sphinx must use the phone board width instead of floating in a large empty grid');
renderer.setBoardShape('unsupported-custom-shape',4,6);renderer.resize(4,6);assert.equal(renderer._boardShapeBounds,null);assert.equal(renderer.cellSize,Math.floor(Math.min((width-40)/4,(height-40)/6)),'Unknown custom shapes fall back to the complete grid');

console.log(JSON.stringify({campaignPuzzles:allLevels.length,codedPuzzles:allLevels.filter(hasRuneOrder).length,
    gridSolutions,safeChoiceSolutions,exactStateChecks,unsafeChoiceChecks,deadEndChecks,recoverySolutions,
    chapterCriticalDecisions,chapterDeepDecisions,invalidFixturesRejected:3,largeValidatorFixture:40,unknownSearchRejected:true,
    rendererFitChecks:8,silhouetteFitCases,silhouetteHitCases,fitFocalCases,originalFootprintChecks,details},null,2));
