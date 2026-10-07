import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isLocalReviewMode } from '../js/preview-mode.js';
let now=10000,nextId=1;const intervals=new Map(),rafs=[],timeouts=[];
globalThis.performance={now:()=>now};Date.now=()=>now;
globalThis.setInterval=fn=>{const id=nextId++;intervals.set(id,fn);return id;};globalThis.clearInterval=id=>intervals.delete(id);
globalThis.setTimeout=fn=>{timeouts.push(fn);return nextId++;};globalThis.requestAnimationFrame=fn=>{rafs.push(fn);return nextId++;};globalThis.cancelAnimationFrame=()=>{};
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});globalThis.window={devicePixelRatio:1};
const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},textContent:'',addEventListener(){}});return elements.get(id);}
globalThis.document={getElementById:el,documentElement:el('root'),body:{dataset:{}}};
const {Game}=await import('../js/game.js');const {Renderer}=await import('../js/renderer.js');const {Grid}=await import('../js/grid.js');const {storage}=await import('../js/storage.js');
const {hitTestPath}=await import('../js/hit-test.js');const {allLevels}=await import('../js/levels.js');const {chapters}=await import('../js/data/chapters.js');
const passed=[];function check(name,fn){fn();passed.push(name);}
const simple={id:'probe',name:'probe',chapter:1,gridWidth:4,gridHeight:4,paths:[{cells:[[0,0]],direction:'up'},{cells:[[1,0]],direction:'up'},{cells:[[2,0]],direction:'up'}]};
function fresh({width=390,height=600,dpr=1,cssScale=1,left=21,top=99}={}) {
 memory.clear();intervals.clear();rafs.length=0;timeouts.length=0;window.devicePixelRatio=dpr;
 const listeners={},ctx=new Proxy({},{get:()=>()=>{}}),canvas={clientWidth:width,clientHeight:height,getContext:()=>ctx,getBoundingClientRect:()=>({left,top,width:width*cssScale,height:height*cssScale}),addEventListener:(k,fn)=>listeners[k]=fn};
 const game=new Game(canvas);for(const method of ['setTheme','drawGrid','drawHintHighlight','showCrackEffect'])game.renderer[method]=()=>{};
 game.startRenderLoop=()=>{};game.stopRenderLoop=()=>{};game._showFloatingScore=()=>{};game.playCelebration=()=>{};
 return {game,listeners,canvas,cssScale};
}
function point(game,x,y,cssScale=1){const r=game.renderer,b=r.canvas.getBoundingClientRect();return {clientX:b.left+(r.panX+r.shakeX+(r.gridOffsetX+x*r.cellSize)*r.scale)*cssScale,clientY:b.top+(r.panY+r.shakeY+(r.gridOffsetY+y*r.cellSize)*r.scale)*cssScale};}
function tap(h,start,end=start){h.listeners.touchstart({touches:[start],preventDefault(){}});h.listeners.touchend({touches:[],changedTouches:[end],cancelable:true,preventDefault(){}});}
function frame(dt){now+=dt;const batch=rafs.splice(0);batch.forEach(fn=>fn(now));}
check('blocked arrow keeps exact-cell ownership even beside a removable arrow',()=>{
 const h=fresh();h.game.startLevel(simple,chapters[0]);const g=new Grid(4,4);g.loadFromData([{cells:[[1,1]],direction:'up'},{cells:[[1,0]],direction:'up'},{cells:[[2,1]],direction:'right'}]);
 assert.equal(g.isPathClear(g.paths[0]),false);assert.equal(g.isPathClear(g.paths[1]),true);
 const p=point(h.game,1.5,1.5);assert.equal(hitTestPath(g,h.game.renderer,p.clientX,p.clientY),g.paths[0]);
});
let coordinateCases=0;
check('all 50 level dimensions: phone/tablet/landscape, DPR 1/2/3, zoom .5/1/3, safe-area offsets, CSS scale and pan/shake',()=>{
 for(const [width,height] of [[320,568],[390,844],[768,1024],[844,390]])for(const l of allLevels)for(const dpr of [1,2,3])for(const cssScale of [.8,1,1.25]){
 const h=fresh({width,height,dpr,cssScale,left:17,top:138});h.game.startLevel(l,chapters[l.chapter-1]);
 for(const zoom of [.5,1,3]){const r=h.game.renderer;r.scale=zoom;r.panX=-23;r.panY=41;r.shakeX=2;r.shakeY=-1;
 for(const path of h.game.grid.paths){const c=path.getHead(),p=point(h.game,c.x+.5,c.y+.5,cssScale);assert.equal(hitTestPath(h.game.grid,r,p.clientX,p.clientY),path);coordinateCases++;}}
 }
});
check('exact blocked selection, empty/outside, overlapping cells and geometric fallback',()=>{
 const h=fresh();h.game.startLevel(simple,chapters[0]);const r=h.game.renderer,g=h.game.grid;
 function hit(x,y){const p=point(h.game,x,y);return hitTestPath(g,r,p.clientX,p.clientY);}
 assert.equal(hit(-.1,.5),null);assert.equal(hit(2.5,2.5),null);
 g.addPath([[0,0]],'up',0);assert.equal(hit(.5,.5),null);
 const small=fresh({width:96,height:96});small.game.startLevel({...simple,paths:[{cells:[[0,0]],direction:'right'}]},chapters[0]);const near=point(small.game,1.05,.5);assert.equal(hitTestPath(small.game.grid,small.game.renderer,near.clientX,near.clientY),small.game.grid.paths[0]);
});
check('two rapid adjacent arrow taps both fire, synthetic click does not fire again',()=>{
 const h=fresh({width:96,height:96});h.game.startLevel(simple,chapters[0]);const fired=[];h.game.removePathWithAnimation=p=>fired.push(h.game.grid.paths.indexOf(p));
 tap(h,point(h.game,.5,.5));now+=150;tap(h,point(h.game,1.5,.5));const p=point(h.game,1.5,.5);h.listeners.click({...p,detail:1});assert.deepEqual(fired,[0,1]);
});
check('lift resolves the final boundary; cancelled, unarmed expired and pan gestures do not move arrows',()=>{
 const h=fresh({width:96,height:96});h.game.startLevel(simple,chapters[0]);const fired=[];h.game.removePathWithAnimation=p=>fired.push(h.game.grid.paths.indexOf(p));
 tap(h,point(h.game,.95,.5),point(h.game,1.05,.5));assert.deepEqual(fired,[1]);
 const p=point(h.game,.5,.5);h.listeners.touchstart({touches:[p],preventDefault(){}});h.listeners.touchcancel();h.listeners.touchend({touches:[],changedTouches:[p],cancelable:true,preventDefault(){}});assert.equal(fired.length,1);
 h.listeners.touchstart({touches:[p],preventDefault(){}});now+=500;h.listeners.touchend({touches:[],changedTouches:[p],cancelable:true,preventDefault(){}});assert.equal(fired.length,1);assert.equal(h.game.renderer.previewPath,null);
 tap(h,p,{clientX:p.clientX+30,clientY:p.clientY});assert.equal(fired.length,1);
});
check('queued tap keeps path identity through zoom and cannot leak after restart',()=>{
 const h=fresh();h.game.startLevel(simple,chapters[0]);const fired=[];h.game.isAnimating=true;h.game.removePathWithAnimation=p=>fired.push(h.game.grid.paths.indexOf(p));
 tap(h,point(h.game,1.5,.5));h.game.renderer.scale=2;h.game.isAnimating=false;h.game._processQueuedTap();assert.deepEqual(fired,[1]);
 h.game.isAnimating=true;tap(h,point(h.game,2.5,.5));h.game.startLevel(simple,chapters[0]);h.game._processQueuedTap();assert.deepEqual(fired,[1]);
});
check('restart/leave during removal cancels old RAF and preserves the new grid and score',()=>{
 const h=fresh();h.game.startLevel(simple,chapters[0]);h.game.removePathWithAnimation(h.game.grid.paths[0]);h.game.startLevel(allLevels[0],chapters[0]);const grid=h.game.grid;frame(30000);
 assert.equal(h.game.grid,grid);assert.equal(h.game.score,0);assert.equal(h.game.moves,0);assert.equal(h.game.isAnimating,false);assert.equal(grid.getActivePaths().length,allLevels[0].paths.length);
});
check('timeout while final arrow animates has one failure outcome and no completed save; rewarded resume works',()=>{
 const h=fresh();const l={...simple,paths:[simple.paths[0]]};h.game.startLevel(l,chapters[0]);let failed=0;h.game.onTimeUp=()=>failed++;h.game.timeRemaining=.05;h.game.removePathWithAnimation(h.game.grid.paths[0]);now+=100;intervals.get(h.game._timerInterval)();frame(10000);
 assert.equal(failed,1);assert.equal(storage.isLevelCompleted(l.id),false);assert.equal(h.game.grid.paths[0].state,'removable');assert.equal(h.game.moves,0);assert.equal(h.game.score,0);h.game.resumeLevel(60);assert.equal(h.game._active,true);assert.ok(h.game._timerInterval);
});
check('classic to Zen and daily moves transition stop the old countdown; leaving stops it',()=>{
 const h=fresh();h.game.startLevel(simple,chapters[0]);const old=h.game._timerInterval;storage.setGameMode('zen');h.game.startLevel(simple,chapters[0]);assert.equal(intervals.has(old),false);assert.equal(h.game._timerInterval,null);
 storage.setGameMode('classic');h.game.startLevel(simple,chapters[0],{dailyModifier:{type:'moves',extraMoves:2}});assert.equal(h.game._timerInterval,null);h.game.leaveLevel();assert.equal(h.game._active,false);
});
check('real low-time vignette clears on leave and timeout before Zen, untimed Daily Moves or Classic retry',()=>{
 for(const destination of ['leave-to-zen','timeout-to-zen','timeout-to-moves','timeout-retry-classic']){
  const h=fresh(),game=h.game;game.startLevel(allLevels[0],chapters[0]);
  const tick=intervals.get(game._timerInterval);assert.equal(typeof tick,'function');
  game.timeRemaining=8;now+=100;tick();
  assert.ok(game.renderer._vignetteAlpha>0,'The real renderer stores the under-10-second warning');
  if(destination==='leave-to-zen'){
   game.leaveLevel();assert.equal(game.renderer._vignetteAlpha,0,'Leaving clears the old attempt immediately');
  }else{
   let timeUps=0;game.onTimeUp=()=>{timeUps++;assert.equal(game.renderer._vignetteAlpha,0,'Clear before presenting timeout UI');};
   game.timeRemaining=.01;now+=20;tick();
   assert.equal(timeUps,1);assert.equal(game._outcome,'time-up');
   assert.equal(game._active,false);assert.equal(game._timerInterval,null);
   assert.equal(game.renderer._vignetteAlpha,0,'A timeout cannot leave a permanent warning');
  }
  if(destination.endsWith('zen')){
   storage.setGameMode('zen');game.startLevel(allLevels[2],chapters[0]);
   assert.equal(game.zenMode,true);assert.equal(game._timerInterval,null);assert.equal(el('game-timer').textContent,'∞');
  }else if(destination==='timeout-to-moves'){
   storage.setGameMode('zen');game.startLevel({...allLevels[2],id:'daily-vignette-probe'},chapters[0],
    {isDailyChallenge:true,dailyModifier:{type:'moves',extraMoves:2}});
   assert.equal(game.zenMode,false);assert.ok(game.moveLimit>0);assert.equal(game._timerInterval,null);assert.equal(el('game-timer').textContent,'∞');
  }else{
   game.startLevel(allLevels[0],chapters[0]);assert.equal(game.gameMode,'classic');assert.ok(game._timerInterval);
   assert.equal(game.timeRemaining,game.timeLimit);
   now+=100;intervals.get(game._timerInterval)();assert.ok(game.timeRemaining>10);
  }
  assert.equal(game.renderer._vignetteAlpha,0,'The new board must start without the previous warning');
  now+=3000;if(game._timerInterval)intervals.get(game._timerInterval)();frame(16);
  assert.equal(game.renderer._vignetteAlpha,0,'Untimed or retried boards cannot regain the stale effect');
 }
});
check('daily time and moves enforce their constraints after a saved Zen preference, without changing campaign mode or resume',()=>{
 const h=fresh();storage.setGameMode('zen');h.game.startLevel(simple,chapters[0]);assert.equal(h.game.zenMode,true);
 const resume=storage.getLastPlayed();
 h.game.startLevel({...simple,id:'daily-time-probe'},chapters[0],{dailyModifier:{type:'time',multiplier:.6},gameMode:'classic'});
 assert.equal(h.game.gameMode,'classic');assert.equal(h.game.zenMode,false);assert.ok(h.game._timerInterval);
 const dailyTime=h.game.timeRemaining;h.game.handleWrongMove(h.game.grid.paths[0]);
 assert.equal(h.game.wrongMoves,1);assert.equal(storage.getLives(),2);
 now+=1000;intervals.get(h.game._timerInterval)();assert.equal(h.game.timeRemaining,dailyTime-1);
 assert.equal(storage.getGameMode(),'zen');assert.deepEqual(storage.getLastPlayed(),resume);
 h.game.startLevel({...simple,id:'daily-moves-probe'},chapters[0],{dailyModifier:{type:'moves',extraMoves:2},gameMode:'classic'});
 assert.equal(h.game.gameMode,'classic');assert.equal(h.game.zenMode,false);assert.equal(h.game._timerInterval,null);assert.equal(h.game.moveLimit,simple.paths.length+2);
 h.game.handleWrongMove(h.game.grid.paths[0]);assert.equal(h.game.wrongMoves,1);assert.equal(h.game._isMovesExhausted(),false);
 h.game.moves=h.game.moveLimit-1;assert.equal(h.game._isMovesExhausted(),true);
 assert.equal(storage.getGameMode(),'zen');assert.deepEqual(storage.getLastPlayed(),resume);
 h.game.startLevel(simple,chapters[0]);assert.equal(h.game.zenMode,true);assert.equal(h.game._timerInterval,null);
});
check('hidden time pauses countdown and clears queued input; returning resumes only an active timed session',()=>{
 const h=fresh();h.game.startLevel(simple,chapters[0]);const initial=h.game.timeRemaining,oldTimer=h.game._timerInterval;
 const fired=[];h.game.removePathWithAnimation=p=>fired.push(p);h.game.isAnimating=true;tap(h,point(h.game,1.5,.5));
 document.hidden=true;h.game.handleVisibilityChange(true);assert.equal(h.game._timerInterval,null);assert.equal(intervals.has(oldTimer),false);
 h.game.isAnimating=false;h.game._processQueuedTap();assert.equal(fired.length,0);
 now+=30000;assert.equal(h.game.timeRemaining,initial);
 document.hidden=false;h.game.handleVisibilityChange(false);assert.ok(h.game._timerInterval);now+=1000;intervals.get(h.game._timerInterval)();assert.equal(h.game.timeRemaining,initial-1);
 // A visibility tick arriving before the event handler also ignores hidden time.
 document.hidden=true;now+=30000;intervals.get(h.game._timerInterval)();assert.equal(h.game.timeRemaining,initial-1);
 document.hidden=false;now+=1000;intervals.get(h.game._timerInterval)();assert.equal(h.game.timeRemaining,initial-2);
 document.hidden=true;h.game.handleVisibilityChange(true);h.game.leaveLevel();now+=30000;document.hidden=false;h.game.handleVisibilityChange(false);
 assert.equal(h.game._active,false);assert.equal(h.game._timerInterval,null);
 storage.setGameMode('zen');h.game.startLevel(simple,chapters[0]);h.game.handleVisibilityChange(true);now+=30000;h.game.handleVisibilityChange(false);assert.equal(h.game._timerInterval,null);
 h.game.startLevel(simple,chapters[0],{dailyModifier:{type:'moves',extraMoves:2}});h.game.handleVisibilityChange(true);now+=30000;h.game.handleVisibilityChange(false);assert.equal(h.game._timerInterval,null);
});
check('completed stars reward accuracy in Classic, Zen and Daily, while Timed keeps a generous speed target and hints cap stars',()=>{
 const cases=[
  {mode:'classic',ratio:.01,expected:3},
  {mode:'classic',ratio:.01,hint:true,expected:2},
  {mode:'classic',ratio:.01,wrong:2,expected:2},
  {mode:'timed',ratio:.2,expected:2},
  {mode:'timed',ratio:.3,expected:3},
  {mode:'timed',ratio:.9,hint:true,expected:2},
  {mode:'zen',ratio:.01,expected:3},
  {mode:'timed',ratio:.01,dailyModifier:{type:'time',multiplier:.6},expected:3},
  {mode:'zen',ratio:.01,dailyModifier:{type:'moves',extraMoves:2},expected:3},
 ];
 const level={...simple,paths:[{cells:[[1,1]],direction:'right'},{cells:[[2,1]],direction:'up'},{cells:[[0,0]],direction:'up'}]};
 for(const c of cases){
  const h=fresh();storage.setGameMode(c.mode);h.game.startLevel(level,chapters[0],{dailyModifier:c.dailyModifier});
  if(c.hint){h.game.useHint();assert.equal(h.game.usedHint,true);}
  for(let i=0;i<(c.wrong||0);i++){assert.equal(h.game.grid.isPathClear(h.game.grid.paths[0]),false);h.game.handleWrongMove(h.game.grid.paths[0]);frame(400);}
  h.game.timeRemaining=h.game.timeLimit*c.ratio;
  while(!h.game.grid.isCleared()){
   const path=h.game.grid.paths.find(p=>!p.isRemoved()&&h.game.grid.isPathClear(p));assert.ok(path);h.game.removePathWithAnimation(path);frame(400);
  }
  assert.equal(h.game._outcome,'complete');assert.equal(h.game.moves,level.paths.length);
  assert.equal(storage.getLevelScore(level.id).stars,c.expected,JSON.stringify(c));
 }
});
check('deliberate legal solves of the real first four boards open the final puzzle without replaying for speed',()=>{
 const h=fresh();storage.setGameMode('classic');assert.equal(storage.isBossLocked(1,5),true);
 for(const level of allLevels.slice(0,4)){
  h.game.startLevel(level,chapters[0]);
  while(!h.game.grid.isCleared()){
   const active=h.game.grid.getActivePaths();const path=h.game.grid.hasRuneOrder() ? h.game.grid.paths[h.game.grid.getRuneAnalysis().solution[0]] : active.find(p=>h.game.grid.isPathClear(p));assert.ok(path);
   if(active.length===1)h.game.timeRemaining=1;
   h.game.removePathWithAnimation(path);frame(400);
  }
  assert.equal(h.game._outcome,'complete');assert.equal(h.game.moves,level.paths.length);assert.equal(storage.getLevelScore(level.id).stars,3);
 }
 assert.equal(storage.getBossGateProgress(1).current,12);assert.equal(storage.isBossLocked(1,5),false);assert.equal(storage.isChapterUnlocked(2),true);
});
check('Zen wrong taps cost no lives/moves; undo restores path/score/combo; stale callbacks cannot save',()=>{
 const h=fresh();storage.setGameMode('zen');h.game.startLevel(simple,chapters[0]);h.game.handleWrongMove(h.game.grid.paths[0]);assert.equal(storage.getLives(),3);assert.equal(h.game.wrongMoves,0);
 h.game.removePathWithAnimation(h.game.grid.paths[0]);frame(1000);assert.equal(h.game.moves,1);assert.equal(h.game.undoLastMove(),true);assert.equal(h.game.moves,0);assert.equal(h.game.score,0);assert.equal(h.game.maxCombo,0);assert.equal(h.game.grid.paths[0].state,'removable');
 h.game.leaveLevel();assert.equal(h.game.undoLastMove(),false);h.game.handleLevelComplete();assert.equal(storage.isLevelCompleted(simple.id),false);
});
check('10-star unlock updates on this completion; better stars survive a lower score',()=>{
 const h=fresh();for(let i=1;i<=3;i++)storage.saveLevelScore(`egypt_${i}`,{score:100,stars:3});h.game.startLevel(allLevels.find(l=>l.id==='egypt_4'),chapters[0]);h.game.timeRemaining=1;h.game.wrongMoves=3;h.game.handleLevelComplete();assert.equal(storage.getChapterStars(1),10);assert.equal(storage.isChapterUnlocked(2),true);
 storage.saveLevelScore('greek_1',{score:1000,stars:1});storage.saveLevelScore('greek_1',{score:900,stars:3});assert.equal(storage.getLevelScore('greek_1').stars,3);assert.equal(storage.getLevelScore('greek_1').score,1000);
});
check('actual back routing stops both classic/daily sessions; stale celebration cannot open an overlay in a new story',()=>{
 const h=fresh();h.game.startLevel(simple,chapters[0]);const source=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');const a=source.indexOf('screenManager.getGameBackTarget = () => {');const b=source.indexOf('\n};',a);const manager={};
 new Function('game','screenManager','document',source.slice(a,b+3))(h.game,manager,document);assert.equal(manager.getGameBackTarget(),'levels');assert.equal(h.game._timerInterval,null);
 h.game.startLevel(simple,chapters[0]);h.game._isDailyChallenge=true;assert.equal(manager.getGameBackTarget(),'menu');assert.equal(h.game._active,false);assert.equal(h.game._isDailyChallenge,false);
 h.game.startLevel(simple,chapters[0]);let called=0;Game.prototype.playCelebration.call(h.game,()=>called++);h.game.leaveLevel();frame(5000);assert.equal(called,0);
});
check('zero-life Zen entry reaches the puzzle, classic entry still requests lives',()=>{
 const h=fresh();h.game.livesManager.renderLives=()=>{};for(let i=0;i<3;i++)storage.loseLife();const source=readFileSync(new URL('../js/main.js',import.meta.url),'utf8'),a=source.indexOf('screenManager.onStartLevel = (levelData, chapterData) => {'),b=source.indexOf('\n};',a);const manager={showScreen(){}};let blocked=0;
 new Function('game','screenManager','storage','showNoLivesOverlay','renderDailyBadge','tutorial','livesDisplay','maybeActivateOnboarding','launchScheduler','isLocalReviewMode',source.slice(a,b+3))(h.game,manager,storage,()=>blocked++,()=>{},{shouldShow:()=>false},{},()=>{},{schedule:(...args)=>setTimeout(()=>h.game.startLevel(...args),50)},isLocalReviewMode);
 storage.setGameMode('classic');manager.onStartLevel(simple,chapters[0]);assert.equal(blocked,1);storage.setGameMode('zen');manager.onStartLevel(simple,chapters[0]);timeouts.splice(0).forEach(fn=>fn());assert.equal(blocked,1);assert.equal(h.game.zenMode,true);assert.equal(h.game._active,true);
});
check('resize during removal preserves the session, score, path identity and final outcome',()=>{
 const h=fresh();h.game.startLevel(simple,chapters[0]);const grid=h.game.grid,epoch=h.game._levelEpoch;
 h.game.removePathWithAnimation(grid.paths[0]);frame(80);h.canvas.clientWidth=760;h.canvas.clientHeight=400;h.game.handleResize();
 assert.equal(h.game.grid,grid);assert.equal(h.game._levelEpoch,epoch);assert.equal(h.game._active,true);assert.equal(h.game._outcome,null);assert.equal(h.game.moves,1);
 frame(1000);assert.equal(grid.paths[0].state,'removed');assert.equal(grid.getActivePaths().length,2);assert.equal(h.game.isAnimating,false);
 h.game._active=false;h.game._outcome='timeout';h.game.handleResize();assert.equal(h.game._outcome,'timeout');assert.equal(h.game._active,false);
});
check('Reduce Motion removes in place and a blocked attempt restores state without moving cells',()=>{
 const h=fresh();h.game.startLevel(simple,chapters[0]);h.game.renderer._motionQuery={matches:true};const path=h.game.grid.paths[0],cells=path.cells.map(c=>({...c}));
 h.game.removePathWithAnimation(path);frame(60);assert.deepEqual(path.cells,cells);assert.equal(h.game.isAnimating,true);frame(80);assert.equal(path.state,'removed');assert.equal(h.game.isAnimating,false);
 const blocked=h.game.grid.paths[1],original=blocked.cells.map(c=>({...c}));h.game.handleWrongMove(blocked);frame(60);assert.deepEqual(blocked.cells,original);assert.equal(h.game.renderer.shakeX,0);assert.equal(h.game.renderer.shakeY,0);frame(80);assert.deepEqual(blocked.cells,original);assert.equal(h.game.isAnimating,false);assert.equal(h.game.wrongMoves,1);
});
const bentLevel={...simple,paths:[{cells:[[1,2],[1,1],[2,1]],direction:'right'},simple.paths[0]]};
check('conveyor removal keeps logical cells immutable and geometry stable through resize, then undo clears all motion',()=>{
 const h=fresh();h.game.startLevel(bentLevel,chapters[0]);const path=h.game.grid.paths[0],cells=path.cells.map(c=>({...c}));
 h.game.removePathWithAnimation(path);frame(80);assert.deepEqual(path.cells,cells);assert.equal(path._visualGeometry.alpha,1);assert.notDeepEqual(path._visualGeometry.points,cells);
 const geometry=JSON.stringify(path._visualGeometry);h.canvas.clientWidth=800;h.canvas.clientHeight=350;h.game.handleResize();assert.equal(JSON.stringify(path._visualGeometry),geometry);assert.deepEqual(path.cells,cells);
 frame(280);assert.equal(path.state,'removed');assert.equal(path._visualGeometry,null);assert.equal(h.game.isAnimating,false);assert.equal(h.game.undoLastMove(),true);assert.equal(path._visualGeometry,null);assert.deepEqual(path.cells,cells);assert.equal(path.state,'removable');
});
check('leaving and timing out mid-conveyor discard visual geometry and restore original cells, score and pending move',()=>{
 for(const outcome of ['leave','timeout']){
  const h=fresh();h.game.startLevel(bentLevel,chapters[0]);const path=h.game.grid.paths[0],cells=path.cells.map(c=>({...c}));
  h.game.removePathWithAnimation(path);frame(70);assert.ok(path._visualGeometry);assert.deepEqual(path.cells,cells);
  if(outcome==='leave')h.game.leaveLevel();else{h.game.timeRemaining=.05;now+=100;intervals.get(h.game._timerInterval)();}
  assert.equal(path._visualGeometry,null);assert.deepEqual(path.cells,cells);assert.equal(path.state,'removable');assert.equal(h.game.score,0);assert.equal(h.game.moves,0);assert.equal(h.game._moveHistory.length,0);frame(400);assert.equal(path._visualGeometry,null);assert.equal(path.state,'removable');
 }
});
check('blocked departure moves only visual geometry and clears it when complete or cancelled',()=>{
 const h=fresh();h.game.startLevel(bentLevel,chapters[0]);const path=h.game.grid.paths[0],cells=path.cells.map(c=>({...c}));
 h.game.handleWrongMove(path);frame(90);assert.ok(path._visualGeometry);assert.deepEqual(path.cells,cells);assert.equal(path._flashColor,'#dc3545');frame(280);assert.equal(path._visualGeometry,null);assert.deepEqual(path.cells,cells);assert.equal(path._flashColor,null);
 h.game.handleWrongMove(path);frame(40);assert.ok(path._visualGeometry);h.game.leaveLevel();assert.equal(path._visualGeometry,null);assert.equal(path._flashColor,null);assert.deepEqual(path.cells,cells);
});
check('an expanding canvas and zoom out mid-flight still clip the entire body before the 360 ms queued-tap limit',()=>{
 for(const direction of ['up','right','down','left']){
  const h=fresh();h.game.startLevel({...simple,paths:[{cells:[[1,1]],direction},simple.paths[0]]},chapters[0]);const path=h.game.grid.paths[0];let lastGeometry;
  h.game.renderer.drawGrid=()=>{if(path._visualGeometry)lastGeometry=path._visualGeometry;};h.game.removePathWithAnimation(path);frame(80);
  h.canvas.clientWidth=1000;h.canvas.clientHeight=300;h.game.handleResize();h.game.renderer.setZoom(.5,500,150);frame(280);
  const bounds=h.game.renderer.getVisibleGridBounds();assert.equal(lastGeometry.alpha,1);assert.ok(lastGeometry.points.every(p=>direction==='right'?p.x>bounds.right:direction==='left'?p.x<bounds.left:direction==='down'?p.y>bounds.bottom:p.y<bounds.top));assert.equal(path._visualGeometry,null);assert.equal(path.state,'removed');assert.equal(h.game.isAnimating,false);
 }
});
console.log(JSON.stringify({passed:passed.length,coordinateCases,checks:passed},null,2));
