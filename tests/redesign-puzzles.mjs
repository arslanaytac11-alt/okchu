import assert from 'node:assert/strict';
import { allLevels, getLevelById, getNextLevel } from '../js/levels.js';
import { Grid } from '../js/grid.js';
import { auditPuzzle, silhouetteCells, carveSilhouette } from '../js/puzzle-catalog.js';
import { validateAllLevels, validateLevel } from '../js/level-validator.js';
import { getPuzzleTimeLimit } from '../js/balance.js';
import { Renderer } from '../js/renderer.js';
import { hitTestPath } from '../js/hit-test.js';
import { getDirectionVector } from '../js/arrow.js';

const chapterKeys = ['egypt','greek','rome','viking','ottoman','china','maya','india','medieval','final'];
const expectedIds = chapterKeys.flatMap(key => [1,2,3,4,5].map(n => `${key}_${n}`));
assert.deepEqual(allLevels.map(l => l.id), expectedIds, 'Existing save IDs and order must remain compatible');
assert.equal(validateAllLevels(allLevels).filter(r => r.solvable).length, 50);
assert.equal(getLevelById('unknown'), null);
assert.equal(getNextLevel('final_5'), null);

let gridSolutions = 0, shuffledSolutions = 0;
const details = [];
for (const level of allLevels) {
    const audit = auditPuzzle(level);
    assert.equal(audit.solvable, true, `${level.id}: ${audit.errors}`);
    assert.ok(level.gridWidth <= 15 && level.gridHeight <= 17, `${level.id}: phone board cap`);
    assert.equal(audit.totalPaths, level.balance.totalPaths);
    assert.equal(audit.dependencyDepth, level.balance.dependencyDepth);
    assert.equal(audit.blockedRatio, level.balance.blockedRatio);
    const actualCells = level.paths.flatMap(p => p.cells).map(c => c.join(',')).sort();
    assert.deepEqual(actualCells, silhouetteCells(level.shape, level.gridWidth, level.gridHeight).map(c => c.join(',')).sort(), `${level.id}: silhouette must be complete`);
    const grid = new Grid(level.gridWidth, level.gridHeight);
    grid.loadFromData(level.paths, level.walls || []);
    for (const index of level.solution) {
        assert.equal(grid.isPathClear(grid.paths[index]), true, `${level.id}: recorded solution must use the real Grid`);
        grid.finalizeRemoval(grid.paths[index]);
    }
    assert.equal(grid.isCleared(), true); gridSolutions++;
    // Any legal choice must remain solvable. Varying the removal order guards
    // against the authoring proof accidentally relying on one special order.
    for (let seed = 1; seed <= 20; seed++) {
        grid.loadFromData(level.paths, level.walls || []);
        let randomState = seed * 53;
        while (!grid.isCleared()) {
            const open = grid.paths.filter(path => grid.isPathClear(path));
            assert.ok(open.length, `${level.id}: legal order got stuck`);
            randomState = (randomState * 1664525 + 1013904223) >>> 0;
            grid.finalizeRemoval(open[randomState % open.length]);
        }
        shuffledSolutions++;
    }
    assert.ok(getPuzzleTimeLimit(level) >= 40 + level.paths.length * 2.8);
    assert.equal(getPuzzleTimeLimit(level, 'timed'), Math.round(getPuzzleTimeLimit(level) * 0.65));
    assert.equal(getPuzzleTimeLimit(level, 'classic', {type:'time',multiplier:0.6}), Math.round(getPuzzleTimeLimit(level) * 0.6));
    details.push({id:level.id, shape:level.shape, arrows:audit.totalPaths, dependencyDepth:audit.dependencyDepth, initialChoices:audit.initialChoices});
}
assert.deepEqual(allLevels.slice(0,3).map(l => l.paths.length), [5,8,8], 'First two boards retain their guide; third introduces deeper bent paths without extra tap density');
assert.deepEqual(allLevels.slice(0,3).map(l => l.balance.dependencyDepth), [2,3,4]);
assert.deepEqual(allLevels.slice(5,10).map(l => l.balance.dependencyDepth), [5,5,6,6,7], 'Greek planning progresses beyond Egypt with a deeper final puzzle');
const chapterDepths = chapterKeys.map((_, i) => allLevels.slice(i * 5, i * 5 + 5).reduce((sum, l) => sum + l.balance.dependencyDepth, 0) / 5);
for (let i = 1; i < chapterDepths.length; i++) assert.ok(chapterDepths[i] >= chapterDepths[i - 1], 'Average dependency depth must progress');
assert.ok(chapterDepths[9] > chapterDepths[0] * 2);

// Reject genuine unsolvable and malformed fixtures, including >32 arrows
// that the previous bit-mask BFS could not represent.
const cycle = {gridWidth:4,gridHeight:4,paths:[{cells:[[1,1]],direction:'right'},{cells:[[2,1]],direction:'left'}]};
assert.equal(validateLevel(cycle).solvable, false);
assert.equal(validateLevel({...cycle,walls:[[3,1]],paths:[cycle.paths[0]]}).solvable, false);
assert.equal(validateLevel({gridWidth:4,gridHeight:4,paths:[{cells:[[1,1],[3,1]],direction:'up'}]}).solvable, false);
assert.equal(validateLevel({gridWidth:40,gridHeight:2,paths:Array.from({length:40},(_,i)=>({cells:[[i,0]],direction:'up'}))}).solvable, true);
const cells = silhouetteCells('pyramid', 11, 13);
assert.deepEqual(carveSilhouette(cells,11,13,42), carveSilhouette(cells,11,13,42), 'Authoring must be reproducible');

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
assert.ok(metrics.width >= 3.5 && metrics.width <= renderer.cellSize * .24);
renderer._motionQuery.matches = true;
assert.equal(renderer.reducedMotion,true);
renderer.setTheme({},10);
assert.equal(renderer.theme.arrowIdle,'#234d48');

let silhouetteFitCases=0,silhouetteHitCases=0,fitFocalCases=0,originalFootprintChecks=0;
for (const [poseWidth,poseHeight] of [[320,450],[390,530],[760,300]]) for (const level of allLevels) {
    width=poseWidth;height=poseHeight;
    renderer.setBoardShape(level.shape,level.gridWidth,level.gridHeight);
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
        assert.ok(metrics.width>=3.5,`${level.id}: normal-fit shaft remains readable`);
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

console.log(JSON.stringify({campaignPuzzles:allLevels.length,gridSolutions,shuffledSolutions,chapterDepths,invalidFixturesRejected:3,largeValidatorFixture:40,rendererFitChecks:8,silhouetteFitCases,silhouetteHitCases,fitFocalCases,originalFootprintChecks,details},null,2));
