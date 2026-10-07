import assert from 'node:assert/strict';
import {allLevels} from '../js/levels.js';
import {Grid} from '../js/grid.js';
import {silhouetteCells,auditPuzzle} from '../js/puzzle-catalog.js';
import {authorSilhouette,pathVariety,campaignTargetDepth} from '../js/puzzle-authoring.js';

// These are the already-played guide paths. Later authoring must not silently
// change the first two boards or the three successful onboarding taps.
const introductoryPaths = [
    [{cells:[[3,5],[3,6]],direction:'down'},{cells:[[4,4],[3,4],[2,4]],direction:'left'},{cells:[[4,6],[4,5]],direction:'right'},{cells:[[2,6],[2,5]],direction:'right'},{cells:[[3,3],[3,2]],direction:'left'}],
    [{cells:[[4,6],[3,6],[2,6]],direction:'left'},{cells:[[5,2],[5,3],[6,3]],direction:'right'},{cells:[[6,2]],direction:'up'},{cells:[[5,5],[5,6],[6,6]],direction:'up'},{cells:[[4,4],[5,4]],direction:'down'},{cells:[[3,5],[4,5]],direction:'right'},{cells:[[3,4]],direction:'left'},{cells:[[2,5]],direction:'left'}],
];
assert.deepEqual(allLevels.slice(0,2).map(l=>l.paths),introductoryPaths);
const expectedDepths = [
    [2,3,4,5,6],[5,5,6,6,7],[6,6,7,7,8],[7,7,7,8,9],[8,8,9,9,10],
    [9,9,10,10,11],[10,10,11,11,12],[11,11,12,11,13],[12,12,13,13,14],[13,13,14,14,15],
];
assert.deepEqual(Array.from({length:10},(_,i)=>allLevels.slice(i*5,i*5+5).map(l=>l.balance.dependencyDepth)),expectedDepths);

let reproducedBoards=0, legalBranchStates=0, bentPaths=0, uPaths=0, zPaths=0;
const chapterDirections=Array.from({length:10},()=>new Set());
for (const level of allLevels) {
    const audit = auditPuzzle(level);
    assert.equal(audit.solvable,true,`${level.id}: authored paths must remain acyclic`);
    assert.ok(audit.initialChoices>=3&&audit.initialChoices<=7,`${level.id}: retain several readable initial choices`);
    assert.ok(audit.totalPaths<=65,`${level.id}: avoid excessive phone tap density`);
    assert.ok(audit.dependencyDepth<=audit.totalPaths-audit.initialChoices+1,`${level.id}: structural chain bound`);
    const variety=pathVariety(level.paths);
    bentPaths+=variety.bentPaths; uPaths+=variety.uPaths; zPaths+=variety.zPaths;
    for (const path of level.paths) chapterDirections[level.chapter-1].add(path.direction);
    if (level.level>2) {
        const config=level.balance.authoring;
        assert.equal(config.candidates,128,'Authoring search has an explicit finite budget');
        assert.equal(config.requestedDepth,campaignTargetDepth(level.chapter,(level.level-1)%5+1));
        assert.equal(audit.dependencyDepth,Math.min(config.requestedDepth,config.boundedMaxDepth));
        const cells=silhouetteCells(level.shape,level.gridWidth,level.gridHeight);
        assert.deepEqual(authorSilhouette(cells,level.gridWidth,level.gridHeight,config.seed,config),level.paths,`${level.id}: committed paths reproduce their seed`);
        assert.deepEqual(authorSilhouette(cells.reverse(),level.gridWidth,level.gridHeight,config.seed,config),level.paths,`${level.id}: input enumeration cannot change next authoring run`);
        reproducedBoards++;
    }
    const grid=new Grid(level.gridWidth,level.gridHeight); grid.loadFromData(level.paths);
    let branches=0;
    for (const index of level.solution) {
        const choices=grid.getRemovablePaths();
        assert.ok(choices.length,`${level.id}: never starts/continues with zero legal exits`);
        if (choices.length>1) branches++;
        assert.ok(choices.includes(grid.paths[index]),`${level.id}: chosen solution must obey actual Grid`);
        grid.finalizeRemoval(grid.paths[index]);
    }
    assert.ok(branches>=2,`${level.id}: board is not a uniform forced chain`);
    legalBranchStates+=branches;
}
assert.ok(chapterDirections.every(set=>set.size===4),'Every chapter includes all four exit directions');
assert.ok(bentPaths>350&&uPaths>70&&zPaths>70,'Campaign mixes readable L, U and Z bodies instead of straight fragments');
assert.deepEqual(pathVariety([{cells:[[0,0],[1,0],[1,1]],direction:'down'}]),{bentPaths:1,uPaths:0,zPaths:0,turns:1});
assert.deepEqual(pathVariety([{cells:[[0,0],[1,0],[1,1],[0,1]],direction:'left'}]),{bentPaths:1,uPaths:1,zPaths:0,turns:2});
assert.deepEqual(pathVariety([{cells:[[0,0],[1,0],[1,1],[2,1]],direction:'right'}]),{bentPaths:1,uPaths:0,zPaths:1,turns:2});
console.log(JSON.stringify({status:'PASS',unchangedGuideBoards:2,reproducedBoards,initialChoiceBoards:50,legalBranchStates,bentPaths,uPaths,zPaths,boundedCandidatesPerBoard:128,locallyCappedIds:['viking_3','india_4']},null,2));
