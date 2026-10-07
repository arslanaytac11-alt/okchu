import assert from 'node:assert/strict';
import {allLevels} from '../js/levels.js';
import {Grid} from '../js/grid.js';
import {CAMPAIGN_SHAPES,silhouetteCells,auditPuzzle} from '../js/puzzle-catalog.js';
import {authorSilhouette,authorSealGeometry,pathVariety,campaignRuneCycles,authorRuneOrder,FINAL_SEAL_WORD} from '../js/puzzle-authoring.js';
import {createRuneSolver,hasRuneOrder} from '../js/rune-order.js';

// Save identities and historical theme labels remain stable. Forty-five
// physical footprints are deliberately replaced by long, interleaved seals.
const chapterKeys=['egypt','greek','rome','viking','ottoman','china','maya','india','medieval','final'];
const chapterCriticalFloors=[0,3,3,4,5,6,6,7,8,8];
const sealCycles=[[0,1,2],[0,1,0,2],[0,0,1,2],[0,1,0,2,1,3],[0,0,1,2,1,3],
    [0,0,1,1,2,3],[0,1,0,1,2,3],[0,1,2,1,0,3],[0,1,2,3],
    [0,0,1,1,2,2],[0,1,0,1,2],[0,1,2,0,1,2]];
const geometryOnly=paths=>paths.map(({cells,direction})=>({cells,direction}));
const sortedCells=cells=>cells.map(cell=>cell.join(',')).sort();
assert.equal(allLevels.length,50);
assert.equal(new Set(allLevels.map(level=>level.id)).size,50);
assert.equal(new Set(allLevels.map(level=>level.shape)).size,47);
assert.deepEqual(allLevels.slice(0,2).map(level=>level.paths.length),[10,16]);
assert.ok(allLevels.slice(0,2).every(level=>!hasRuneOrder(level)&&!level.paths.some(path=>path.rune!==undefined)),
    'The first two introductions teach spatial movement before codes appear');

let geometryReproductions=0,runeReproductions=0,actualGridRemovals=0,criticalBoards=0;
let bentPaths=0,uPaths=0,zPaths=0,maxReachableStates=0,sealBoards=0,minimumTargetBoards=0;
const chapterDirections=Array.from({length:10},()=>new Set());
for(const [offset,level] of allLevels.entries()) {
    const chapter=Math.floor(offset/5)+1,position=offset%5+1,config=level.balance.authoring;
    assert.equal(level.id,`${chapterKeys[chapter-1]}_${position}`);
    assert.equal(level.chapter,chapter);assert.equal(level.level,offset+1);
    assert.equal(level.shape,CAMPAIGN_SHAPES[chapter-1][position-1]);
    assert.ok(level.gridWidth<=26&&level.gridHeight<=32,`${level.id}: narrow-phone density bound`);
    assert.ok(level.paths.length<=75,`${level.id}: no excessive population`);
    const silhouette=level.boardCells||silhouetteCells(level.shape,level.gridWidth,level.gridHeight);
    assert.deepEqual(sortedCells(level.paths.flatMap(path=>path.cells)),sortedCells(silhouette),
        `${level.id}: paths cover the complete silhouette once`);
    const spatial=auditPuzzle(level);assert.equal(spatial.solvable,true,`${level.id}: spatial audit`);
    assert.ok(spatial.initialChoices>=3&&spatial.initialChoices<=8,`${level.id}: several initial spatial exits`);
    for(const key of ['totalPaths','initialChoices','dependencyDepth','dependencyEdges','occupiedCells']) {
        assert.equal(level.balance[key],spatial[key],`${level.id}: spatial metadata ${key}`);
    }
    assert.equal(config.maxStates,20000,'Unknown cannot silently be relabeled as a failed solution');
    const plain=geometryOnly(level.paths);
    if(config.kind==='seals') {
        const reproduced=authorSealGeometry(config.chainCounts,{bodyCells:config.bodyCells});
        assert.deepEqual(reproduced.paths,plain,`${level.id}: explicit seal construction reproduces`);
        assert.deepEqual(reproduced.boardCells,level.boardCells,`${level.id}: original footprint is immutable and complete`);
        assert.deepEqual(reproduced.geometry.rowLengths,config.rowLengths);
        assert.equal(config.finiteBatches,2);assert.equal(spatial.initialChoices,3);
        // Independently scan literal exit rays. Each later path depends on
        // its preceding chain path and no other chain, proving every prefix
        // frontier, not just one recorded order.
        const owner=new Map(plain.flatMap((path,index)=>path.cells.map(cell=>[cell.join(','),index])));
        const offsets=[0,config.chainCounts[0],config.chainCounts[0]+config.chainCounts[1]];
        const vectors={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
        for(const [index,path]of plain.entries()) {
            const group=offsets.findLastIndex(start=>index>=start),start=offsets[group];
            const[dx,dy]=vectors[path.direction],[hx,hy]=path.cells.at(-1),dependencies=new Set();
            for(let x=hx+dx,y=hy+dy;x>=0&&y>=0&&x<level.gridWidth&&y<level.gridHeight;x+=dx,y+=dy) {
                const other=owner.get(`${x},${y}`);if(other!==undefined&&other!==index)dependencies.add(other);
            }
            assert.ok([...dependencies].every(other=>other>=start&&other<index),`${level.id}: no cross-chain or later dependency`);
            if(index>start)assert.ok(dependencies.has(index-1),`${level.id}: consecutive chain frontier`);
            else assert.equal(dependencies.size,0);
        }
        sealBoards++;
    } else {
        assert.equal(config.geometryCandidates,16,'Initial silhouette authoring has a finite budget');
        assert.deepEqual(authorSilhouette(silhouette,level.gridWidth,level.gridHeight,config.seed,config),plain,
            `${level.id}: static introduction reproduces its recorded seed`);
        assert.deepEqual(authorSilhouette(silhouette.slice().reverse(),level.gridWidth,level.gridHeight,config.seed,config),plain,
            `${level.id}: cell enumeration cannot change the introduction`);
    }
    geometryReproductions++;
    const variety=pathVariety(level.paths);bentPaths+=variety.bentPaths;uPaths+=variety.uPaths;zPaths+=variety.zPaths;
    level.paths.forEach(path=>chapterDirections[chapter-1].add(path.direction));
    const solver=createRuneSolver(level),exact=solver.audit();
    assert.equal(exact.status,'solvable',`${level.id}: bounded exact proof`);
    assert.ok(exact.legalMoves.length>0,`${level.id}: actual rune phase starts playable`);
    assert.ok(exact.reachableStates<=20000,`${level.id}: normal hints fit their exact state budget`);
    maxReachableStates=Math.max(maxReachableStates,exact.reachableStates);
    if(offset>=2) {
        assert.equal(hasRuneOrder(level),true,`${level.id}: coded progression`);
        const floor=chapter===1 ? [0,0,1,2,3][position-1] :
            Math.min(8,chapterCriticalFloors[chapter-1]+(position===5?1:0));
        assert.ok(exact.minimumCriticalDecisions>=floor,`${level.id}: minimum over ALL winning routes meets chapter floor`);
        assert.equal(exact.criticalDecisionsOnSolution,exact.minimumCriticalDecisions,
            `${level.id}: the recorded route cannot exaggerate the easiest-route grade`);
        for(const key of Object.keys(level.runeAudit))assert.deepEqual(level.runeAudit[key],exact[key],`${level.id}: exact ${key}`);
        if(config.kind==='seals') {
            const targets=chapter<=6?{4:3}:chapter===7?{4:3,6:2}:chapter===8?{6:3}:chapter===9?{6:4}:
                position===1?{6:4}:position===5?{6:5,8:3}:{6:5};
            assert.deepEqual(config.deepTargets,targets,'Intentional final-first 4 versus later 5 ramp is explicit');
            for(const[horizon,target]of Object.entries(targets))assert.ok(exact.minimumDeepCriticalDecisions[horizon]>=target,`${level.id}: all winning routes meet deep ${horizon}`);
            assert.ok(exact.maximumNoCriticalRun<=(chapter>=7?20:18),`${level.id}: no long calm filler interval on any winning route`);
            if(chapter>=7)assert.ok(exact.minimumDeepBranchingDecisions[6]>=1,`${level.id}: real future decisions beyond the wrong move`);
            minimumTargetBoards++;
        }
        const base={gridWidth:level.gridWidth,gridHeight:level.gridHeight,paths:plain};
        const reproduced=authorRuneOrder(base,{seed:config.runeAssignment.seed,cycles:config.kind==='seals'?sealCycles:campaignRuneCycles(chapter,position),
            assignmentCandidates:config.assignmentCandidates,maxStates:config.maxStates,
            minimumCriticalTarget:config.criticalTarget,targetTrapLookahead:config.runeAssignment.targetTrapLookahead,
            minimumDeepTargets:config.deepTargets||{},minimumDeepBranchingTargets:config.coupledTargets||{},
            maximumNoCriticalRun:config.maximumNoCriticalRun??Infinity,
            curatedCandidates:level.id==='final_5'?[FINAL_SEAL_WORD]:[],stopWhenTargetsMet:config.kind==='seals'});
        assert.deepEqual(reproduced.level.paths,level.paths,`${level.id}: bounded rune assignment reproduces`);
        assert.deepEqual(reproduced.level.runeCycle,level.runeCycle);
        assert.deepEqual(reproduced.audit.solution,level.solution);
        assert.ok([16,4096,8192].includes(config.assignmentCandidates),'Assignment search is bounded');
        runeReproductions++;criticalBoards++;
    } else {
        assert.equal(exact.minimumCriticalDecisions,0);
        assert.equal(config.assignmentCandidates,0);
    }
    const grid=new Grid(level.gridWidth,level.gridHeight);
    grid.loadFromData(level.paths,level.walls||[],level.runeCycle||[]);
    const removed=[];
    assert.equal(level.solution.length,level.paths.length);
    assert.equal(new Set(level.solution).size,level.paths.length);
    for(const index of level.solution) {
        const analysis=solver.analyze(removed);
        assert.equal(analysis.status,'solvable',`${level.id}: every recorded prefix remains provable`);
        assert.ok(analysis.safeMoves.includes(index),`${level.id}: actual solution move is globally safe`);
        assert.equal(grid.isPathClear(grid.paths[index]),true,`${level.id}: actual Grid obeys geometry and rune phase`);
        grid.finalizeRemoval(grid.paths[index]);removed.push(index);actualGridRemovals++;
    }
    assert.equal(grid.isCleared(),true,`${level.id}: actual Grid clears`);
}
assert.equal(criticalBoards,48);
assert.equal(sealBoards,45);assert.equal(minimumTargetBoards,45);
assert.ok(chapterDirections.every(set=>set.size===4),'Each chapter uses all four exits');
assert.ok(bentPaths>allLevels.reduce((sum,level)=>sum+level.paths.length,0)*.8&&zPaths>500,
    'Long elbow hooks and bridges replace isolated short glyph fragments');
assert.deepEqual(pathVariety([{cells:[[0,0],[1,0],[1,1]],direction:'down'}]),{bentPaths:1,uPaths:0,zPaths:0,turns:1});
assert.deepEqual(pathVariety([{cells:[[0,0],[1,0],[1,1],[0,1]],direction:'left'}]),{bentPaths:1,uPaths:1,zPaths:0,turns:2});
assert.deepEqual(pathVariety([{cells:[[0,0],[1,0],[1,1],[2,1]],direction:'right'}]),{bentPaths:1,uPaths:0,zPaths:1,turns:2});
console.log(JSON.stringify({status:'PASS',preservedSaveIds:50,preservedHistoricalShapeLabels:47,ordinaryIntroductions:2,
    geometryReproductions,runeReproductions,criticalBoards,sealBoards,minimumTargetBoards,actualGridRemovals,maxReachableStates,bentPaths,uPaths,zPaths,
    explicitFinalFirstDeep6Floor:4,laterFinalDeep6Floor:5,bossDeep8Floor:3},null,2));
