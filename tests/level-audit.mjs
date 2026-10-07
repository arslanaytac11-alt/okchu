import assert from 'node:assert/strict';
import { allLevels } from '../js/levels.js';
import { Grid } from '../js/grid.js';
import { auditPuzzle } from '../js/puzzle-catalog.js';
import { createRuneSolver, hasRuneOrder } from '../js/rune-order.js';

// Independently recompute route bounds through exact classification. The
// audit's maximum must never hide an easier winning route when grading.
function winningRouteBounds(level, solver) {
  const memo = new Map(), losingMemo = new Map(), branchMemo = new Map(), horizons = [4,6,8];
  const unsafeChoicesByEarliestDeadend = {};
  let immediateUnsafeChoices = 0;
  const stateKey = removed => removed.slice().sort((a, b) => a - b).join(',');
  // Count from the state AFTER the wrong move. Adding one below includes
  // that selected move in the horizon, matching the public grade contract.
  function losingDistance(removed) {
    const key = stateKey(removed);
    if (losingMemo.has(key)) return losingMemo.get(key);
    const state = solver.analyze(removed);
    assert.equal(state.status, 'unsolvable', `${level.id}: unsafe descendant must be proved losing`);
    const distance = state.legalMoves.length ?
      1 + Math.min(...state.legalMoves.map(index => losingDistance([...removed, index]))) : 0;
    losingMemo.set(key, distance); return distance;
  }
  function minimumBranchesWithin(removed, window) {
    const key = `${stateKey(removed)}:${window}`;
    if (branchMemo.has(key)) return branchMemo.get(key);
    const state = solver.analyze(removed);
    assert.equal(state.status, 'unsolvable');
    const branches = !window || !state.legalMoves.length ? 0 :
      (state.legalMoves.length > 1 ? 1 : 0) + Math.min(...state.legalMoves.map(index =>
        minimumBranchesWithin([...removed, index], window - 1)));
    branchMemo.set(key, branches); return branches;
  }
  function visit(removed) {
    const key = stateKey(removed);
    if (memo.has(key)) return memo.get(key);
    const state = solver.analyze(removed);
    assert.notEqual(state.status, 'unknown', `${level.id}: route bounds require proof, not a budget guess`);
    assert.equal(state.status, 'solvable', `${level.id}: safe recursion must preserve a solution`);
    if (removed.length === level.paths.length) {
      const leaf = {minimum:0,maximum:0,orders:1n,
        minimumDeep:Object.fromEntries(horizons.map(h => [h,0])),
        maximumDeep:Object.fromEntries(horizons.map(h => [h,0])),
        minimumDeepBranching:Object.fromEntries(horizons.map(h => [h,0])),
        maximumDeepBranching:Object.fromEntries(horizons.map(h => [h,0])),
        noCriticalPrefix:0,maximumNoCriticalRun:0,forcedPrefix:0,maximumForcedRun:0};
      memo.set(key, leaf); return leaf;
    }
    assert.ok(state.safeMoves.length);
    const critical = state.legalMoves.length > state.safeMoves.length ? 1 : 0;
    const unsafeDetails = state.legalMoves.filter(index => !state.safeMoves.includes(index)).map(index => ({
      distance:1 + losingDistance([...removed, index]),
      branches:Object.fromEntries(horizons.map(h => [h,minimumBranchesWithin([...removed, index],Math.min(4,h-1))])),
    }));
    const unsafeDistances = unsafeDetails.map(option => option.distance);
    for (const distance of unsafeDistances) {
      unsafeChoicesByEarliestDeadend[distance] = (unsafeChoicesByEarliestDeadend[distance] || 0) + 1;
      if (distance === 1) immediateUnsafeChoices++;
    }
    const children = state.safeMoves.map(index => visit([...removed, index]));
    const result = {
      minimum:critical + Math.min(...children.map(child => child.minimum)),
      maximum:critical + Math.max(...children.map(child => child.maximum)),
      orders:children.reduce((sum, child) => sum + child.orders, 0n),
      minimumDeep:Object.fromEntries(horizons.map(h => [h,
        (unsafeDistances.some(distance => distance >= h) ? 1 : 0) +
        Math.min(...children.map(child => child.minimumDeep[h]))])),
      maximumDeep:Object.fromEntries(horizons.map(h => [h,
        (unsafeDistances.some(distance => distance >= h) ? 1 : 0) +
        Math.max(...children.map(child => child.maximumDeep[h]))])),
      minimumDeepBranching:Object.fromEntries(horizons.map(h => [h,
        (unsafeDetails.some(option => option.distance >= h && option.branches[h] >= 1) ? 1 : 0) +
        Math.min(...children.map(child => child.minimumDeepBranching[h]))])),
      maximumDeepBranching:Object.fromEntries(horizons.map(h => [h,
        (unsafeDetails.some(option => option.distance >= h && option.branches[h] >= 1) ? 1 : 0) +
        Math.max(...children.map(child => child.maximumDeepBranching[h]))])),
      noCriticalPrefix:critical ? 0 : 1 + Math.max(...children.map(child => child.noCriticalPrefix)),
      forcedPrefix:state.legalMoves.length === 1 ? 1 + Math.max(...children.map(child => child.forcedPrefix)) : 0,
    };
    result.maximumNoCriticalRun = Math.max(result.noCriticalPrefix,
      ...children.map(child => child.maximumNoCriticalRun));
    result.maximumForcedRun = Math.max(result.forcedPrefix,...children.map(child => child.maximumForcedRun));
    memo.set(key, result); return result;
  }
  const bounds = visit([]);
  return {...bounds,winningStates:memo.size,immediateUnsafeChoices,unsafeChoicesByEarliestDeadend};
}

// Four winning orders exist, but their critical counts range from zero to
// one. A maximum-based grade would wrongly call every route difficult.
const mixedGrade = {id:'minimum-grade-regression',gridWidth:9,gridHeight:11,runeCycle:[0,1,0,2],paths:[
  {cells:[[4,2],[4,3],[3,3]],direction:'left',rune:0},
  {cells:[[4,7],[4,8]],direction:'left',rune:1},
  {cells:[[4,4],[5,4],[5,3]],direction:'up',rune:0},
  {cells:[[4,6],[5,6],[5,7]],direction:'right',rune:0},
  {cells:[[6,5],[5,5],[4,5]],direction:'up',rune:1},
  {cells:[[2,5],[3,5]],direction:'right',rune:0},
  {cells:[[3,4]],direction:'right',rune:2},
  {cells:[[3,7],[3,6]],direction:'up',rune:2},
]};
const mixedSolver = createRuneSolver(mixedGrade), mixedAudit = mixedSolver.audit();
const mixedBounds = winningRouteBounds(mixedGrade, mixedSolver);
assert.equal(mixedBounds.minimum, 0); assert.equal(mixedBounds.maximum, 1);
assert.equal(mixedBounds.orders, 4n);
assert.equal(mixedAudit.minimumCriticalDecisions, mixedBounds.minimum);
assert.equal(mixedAudit.maximumCriticalDecisions, mixedBounds.maximum);

const results = [];
for (const level of allLevels) {
  const spatial = new Grid(level.gridWidth, level.gridHeight);
  spatial.loadFromData(level.paths, level.walls || []);
  const occupied = new Map(), issues = [];
  level.paths.forEach((path, i) => path.cells.forEach(([x, y], j) => {
    if (x < 0 || x >= spatial.width || y < 0 || y >= spatial.height) issues.push({type:'bounds',i,j,x,y});
    const key = `${x},${y}`;
    if (occupied.has(key)) issues.push({type:'overlap',i,other:occupied.get(key),x,y});
    occupied.set(key, i);
    if (j && Math.abs(path.cells[j-1][0]-x) + Math.abs(path.cells[j-1][1]-y) !== 1) issues.push({type:'disconnected',i,j});
    if (spatial.isWall(x, y)) issues.push({type:'wall-overlap',i,j});
  }));
  assert.deepEqual(issues, [], `${level.id}: malformed geometry`);
  const geometry = auditPuzzle(level);
  assert.equal(geometry.solvable, true, `${level.id}: ${geometry.errors}`);
  // Geometry must remain acyclic. This independent spatial audit deliberately
  // omits rune eligibility; the actual recorded solve below includes it.
  let spatialRemoved = 0;
  while (!spatial.isCleared()) {
    const path = spatial.paths.find(path => spatial.isPathClear(path));
    assert.ok(path, `${level.id}: geometric dependency cycle`);
    spatial.finalizeRemoval(path); spatialRemoved++;
  }
  assert.equal(spatialRemoved, level.paths.length);

  const solver = createRuneSolver(level), rune = solver.audit();
  assert.equal(rune.status, 'solvable', `${level.id}: exact rune order must be proven`);
  assert.equal(rune.budgetExceeded, false);
  const bounds = winningRouteBounds(level, solver);
  assert.equal(rune.minimumCriticalDecisions, bounds.minimum, `${level.id}: minimum over ALL winning routes`);
  assert.equal(rune.maximumCriticalDecisions, bounds.maximum);
  assert.equal(rune.winningOrders, bounds.orders.toString());
  assert.equal(rune.criticalDecisionsOnSolution, bounds.minimum, `${level.id}: canonical proof follows an easiest winning route`);
  assert.deepEqual(rune.minimumDeepCriticalDecisions, bounds.minimumDeep,
    `${level.id}: deep grade is the minimum over ALL winning routes`);
  assert.deepEqual(rune.maximumDeepCriticalDecisions, bounds.maximumDeep);
  assert.deepEqual(rune.minimumDeepBranchingDecisions, bounds.minimumDeepBranching);
  assert.deepEqual(rune.maximumDeepBranchingDecisions, bounds.maximumDeepBranching);
  assert.equal(rune.maximumNoCriticalRun, bounds.maximumNoCriticalRun);
  assert.equal(rune.maximumForcedRun, bounds.maximumForcedRun);
  assert.equal(rune.immediateUnsafeChoices, bounds.immediateUnsafeChoices,
    `${level.id}: next-turn dead ends are measured across all reachable winning states`);
  assert.deepEqual(rune.unsafeChoicesByEarliestDeadend, bounds.unsafeChoicesByEarliestDeadend);

  const runtime = new Grid(level.gridWidth, level.gridHeight);
  runtime.loadFromData(level.paths, level.walls || [], level.runeCycle || []);
  assert.equal(level.solution.length, level.paths.length);
  assert.equal(new Set(level.solution).size, level.paths.length);
  let recordedRemoved = 0;
  for (const index of level.solution) {
    const state = solver.analyze(runtime.getRemovedIndices());
    assert.equal(state.status, 'solvable');
    assert.ok(state.safeMoves.includes(index), `${level.id}: recorded order keeps a winning continuation`);
    assert.equal(runtime.isPathClear(runtime.paths[index]), true, `${level.id}: recorded order obeys the live Grid rule`);
    runtime.finalizeRemoval(runtime.paths[index]); recordedRemoved++;
  }
  assert.equal(runtime.isCleared(), true);
  if (hasRuneOrder(level)) {
    assert.ok(bounds.minimum >= 1, `${level.id}: code cannot be a decorative easy spatial order`);
    const saved = level.runeAudit;
    assert.ok(saved, `${level.id}: committed proof metadata required`);
    for (const field of ['minimumCriticalDecisions','maximumCriticalDecisions','reachableStates','winningOrders',
      'criticalChoiceDensity','unsafeChoiceRatio','solutionUnsafeChoiceRatio','trapLookaheadMedian','mixedChoiceStates','deadEnds',
      'minimumDeepCriticalDecisions','maximumDeepCriticalDecisions','minimumDeepBranchingDecisions','maximumDeepBranchingDecisions',
      'maximumNoCriticalRun','maximumForcedRun','immediateUnsafeChoices','unsafeChoicesByEarliestDeadend']) {
      assert.deepEqual(saved[field], rune[field], `${level.id}: stale ${field} certificate`);
    }
    assert.equal(saved.trapLookaheadIncludesWrongMove, true);
    const position = (level.level - 1) % 5 + 1;
    const expectedTarget = level.chapter === 1 ? position - 2 :
      Math.min(8, 3 + Math.floor((level.chapter - 2) * .75) + (position === 5 ? 1 : 0));
    assert.equal(level.balance.authoring.criticalTarget, expectedTarget,
      `${level.id}: the committed minimum target must not silently become easier`);
    assert.ok(bounds.minimum >= level.balance.authoring.criticalTarget,
      `${level.id}: easiest route falls below its authored critical-decision target`);
    const expectedDeep = level.chapter === 1 ? {} : level.chapter <= 6 ? {4:3} :
      level.chapter === 7 ? {4:3,6:2} : level.chapter === 8 ? {6:3} :
      level.chapter === 9 ? {6:4} : position === 1 ? {6:4} : position === 5 ? {6:5,8:3} : {6:5};
    const expectedCoupled = level.chapter >= 7 ? {6:1} : {};
    if (level.chapter >= 2) {
      assert.equal(level.balance.authoring.kind, 'seals');
      assert.deepEqual(level.balance.authoring.deepTargets, expectedDeep,
        `${level.id}: explicit depth ramp must not silently become an easier floor`);
      assert.deepEqual(level.balance.authoring.coupledTargets, expectedCoupled);
      assert.equal(level.balance.authoring.maximumNoCriticalRun, level.chapter >= 7 ? 20 : 18);
      assert.ok(level.boardCells?.length, `${level.id}: complete custom maze footprint required`);
    }
    for (const [horizon, target] of Object.entries(level.balance.authoring.deepTargets || {})) {
      assert.ok([4,6,8].includes(Number(horizon)) && Number.isInteger(target) && target >= 0);
      assert.ok(bounds.minimumDeep[horizon] >= target,
        `${level.id}: EVERY winning route must meet its ${horizon}-move deep-decision target`);
    }
    for (const [horizon, target] of Object.entries(level.balance.authoring.coupledTargets || {})) {
      assert.ok([4,6,8].includes(Number(horizon)) && Number.isInteger(target) && target >= 0);
      assert.ok(bounds.minimumDeepBranching[horizon] >= target,
        `${level.id}: EVERY winning route must meet its ${horizon}-move branching-decision target`);
    }
    if (level.balance.authoring.maximumNoCriticalRun != null) {
      assert.ok(bounds.maximumNoCriticalRun <= level.balance.authoring.maximumNoCriticalRun,
        `${level.id}: a winning route cannot hide a long ungraded filler interval`);
    }
  } else {
    assert.equal(bounds.minimum, 0); assert.equal(bounds.maximum, 0);
  }
  results.push({id:level.id,spatialRemoved,recordedRemoved,total:level.paths.length,
    coded:hasRuneOrder(level),minimumCriticalDecisions:bounds.minimum,maximumCriticalDecisions:bounds.maximum,
    winningOrders:bounds.orders.toString(),winningStates:bounds.winningStates,reachableStates:rune.reachableStates,
    minimumDeepCriticalDecisions:bounds.minimumDeep,maximumDeepCriticalDecisions:bounds.maximumDeep,
    immediateUnsafeChoices:bounds.immediateUnsafeChoices,
    maximumNoCriticalRun:bounds.maximumNoCriticalRun,
    maximumForcedRun:bounds.maximumForcedRun,
    minimumDeepBranchingDecisions:bounds.minimumDeepBranching,
    maximumDeepBranchingDecisions:bounds.maximumDeepBranching,
    walls:spatial.walls.length,issues:[],issueCount:0});
}
assert.equal(results.length, 50);
assert.equal(results.filter(result => result.coded).length, 48);
console.log(JSON.stringify({total:results.length,solved:results.filter(result => result.recordedRemoved === result.total).length,
  spatiallySolved:results.filter(result => result.spatialRemoved === result.total).length,
  codedBoards:results.filter(result => result.coded).length,
  independentlyAuditedWinningStates:results.reduce((sum, result) => sum + result.winningStates, 0),
  minimumGradeRegression:{minimum:mixedBounds.minimum,maximum:mixedBounds.maximum,winningOrders:mixedBounds.orders.toString()},
  failures:[],geometry:[],results},null,2));
