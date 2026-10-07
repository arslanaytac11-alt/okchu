import assert from 'node:assert/strict';
import {createRuneSolver,hasRuneOrder} from '../js/rune-order.js';
import {Grid} from '../js/grid.js';
import {ArrowState} from '../js/arrow.js';

let checks=0;
const check=(name,fn)=>{fn();checks++;console.log(`PASS ${name}`);};
const spatial={gridWidth:9,gridHeight:11,paths:[
 {cells:[[4,2],[4,3],[3,3]],direction:'left'}, {cells:[[4,7],[4,8]],direction:'left'},
 {cells:[[4,4],[5,4],[5,3]],direction:'up'}, {cells:[[4,6],[5,6],[5,7]],direction:'right'},
 {cells:[[6,5],[5,5],[4,5]],direction:'up'}, {cells:[[2,5],[3,5]],direction:'right'},
 {cells:[[3,4]],direction:'right'}, {cells:[[3,7],[3,6]],direction:'up'}]};
const rune={...spatial,runeCycle:[0,1,2],paths:spatial.paths.map((p,i)=>({...p,rune:[0,0,0,1,1,2,2,1][i]}))};
check('a spatially clear matching move can be globally unsafe, with a proved safe hint',()=>{
 const s=createRuneSolver(rune),a=s.audit();assert.equal(a.status,'solvable');
 assert.deepEqual(a.legalMoves,[0,1,2]);assert.deepEqual(a.safeMoves,[2]);assert.equal(a.winningOrders,'1');
 assert.equal(a.minimumCriticalDecisions,2);assert.equal(a.maximumCriticalDecisions,2);
 assert.equal(a.criticalDecisionsOnSolution,a.minimumCriticalDecisions);
 assert.equal(a.trapLookaheadIncludesWrongMove,true);
 const wrong=s.analyze([0]);assert.equal(wrong.status,'unsolvable');assert.ok(wrong.legalMoves.length);
 assert.deepEqual(wrong.safeMoves,[]);assert.equal(wrong.budgetExceeded,false);
 assert.deepEqual(s.analyze([]).safeMoves,[2],'Undo restores the actual safe choice and phase');
});
check('compiled geometry agrees with real Grid at all 256 removal masks',()=>{
 const s=createRuneSolver(rune),g=new Grid(spatial.gridWidth,spatial.gridHeight);g.loadFromData(spatial.paths);
 const initial=s.audit();
 for(let mask=0;mask<256;mask++) {
  const removed=[];g.paths.forEach((p,i)=>{p.state=mask&(1<<i)?ArrowState.REMOVED:ArrowState.IDLE;if(p.isRemoved())removed.push(i);});
  const real=g.paths.map((p,i)=>g.isPathClear(p)?i:-1).filter(i=>i>=0);
  assert.deepEqual(s.spatialMoves(removed),real);
  const expected=real.filter(i=>rune.paths[i].rune===rune.runeCycle[removed.length%3]);
  assert.deepEqual(s.analyze(removed).legalMoves,expected);
 }
 const afterQueries=s.audit();
 assert.equal(afterQueries.reachableStates,initial.reachableStates,'Arbitrary mask queries do not inflate the legal reachable graph');
 for(const key of ['winningOrders','minimumCriticalDecisions','maximumCriticalDecisions','mixedChoiceStates','deadEnds','unsafeChoiceRatio']) {
  assert.equal(afterQueries[key],initial[key],`Arbitrary removed-set queries do not change ${key}`);
 }
});
check('the recorded exact solution advances the visible cycle and clears actual Grid',()=>{
 const s=createRuneSolver(rune),a=s.audit(),g=new Grid(spatial.gridWidth,spatial.gridHeight);g.loadFromData(spatial.paths);
 const removed=[];
 for(const index of a.solution) {
  const current=s.analyze(removed);assert.ok(current.safeMoves.includes(index));
  assert.equal(rune.paths[index].rune,current.requiredRune);assert.equal(g.isPathClear(g.paths[index]),true);
  g.finalizeRemoval(g.paths[index]);removed.push(index);
 }
 assert.equal(g.isCleared(),true);assert.equal(s.analyze(removed).status,'solvable');assert.deepEqual(s.analyze(removed).solution,[]);
});
check('ordinary geometry remains monotone without adding rune rules',()=>{
 const s=createRuneSolver(spatial),a=s.audit();assert.equal(hasRuneOrder(spatial),false);
 assert.equal(a.winningOrders,'392');assert.deepEqual(a.safeMoves,a.legalMoves);
 assert.equal(a.minimumCriticalDecisions,0);assert.equal(a.maximumCriticalDecisions,0);assert.equal(a.requiredRune,null);
});
check('minimum grade includes every winning route and safe hints follow the easiest one',()=>{
 const level={...spatial,runeCycle:[0,1,0,2],paths:spatial.paths.map((p,i)=>({...p,rune:[0,1,0,0,1,0,2,2][i]}))};
 const grid=new Grid(level.gridWidth,level.gridHeight);grid.loadFromData(spatial.paths);
 const winning=[];
 function legal(prefix) {
  const removed=new Set(prefix);grid.paths.forEach((p,i)=>p.state=removed.has(i)?ArrowState.REMOVED:ArrowState.IDLE);
  return grid.paths.map((p,i)=>grid.isPathClear(p)&&level.paths[i].rune===level.runeCycle[prefix.length%4]?i:-1).filter(i=>i>=0);
 }
 function enumerate(prefix=[]) {
  if(prefix.length===8){winning.push(prefix);return;}
  for(const index of legal(prefix))enumerate([...prefix,index]);
 }
 enumerate();assert.equal(winning.length,4,'Independent real-Grid permutation oracle');
 function criticalCount(order) {
  let count=0;
  for(let depth=0;depth<8;depth++) {
   const prefix=order.slice(0,depth),removed=new Set(prefix);
   const matching=winning.filter(route=>route.slice(0,depth).every(index=>removed.has(index)));
   const safe=new Set(matching.map(route=>route[depth]));
   if(legal(prefix).some(index=>!safe.has(index)))count++;
  }
  return count;
 }
 const counts=winning.map(criticalCount),a=createRuneSolver(level).audit();
 assert.equal(a.minimumCriticalDecisions,Math.min(...counts));assert.equal(a.maximumCriticalDecisions,Math.max(...counts));
 assert.equal(a.minimumCriticalDecisions,0);assert.equal(a.maximumCriticalDecisions,1);
 assert.equal(criticalCount(a.solution),0,'Hints cannot select a harder route to inflate the claimed grade');
});
check('deep decisions, coupled branch windows and quiet runs match literal real-Grid permutations',()=>{
 const runes=[0,0,1,0,0,2,2,1,0,1,0,1,0,1,0,0,2,2],cycle=[0,1,0,2];
 const paths=runes.map((rune,i)=>({cells:[[i%6,Math.floor(i/6)]],direction:'left',rune}));
 const level={gridWidth:6,gridHeight:3,paths,runeCycle:cycle},grid=new Grid(6,3);
 grid.loadFromData(paths.map(({cells,direction})=>({cells,direction})));
 const key=prefix=>prefix.slice().sort((a,b)=>a-b).join(','),winning=[],losing=[];
 function moves(prefix){const removed=new Set(prefix);grid.paths.forEach((p,i)=>p.state=removed.has(i)?ArrowState.REMOVED:ArrowState.IDLE);
  return grid.paths.flatMap((p,i)=>grid.isPathClear(p)&&runes[i]===cycle[prefix.length%4]?[i]:[]);}
 function enumerate(prefix=[]){const choices=moves(prefix);if(!choices.length){(prefix.length===18?winning:losing).push(prefix);return;}
  for(const index of choices)enumerate([...prefix,index]);}
 enumerate();assert.equal(winning.length,6);
 const states=new Map(),hist={};
 function facts(prefix){const id=key(prefix);if(states.has(id))return states.get(id);
  const depth=prefix.length,set=new Set(prefix),matching=winning.filter(route=>route.slice(0,depth).every(index=>set.has(index)));
  const legal=moves(prefix),safe=new Set(matching.map(route=>route[depth]).filter(i=>i!==undefined)),unsafe=legal.filter(i=>!safe.has(i));
  const options=unsafe.map(index=>{const removed=new Set([...prefix,index]);
   const leaves=losing.filter(route=>route.length>=depth+1&&route.slice(0,depth+1).every(i=>removed.has(i)));
   assert.ok(leaves.length);const earliest=Math.min(...leaves.map(route=>route.length-depth));
   const branches=h=>Math.min(...leaves.map(route=>{let n=0;
    for(let at=depth+1;at<Math.min(route.length,depth+1+Math.min(4,h-1));at++)if(moves(route.slice(0,at)).length>1)n++;
    return n;}));
   hist[earliest]=(hist[earliest]||0)+1;return{earliest,branches};});
  const result={legal,options};states.set(id,result);return result;
 }
 const summaries=winning.map(route=>{const deep={4:0,6:0,8:0},coupled={4:0,6:0,8:0};let quiet=0,forced=0,maxQuiet=0,maxForced=0;
  for(let depth=0;depth<18;depth++){const info=facts(route.slice(0,depth));
   for(const h of [4,6,8]){if(info.options.some(o=>o.earliest>=h))deep[h]++;
    if(info.options.some(o=>o.earliest>=h&&o.branches(h)>0))coupled[h]++;}
   quiet=info.options.length?0:quiet+1;forced=info.legal.length===1?forced+1:0;
   maxQuiet=Math.max(maxQuiet,quiet);maxForced=Math.max(maxForced,forced);}
  return{deep,coupled,maxQuiet,maxForced};});
 const audit=createRuneSolver(level).audit();
 for(const h of [4,6,8]){
  assert.equal(audit.minimumDeepCriticalDecisions[h],Math.min(...summaries.map(s=>s.deep[h])));
  assert.equal(audit.maximumDeepCriticalDecisions[h],Math.max(...summaries.map(s=>s.deep[h])));
  assert.equal(audit.minimumDeepBranchingDecisions[h],Math.min(...summaries.map(s=>s.coupled[h])));
  assert.equal(audit.maximumDeepBranchingDecisions[h],Math.max(...summaries.map(s=>s.coupled[h])));
 }
 assert.deepEqual(audit.minimumDeepCriticalDecisions,{4:1,6:1,8:0});
 assert.deepEqual(audit.maximumDeepCriticalDecisions,{4:2,6:2,8:1});
 assert.equal(audit.maximumNoCriticalRun,Math.max(...summaries.map(s=>s.maxQuiet)));
 assert.equal(audit.maximumForcedRun,Math.max(...summaries.map(s=>s.maxForced)));
 assert.deepEqual(audit.unsafeChoicesByEarliestDeadend,hist);
 assert.equal(audit.immediateUnsafeChoices,hist[1]||0);
});
check('BigInt masks and repeated cycle entries remain exact beyond 32 and 64 arrows',()=>{
 const cycle=[0,1,0,2,1,3],large={gridWidth:70,gridHeight:1,runeCycle:cycle,
  paths:Array.from({length:70},(_,i)=>({cells:[[i,0]],direction:'left',rune:cycle[i%cycle.length]}))};
 const s=createRuneSolver(large,{maxStates:71}),a=s.audit();assert.equal(a.winningOrders,'1');assert.equal(a.reachableStates,71);
 const current=s.analyze(Array.from({length:35},(_,i)=>i));assert.deepEqual(current.safeMoves,[35]);assert.equal(current.requiredRune,3);
 assert.equal(createRuneSolver(large,{maxStates:70}).audit().status,'unknown');
});
check('budget exhaustion is explicitly unknown and never an unsolvable board or unsafe hint',()=>{
 const independent={gridWidth:8,gridHeight:1,paths:Array.from({length:8},(_,i)=>({cells:[[i,0]],direction:'up'}))};
 const s=createRuneSolver(independent,{maxStates:1}),a=s.audit();assert.equal(a.status,'unknown');assert.equal(a.solvable,null);
 assert.equal(a.budgetExceeded,true);assert.deepEqual(a.safeMoves,[]);assert.equal(a.winningOrders,null);
 const exact=createRuneSolver(independent,{maxStates:256}).audit();assert.equal(exact.status,'solvable');assert.equal(exact.winningOrders,'40320');
});
check('walls and genuine exit cycles are proved failures rather than budget failures',()=>{
 const wall={gridWidth:3,gridHeight:3,walls:[[2,1]],paths:[{cells:[[1,1]],direction:'right'}]};
 const cycle={gridWidth:2,gridHeight:1,paths:[{cells:[[0,0]],direction:'right'},{cells:[[1,0]],direction:'left'}]};
 for(const level of [wall,cycle]) {const a=createRuneSolver(level).audit();assert.equal(a.status,'unsolvable');assert.equal(a.solvable,false);assert.equal(a.budgetExceeded,false);}
});
check('invalid authored symbols, geometry, indices and budgets fail explicitly',()=>{
 for(const bad of [[0],[0,4],[0,1,2,3,0,1,2],['0',1]])assert.throws(()=>createRuneSolver({...rune,runeCycle:bad}),TypeError);
 assert.throws(()=>createRuneSolver({...rune,paths:rune.paths.map((p,i)=>i? p:{...p,rune:undefined})}),TypeError);
 assert.throws(()=>createRuneSolver({...spatial,paths:[{cells:[[0,0],[2,0]],direction:'up'}]}),TypeError);
 for(const maxStates of [0,-1,1.5,NaN])assert.throws(()=>createRuneSolver(rune,{maxStates}),RangeError);
 const s=createRuneSolver(rune);for(const indices of [[-1],[8],[0,0],[1.2]])assert.throws(()=>s.analyze(indices),RangeError);
 assert.throws(()=>s.analyze(new Set()),TypeError);
});
check('analysis and caller-modified results never mutate logical path data or cached hints',()=>{
 const before=JSON.stringify(rune),s=createRuneSolver(rune),first=s.analyze([]);first.safeMoves.length=0;first.solution.length=0;
 assert.deepEqual(s.analyze([]).safeMoves,[2]);assert.equal(JSON.stringify(rune),before);
});
console.log(JSON.stringify({status:'PASS',checks,actualGridMasks:256,bigIntArrows:70},null,2));
