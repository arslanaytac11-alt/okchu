import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
let now=1000,nextId=1;const frames=[],timers=new Map(),elements=new Map(),memory=new Map();
globalThis.performance={now:()=>now};Date.now=()=>now;
globalThis.requestAnimationFrame=fn=>{frames.push(fn);return nextId++;};globalThis.cancelAnimationFrame=()=>{};
globalThis.setTimeout=()=>nextId++;globalThis.setInterval=fn=>{const id=nextId++;timers.set(id,fn);return id;};globalThis.clearInterval=id=>timers.delete(id);
globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});globalThis.window={devicePixelRatio:1};
function element(id){if(!elements.has(id)){const classes=new Set();elements.set(id,{style:{setProperty(){}},classList:{add(...k){k.forEach(x=>classes.add(x));},remove(...k){k.forEach(x=>classes.delete(x));},toggle(k,on){(on===undefined?!classes.has(k):on)?classes.add(k):classes.delete(k);},contains:k=>classes.has(k)},textContent:'',innerHTML:'',addEventListener(){},setAttribute(){}});}return elements.get(id);}
globalThis.document={getElementById:element,documentElement:element('root'),body:{dataset:{}}};
globalThis.fetch=async url=>({json:async()=>JSON.parse(readFileSync(String(url).split('?')[0],'utf8'))});
const {loadLanguage}=await import('../js/i18n.js?v=3');await loadLanguage('tr',{persist:false});
const {Game}=await import('../js/game.js');const {storage}=await import('../js/storage.js');const {chapters}=await import('../js/data/chapters.js');
const {allLevels}=await import('../js/levels.js');const {validateLevel}=await import('../js/level-validator.js');const {createRuneSolver}=await import('../js/rune-order.js');
const trap={id:'rune-probe',name:'probe',gridWidth:9,gridHeight:11,runeCycle:[0,1,2],paths:[
 {cells:[[4,2],[4,3],[3,3]],direction:'left',rune:0},{cells:[[4,7],[4,8]],direction:'left',rune:0},
 {cells:[[4,4],[5,4],[5,3]],direction:'up',rune:0},{cells:[[4,6],[5,6],[5,7]],direction:'right',rune:1},
 {cells:[[6,5],[5,5],[4,5]],direction:'up',rune:1},{cells:[[2,5],[3,5]],direction:'right',rune:2},
 {cells:[[3,4]],direction:'right',rune:2},{cells:[[3,7],[3,6]],direction:'up',rune:1}]};
function fresh(level=trap,mode='zen'){
 memory.clear();frames.length=0;timers.clear();storage.setGameMode(mode);
 const canvas={clientWidth:390,clientHeight:550,getContext:()=>new Proxy({},{get:()=>()=>{}}),getBoundingClientRect:()=>({left:0,top:0,width:390,height:550}),addEventListener(){}};
 const game=new Game(canvas);for(const name of ['setTheme','drawGrid','drawHintHighlight','showCrackEffect'])game.renderer[name]=()=>{};
 for(const name of ['startRenderLoop','stopRenderLoop','_showFloatingScore','playCelebration'])game[name]=()=>{};
 game.renderer._motionQuery={matches:true};game.startLevel(level,chapters[0]);return game;
}
function finish(game,index){game.removePathWithAnimation(game.grid.paths[index]);now+=200;frames.splice(0).forEach(fn=>fn(now));}
const passed=[];function check(name,fn){fn();passed.push(name);}
check('Grid and game enforce visible code; mismatch in Classic costs no heart, hint, move or score',()=>{
 const g=fresh(trap,'classic'),lives=g.livesManager.getCurrentLives(),inv=storage.getPowerups();
 assert.equal(g.grid.getCurrentRune(),0);assert.equal(g.grid.isRuneEligible(g.grid.paths[3]),false);
 g.handleWrongMove(g.grid.paths[3]);assert.equal(g.livesManager.getCurrentLives(),lives);assert.equal(g.wrongMoves,0);assert.equal(g.moves,0);assert.equal(g.score,0);assert.deepEqual(storage.getPowerups(),inv);
 assert.match(element('game-feedback').textContent,/○/);assert.equal(g.isAnimating,false);
 g.removePathWithAnimation(g.grid.paths[3]);assert.equal(g._moveHistory.length,0,'Direct calls cannot bypass eligibility');
});
check('visible cycle advances only after removal, resize keeps phase, Undo restores geometry, phase and HUD',()=>{
 const g=fresh(),original=JSON.stringify(g.grid.paths[2].cells);g.removePathWithAnimation(g.grid.paths[2]);
 assert.equal(g.grid.getCurrentRune(),0);g.handleResize();now+=200;frames.splice(0).forEach(fn=>fn(now));
 assert.equal(g.grid.getCurrentRune(),1);assert.match(element('rune-current').textContent,/◇/);assert.equal(g.moves,1);
 assert.equal(g.undoLastMove(),true);assert.equal(g.grid.getCurrentRune(),0);assert.equal(g.moves,0);assert.equal(JSON.stringify(g.grid.paths[2].cells),original);assert.match(element('rune-current').textContent,/○/);
});
check('cancelled departure cannot advance seal or leak into a fresh attempt',()=>{
 const g=fresh();g.removePathWithAnimation(g.grid.paths[2]);g.leaveLevel();assert.equal(g.grid.getCurrentRune(),0);assert.equal(g.moves,0);assert.equal(g._moveHistory.length,0);
 g.startLevel(trap,chapters[0]);now+=200;frames.splice(0).forEach(fn=>fn(now));assert.equal(g.grid.getCurrentRune(),0);assert.equal(g.moves,0);
});
check('hints select the proved safe continuation; unsolvable and unknown states never spend a hint',()=>{
 let g=fresh();g.useHint();assert.equal(g.hintedPath,g.grid.paths[2]);assert.equal(g.usedHint,true);
 g=fresh();finish(g,0);assert.equal(g.grid.getRuneAnalysis().status,'unsolvable');const inv=storage.getPowerups();
 g.useHint();assert.equal(g.hintedPath,null);assert.equal(g.usedHint,false);assert.equal(g.hintManager.hasFreeHint(),true);assert.deepEqual(storage.getPowerups(),inv);assert.match(element('game-feedback').textContent,/Geri Al/);
 assert.equal(g.undoLastMove(),true);g.useHint();assert.equal(g.hintedPath,g.grid.paths[2]);
 g=fresh();g.grid.runeSolver=createRuneSolver(trap,{maxStates:1});g.useHint();assert.equal(g.usedHint,false);assert.equal(g.hintManager.hasFreeHint(),true);assert.equal(g.hintedPath,null);assert.equal(g.hintManager.lastStatus,'unknown');
});
check('a real legal trap reaches a visible dead end and full free Undo recovers it',()=>{
 const g=fresh();finish(g,0);let guard=0;
 while(g.grid.getRemovablePaths().length&&guard++<8)finish(g,g.grid.paths.indexOf(g.grid.getRemovablePaths()[0]));
 assert.equal(g.grid.isCleared(),false);assert.match(element('game-feedback').textContent,/yolu kilitledi/);
 while(g._moveHistory.length)assert.equal(g.undoLastMove(),true);
 assert.equal(g.grid.getCurrentRune(),0);assert.equal(g.grid.getActivePaths().length,8);assert.equal(g.grid.getRuneAnalysis().status,'solvable');assert.equal(g.undoCharges,Infinity);
});
check('coded boards retain more than 20 moves and never consume extraUndo inventory',()=>{
 const count=28,chain={id:'long-rune-probe',name:'probe',gridWidth:count,gridHeight:1,runeCycle:[0,1],paths:Array.from({length:count},(_,i)=>({cells:[[i,0]],direction:'left',rune:i%2}))};
 const g=fresh();storage.earnPowerup('extraUndo',4);g.startLevel(chain,chapters[0]);const before=storage.getPowerups().extraUndo;
 for(let i=0;i<25;i++)finish(g,i);assert.equal(g._moveHistory.length,25);assert.equal(g.undoCharges,Infinity);assert.equal(element('undo-count').textContent,'∞');
 for(let i=0;i<25;i++)assert.equal(g.undoLastMove(),true);assert.equal(g.grid.getRemovedIndices().length,0);assert.equal(storage.getPowerups().extraUndo,before);
});
check('validator rejects unsolvable or malformed coded data rather than certifying the geometric DAG',()=>{
 assert.equal(validateLevel(trap).solvable,true);assert.equal(validateLevel({...trap,paths:trap.paths.map(p=>({...p,rune:0}))}).solvable,false);
 assert.equal(validateLevel({...trap,runeCycle:[0]}).solvable,false);
});
check('reading the code pauses time; visibility cannot resume it until closed and leave cannot restart it',()=>{
 const g=fresh(trap,'classic'),initial=g.timeRemaining;
 assert.ok(g._timerInterval);g.setRuneHelpOpen(true);assert.equal(g._timerInterval,null);
 now+=30000;g.handleVisibilityChange(true);g.handleVisibilityChange(false);assert.equal(g._timerInterval,null);assert.equal(g.timeRemaining,initial);
 g.setRuneHelpOpen(false);assert.ok(g._timerInterval);now+=100;timers.get(g._timerInterval)();assert.ok(g.timeRemaining>=initial-.11);
 g.setRuneHelpOpen(true);g.leaveLevel();g.setRuneHelpOpen(false);assert.equal(g._timerInterval,null);
});
check('Undo clears a manual hint and re-enables an available earned hint immediately',()=>{
 const g=fresh();storage.earnPowerup('hint',2);g.useHint();assert.equal(g.hintedPath,g.grid.paths[2]);assert.equal(element('btn-powerup-hint').disabled,true);
 finish(g,2);g.useHint();assert.ok(g.hintedPath);assert.equal(element('btn-powerup-hint').disabled,true);
 assert.equal(g.undoLastMove(),true);assert.equal(g.hintedPath,null);assert.equal(element('btn-powerup-hint').disabled,false);
});
check('phone zoom controls and fitting never change the code, logical cells or move history',()=>{
 const level=allLevels.at(-1),g=fresh(level),before=JSON.stringify(g.grid.paths.map(p=>p.cells)),phase=g.grid.getCurrentRune();
 g.zoomBoard(1.5);g.zoomBoard(1.5);assert.equal(g.renderer.scale,2.25);assert.equal(g.grid.getCurrentRune(),phase);assert.equal(g._moveHistory.length,0);assert.equal(JSON.stringify(g.grid.paths.map(p=>p.cells)),before);
 g.renderer.resetView(g.grid);assert.equal(g.renderer.scale,1);assert.equal(g.grid.getCurrentRune(),phase);
 g.startLevel(trap,chapters[0]);assert.ok(g.renderer.cellSize>=26);assert.equal(element('zoom-hint').classList.contains('hidden'),true);
 g.startLevel(level,chapters[0]);assert.ok(g.renderer.cellSize<26);assert.equal(element('zoom-hint').classList.contains('hidden'),false);
});
check('authored seal footprint controls fitting and stays fixed as arrows depart',()=>{
 const level={...trap,shape:'infinity',boardCells:trap.paths.flatMap(path=>path.cells)};
 const g=fresh(level),before=JSON.stringify(level.boardCells);
 assert.deepEqual(g.renderer._boardShapeBounds,{left:2,top:2,right:7,bottom:9});
 const outline=JSON.stringify(g.renderer._boardOutlines);finish(g,2);
 assert.equal(JSON.stringify(g.renderer._boardOutlines),outline);
 assert.equal(JSON.stringify(level.boardCells),before);
 assert.equal(validateLevel(level).solvable,true);
 assert.equal(validateLevel({...level,boardCells:level.boardCells.slice(1)}).solvable,false,'Missing fit cells must be rejected');
 assert.equal(validateLevel({...level,boardCells:[...level.boardCells,level.boardCells[0]]}).solvable,false,'Duplicate footprint cells must be rejected');
 g.startLevel({...level,boardCells:[[0,0],[1,0]]},chapters[0]);
 assert.deepEqual(g.renderer._boardShapeBounds,{left:0,top:0,right:2,bottom:1},'Authored footprint cache must distinguish boards sharing a shape name');
});
let campaignMoves=0;
check('recorded exact campaign solutions complete real Game removal/phase without modifying level cells',()=>{
 for(const level of allLevels){const before=JSON.stringify(level.paths),g=fresh(level),audit=validateLevel(level);assert.equal(audit.solvable,true,level.id);
 for(const index of audit.solution){assert.equal(g.grid.isPathClear(g.grid.paths[index]),true,level.id);finish(g,index);campaignMoves++;}
 assert.equal(g.grid.isCleared(),true,level.id);assert.equal(JSON.stringify(level.paths),before);g.leaveLevel();}
});
console.log(JSON.stringify({passed:passed.length,campaignMoves,checks:passed},null,2));
