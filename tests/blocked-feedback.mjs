import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Grid } from '../js/grid.js';
import { ArrowState, getDirectionVector } from '../js/arrow.js';
import { allLevels } from '../js/levels.js';
import { chapters } from '../js/data/chapters.js';
import { BOARD_VISUALS } from '../js/balance.js';
import { ARROW_ERROR_COLOR, ARROW_DARK_ERROR_COLOR, arrowColorVariant } from '../js/arrow-motion.js';

let now = 10000, nextId = 1;
const memory = new Map(), timers = new Map(), intervals = new Map(), rafs = [], elements = new Map();
globalThis.performance = { now: () => now };
Date.now = () => now;
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key,value) => memory.set(key,value), removeItem: key => memory.delete(key) };
globalThis.setTimeout = (fn,delay = 0) => { const id = nextId++; timers.set(id,{fn,at:now+delay}); return id; };
globalThis.clearTimeout = id => timers.delete(id);
globalThis.setInterval = fn => { const id = nextId++; intervals.set(id,fn); return id; };
globalThis.clearInterval = id => intervals.delete(id);
globalThis.requestAnimationFrame = fn => { rafs.push(fn); return nextId++; };
globalThis.cancelAnimationFrame = () => {};
Object.defineProperty(globalThis, 'navigator', { value:{}, configurable:true });
globalThis.window = { devicePixelRatio:3, matchMedia:()=>({matches:false}) };
function element(id) {
    if (!elements.has(id)) elements.set(id,{ textContent:'', style:{setProperty(){}}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){} });
    return elements.get(id);
}
globalThis.document = { getElementById:element, documentElement:element('root'), body:{dataset:{},classList:{contains(){return false;}}} };
globalThis.fetch = async url => ({json:async()=>JSON.parse(readFileSync(new URL(`../${url.split('?')[0]}`,import.meta.url),'utf8'))});
const { Game } = await import('../js/game.js');
const { storage } = await import('../js/storage.js');
const { loadLanguage, t } = await import('../js/i18n.js?v=2');
await loadLanguage('tr');

const passed = [];
function check(name, fn) { fn(); passed.push(name); }
const level = { id:'blocked-probe', chapter:1, level:1, name:'probe', gridWidth:8, gridHeight:5, paths:[
    {cells:[[1,2]],direction:'right'},
    {cells:[[5,2],[5,1]],direction:'up'},
    {cells:[[7,4]],direction:'down'},
] };
function fresh(data = level, mode = 'classic', powerups = {}) {
    memory.clear(); timers.clear(); intervals.clear(); rafs.length = 0; elements.clear();
    const listeners = {}, calls = [];
    const ctx = new Proxy({}, {get:(_target,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):(...args)=>calls.push([key,...args])});
    const canvas = {clientWidth:390,clientHeight:530,getContext:()=>ctx,getBoundingClientRect:()=>({left:17,top:80,width:390,height:530}),addEventListener:(key,fn)=>listeners[key]=fn};
    const game = new Game(canvas);
    game.startRenderLoop = game.stopRenderLoop = game._showFloatingScore = game.playCelebration = () => {};
    for (const [key,count] of Object.entries(powerups)) storage.earnPowerup(key,count);
    storage.setGameMode(mode); game.startLevel(data,chapters[data.chapter-1]);
    return {game,listeners,calls,canvas};
}
function advance(dt) {
    now += dt;
    rafs.splice(0).forEach(fn=>fn(now));
    for (const [id,timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
}
function point(game,x,y) {
    const r = game.renderer;
    return { clientX:17+r.panX+(r.gridOffsetX+x*r.cellSize)*r.scale, clientY:80+r.panY+(r.gridOffsetY+y*r.cellSize)*r.scale };
}
function click(h,x,y) { h.listeners.click({...point(h.game,x,y),detail:1}); }

check('first occupied cell wins in all four directions, independent of path order',()=>{
    for (const direction of ['up','down','left','right']) {
        const {dx,dy} = getDirectionVector(direction), grid = new Grid(9,9);
        const source = grid.addPath([[4,4]],direction);
        grid.addPath([[4+dx*3,4+dy*3]],'up');
        const near = grid.addPath([[4+dx*2,4+dy*2]],'up');
        const result = grid.getFirstBlocker(source);
        assert.deepEqual(result,{type:'path',x:4+dx*2,y:4+dy*2,path:near,distance:2});
        assert.equal(grid.isPathClear(source),false);
    }
});
check('walls take precedence in an occupied cell; removed/removing/self cells do not block',()=>{
    const grid = new Grid(8,3), source = grid.addPath([[3,1],[2,1]],'right');
    const other = grid.addPath([[5,1]],'up');
    grid.walls = [[5,1]];
    assert.deepEqual(grid.getFirstBlocker(source),{type:'wall',x:5,y:1,path:null,distance:3});
    grid.walls = [];
    for (const state of [ArrowState.REMOVED,ArrowState.REMOVING]) {
        other.state = state;
        assert.equal(grid.getFirstBlocker(source),null); assert.equal(grid.isPathClear(source),true);
    }
});
check('grid edges are exits and malformed/out-of-bounds heads never create a ray',()=>{
    const grid = new Grid(3,3);
    for (const [cells,direction] of [[[[0,0]],'up'],[[[2,2]],'right']]) {
        const path = grid.addPath(cells,direction); assert.equal(grid.getFirstBlocker(path),null); assert.equal(grid.isPathClear(path),true);
    }
    for (const [cells,direction] of [[[],'up'],[[[-1,1]],'right'],[[[1,1]],'invalid']]) {
        const path = grid.addPath(cells,direction); assert.equal(grid.getFirstBlocker(path),null); assert.equal(grid.isPathClear(path),false);
    }
});
check('real Greek long rays identify exactly the first obstacle and stop at its entry edge',()=>{
    let tested = 0;
    for (const data of allLevels.slice(5,10)) {
        const h = fresh(data);
        for (const path of h.game.grid.paths) {
            const blocker = h.game.grid.getFirstBlocker(path);
            if (!blocker || blocker.distance < 4) continue;
            h.game.renderer.showBlockedFeedback(path,blocker);
            const geometry = h.game.renderer.getBlockedFeedbackGeometry();
            const head = path.getHead(), {dx,dy} = getDirectionVector(path.direction);
            assert.deepEqual(geometry.cell,{x:blocker.x,y:blocker.y});
            assert.ok(Math.abs(Math.hypot(geometry.end.x-geometry.start.x,geometry.end.y-geometry.start.y)-(blocker.distance-.88))<1e-9);
            for (let d=1;d<blocker.distance;d++) assert.equal(h.game.grid.getPathAt(head.x+dx*d,head.y+dy*d),null);
            assert.equal(h.game.grid.getPathAt(blocker.x,blocker.y),blocker.path);
            tested++;
        }
    }
    assert.ok(tested >= 1,'Campaign must exercise a distant causal blocker');
});
check('world-space ray and cell outline preserve their logical positions during zoom/resize and Reduce Motion',()=>{
    const h = fresh(), r = h.game.renderer, path = h.game.grid.paths[0], blocker = h.game.grid.getFirstBlocker(path);
    r.showBlockedFeedback(path,blocker); const geometry = r.getBlockedFeedbackGeometry();
    const colors = h.game.grid.paths.map(p=>r._getPathColor(p));
    r.setZoom(2,180,280); r.panX = -35; r.panY = 20;
    h.canvas.clientWidth = 760; h.canvas.clientHeight = 300;
    h.canvas.getBoundingClientRect = ()=>({left:17,top:80,width:760,height:300});
    r.resize(8,5,{preserveView:true}); r._motionQuery.matches = true;
    assert.deepEqual(r.getBlockedFeedbackGeometry(),geometry);
    h.calls.length = 0; r.drawGrid(h.game.grid);
    assert.ok(h.calls.some(([key,x,y])=>key==='moveTo'&&x===r.gridOffsetX+geometry.start.x*r.cellSize&&y===r.gridOffsetY+geometry.start.y*r.cellSize));
    assert.ok(h.calls.some(([key,x,y])=>key==='roundRect'&&x===r.gridOffsetX+blocker.x*r.cellSize+r.cellSize*.07&&y===r.gridOffsetY+blocker.y*r.cellSize+r.cellSize*.07));
    assert.deepEqual(h.game.grid.paths.map(p=>r._getPathColor(p)),colors);
    assert.equal(r.shakeX,0); assert.equal(r.shakeY,0);
});
check('Classic cue appears after the 320ms error and expires after exactly 900ms without a second penalty',()=>{
    const h = fresh(), game = h.game;
    game.handleWrongMove(game.grid.paths[0]);
    assert.equal(game.renderer.blockedFeedback,null); assert.equal(storage.getLives(),2);
    advance(319); assert.equal(game.renderer.blockedFeedback,null);
    advance(1); assert.ok(game.renderer.blockedFeedback); assert.equal(game.isAnimating,false);
    assert.equal(element('game-feedback').textContent,t('game.blocked_feedback'));
    assert.equal(game.wrongMoves,1); assert.equal(game.hintedPath,null); assert.equal(game.usedHint,false);
    advance(899); assert.ok(game.renderer.getBlockedFeedbackGeometry());
    advance(1); assert.equal(game.renderer.blockedFeedback,null); assert.equal(element('game-feedback').textContent,'');
    assert.equal(storage.getLives(),2); assert.equal(game.wrongMoves,1);
});
check('Reduce Motion preserves the 120ms stationary response then shows the same static blocker',()=>{
    const h = fresh(), game = h.game, path = game.grid.paths[0], cells = structuredClone(path.cells);
    game.renderer._motionQuery.matches = true;
    game.handleWrongMove(path); advance(60);
    assert.deepEqual(path.cells,cells); assert.equal(game.renderer.blockedFeedback,null); assert.equal(game.renderer.shakeX,0);
    advance(60); assert.ok(game.renderer.blockedFeedback); assert.equal(path._visualGeometry,null);
});
check('Zen cue is immediate and never spends lives, attempts, hints, score or combo',()=>{
    const h = fresh(level,'zen'), game = h.game; game.score=120; game.combo=4;
    game.handleWrongMove(game.grid.paths[0]);
    assert.ok(game.renderer.blockedFeedback); assert.equal(game.isAnimating,false);
    assert.equal(storage.getLives(),3); assert.equal(game.wrongMoves,0); assert.equal(game.moves,0);
    assert.equal(game.score,120); assert.equal(game.combo,4); assert.equal(game.usedHint,false); assert.equal(game.hintedPath,null);
    advance(180); assert.equal(game.grid.paths[0]._flashColor,null); assert.ok(game.renderer.blockedFeedback);
});
check('Classic and Zen error flashes use brighter coral on dark stone and retain red on light stone',()=>{
    for (const dark of [false,true]) for (const mode of ['classic','zen']) {
        const h=fresh(level,mode),game=h.game,path=game.grid.paths[0];
        game.renderer.theme.background=dark?BOARD_VISUALS.darkBackground:BOARD_VISUALS.background;
        game.handleWrongMove(path); if (mode==='classic') advance(60);
        assert.equal(path._flashColor,dark?ARROW_DARK_ERROR_COLOR:ARROW_ERROR_COLOR);
        if (mode==='classic') advance(260);
        assert.ok(game.renderer.blockedFeedback);
    }
});
check('a new empty tap clears the cue, and an old expiry cannot clear a replacement cue',()=>{
    const h = fresh(level,'zen'), game = h.game;
    game.handleWrongMove(game.grid.paths[0]);
    const oldExpiry = [...timers.values()].find(t=>t.at===now+900).fn;
    click(h,.5,.5); assert.equal(game.renderer.blockedFeedback,null); assert.equal(game.grid.paths[0]._flashColor,null);
    advance(200); game.handleWrongMove(game.grid.paths[0]); const newer = game.renderer.blockedFeedback;
    oldExpiry(); assert.equal(game.renderer.blockedFeedback,newer); assert.equal(element('game-feedback').textContent,t('game.blocked_feedback'));
});
check('an old Zen flash callback cannot erase a newer tap response on the same arrow',()=>{
    const h = fresh(level,'zen'), game = h.game, path = game.grid.paths[0];
    game.handleWrongMove(path); const oldFlash = [...timers.values()].find(t=>t.at===now+180).fn;
    advance(100); game.handleWrongMove(path); oldFlash();
    assert.ok(path._flashColor); advance(180); assert.equal(path._flashColor,null);
});
check('a queued successful tap clears the just-completed Classic cue without dropping the tap',()=>{
    const h = fresh(), game = h.game;
    game.handleWrongMove(game.grid.paths[0]); click(h,7.5,4.5); advance(320);
    assert.equal(game.renderer.blockedFeedback,null); assert.equal(game.moves,1); assert.equal(game.isAnimating,true);
    advance(400); assert.equal(game.grid.paths[2].state,ArrowState.REMOVED); assert.equal(storage.getLives(),2);
});
check('a queued empty tap also clears the completed Classic cue without spending another attempt',()=>{
    const h = fresh(), game = h.game;
    game.handleWrongMove(game.grid.paths[0]); click(h,.5,.5); advance(320);
    assert.equal(game.renderer.blockedFeedback,null); assert.equal(game.wrongMoves,1); assert.equal(game.moves,0); assert.equal(game.isAnimating,false);
});
check('undo clears feedback, restores a legal removed path, and does not spend another hint or life',()=>{
    const h = fresh(level,'zen'), game = h.game;
    game.removePathWithAnimation(game.grid.paths[2]); advance(400);
    game.handleWrongMove(game.grid.paths[0]); assert.ok(game.renderer.blockedFeedback);
    assert.equal(game.undoLastMove(),true); assert.equal(game.renderer.blockedFeedback,null);
    assert.equal(game.moves,0); assert.equal(game.score,0); assert.equal(game.undoCharges,2); assert.equal(storage.getLives(),3);
});
check('leave/restart cancels feedback and old animation/timer epochs cannot mark a new level',()=>{
    const h = fresh(), game = h.game;
    game.handleWrongMove(game.grid.paths[0]); const staleFrame = rafs.shift(); game.leaveLevel(); staleFrame(now+320);
    assert.equal(game.renderer.blockedFeedback,null); assert.equal(element('game-feedback').textContent,'');
    game.startLevel(level,chapters[0]); game.zenMode = true; game.handleWrongMove(game.grid.paths[0]);
    const staleExpiry = [...timers.values()].find(t=>t.at===now+900).fn;
    game.startLevel(level,chapters[0]); game.zenMode = true; game.handleWrongMove(game.grid.paths[0]); const current = game.renderer.blockedFeedback;
    staleExpiry(); assert.equal(game.renderer.blockedFeedback,current);
});
check('repeated Classic wrong taps explain the same blocker without revealing an unrelated removable arrow',()=>{
    const h = fresh(), game = h.game;
    for (let i=0;i<2;i++) { game.handleWrongMove(game.grid.paths[0]); advance(320); }
    assert.equal(game.hintedPath,null); assert.equal(game.usedHint,false); assert.equal(game.wrongMoves,2); assert.equal(storage.getLives(),1);
    assert.equal(game.renderer.blockedFeedback.blocker.path,game.grid.paths[1]);
});
check('fresh first campaign puzzle guides exactly three successes and persists dismissal',()=>{
    const h = fresh(allLevels[0]), game = h.game;
    assert.equal(game.onboardingActive,true); assert.equal(game.onboardingTapsLeft,3);
    assert.equal(element('game-feedback').textContent,t('game.guided_feedback'));
    for (let i=0;i<3;i++) {
        const path = game.grid.paths.find(p=>!p.isRemoved()&&game.grid.isPathClear(p));
        game.removePathWithAnimation(path); advance(400);
        assert.equal(game.onboardingTapsLeft,2-i);
    }
    assert.equal(game.onboardingActive,false); assert.equal(memory.get('okchu_onboarding_done'),'1'); assert.equal(element('game-feedback').textContent,'');
    game.startLevel(allLevels[0],chapters[0]); assert.equal(game.onboardingActive,false);
});
check('daily/completed/other boards do not activate guided taps; leaving clears the guide',()=>{
    const h = fresh(allLevels[0]), game = h.game; game.leaveLevel();
    assert.equal(game.onboardingActive,false); assert.equal(element('game-feedback').textContent,'');
    for (const opts of [{isDailyChallenge:true},{dailyModifier:{type:'moves',extraMoves:2}}]) {
        game.startLevel(allLevels[0],chapters[0],opts); assert.equal(game.onboardingActive,false);
    }
    storage.completeLevel('egypt_1',1);
    game.startLevel(allLevels[0],chapters[0]); assert.equal(game.onboardingActive,false);
    game.startLevel(allLevels[1],chapters[0]); assert.equal(game.onboardingActive,false);
});
check('available hint count includes the free hint, free is spent first, then one earned hint after a successful move',()=>{
    const h = fresh(level,'zen'), game = h.game;
    assert.equal(element('powerup-hint-count').textContent,1); assert.equal(element('btn-powerup-hint').disabled,false);
    storage.earnPowerup('hint',2); game._updatePowerupButtons();
    assert.equal(element('powerup-hint-count').textContent,3);
    game.useHint(); const firstHint = game.hintedPath;
    assert.ok(firstHint); assert.equal(game.hintManager.hasFreeHint(),false); assert.equal(storage.getPowerups().hint,2);
    assert.equal(element('powerup-hint-count').textContent,2); assert.equal(element('btn-powerup-hint').disabled,true);
    game.useHint(); assert.equal(storage.getPowerups().hint,2,'Repeated press cannot spend another hint for the same visible answer');
    game.removePathWithAnimation(firstHint); advance(400); assert.equal(game.hintedPath,null);
    assert.equal(element('btn-powerup-hint').disabled,false);
    game.useHint(); assert.ok(game.hintedPath); assert.equal(storage.getPowerups().hint,1); assert.equal(element('powerup-hint-count').textContent,1);
    assert.equal(game.usedHint,true); assert.ok(game.calculateStars()<=2,'Hint star penalty is retained');
});
check('saved freeze inventory is enabled on the first board after its actual timer is initialized',()=>{
    const h=fresh(level,'classic',{freeze:1}),game=h.game;
    assert.ok(game.timeLimit>0);assert.equal(element('btn-powerup-freeze').disabled,false);
    game.timeRemaining-=20;const before=game.timeRemaining;game.useFreezePowerup();
    assert.equal(game.timeRemaining,before+15);assert.equal(storage.getPowerups().freeze,0);assert.equal(element('btn-powerup-freeze').disabled,true);
});
check('Zen and daily moves disable freeze and cannot consume inventory, then Classic/Timed enable it again',()=>{
    const h=fresh(level,'zen',{freeze:2}),game=h.game;
    const initial=game.timeRemaining;
    assert.equal(element('btn-powerup-freeze').disabled,true);game.useFreezePowerup();
    assert.equal(storage.getPowerups().freeze,2);assert.equal(game.timeRemaining,initial);assert.equal(element('game-timer').textContent,'∞');
    game.startLevel(level,chapters[0],{dailyModifier:{type:'moves',extraMoves:2}});
    assert.equal(game.gameMode,'classic');assert.ok(game.moveLimit>0);assert.equal(element('btn-powerup-freeze').disabled,true);game.useFreezePowerup();
    assert.equal(storage.getPowerups().freeze,2);assert.equal(element('game-timer').textContent,'∞');
    for (const mode of ['classic','timed']) {
        storage.setGameMode(mode);game.startLevel(level,chapters[0]);
        assert.equal(element('btn-powerup-freeze').disabled,false);game.timeRemaining-=20;const before=game.timeRemaining;
        game.useFreezePowerup();assert.equal(game.timeRemaining,before+15);
    }
    assert.equal(storage.getPowerups().freeze,0);
});
check('balanced palette is unchanged by removal, resize, undo and restarting the same board',()=>{
    const h=fresh(level,'zen'),game=h.game;
    const original=game.grid.paths.map(arrowColorVariant);
    game.removePathWithAnimation(game.grid.paths[2]);advance(400);
    assert.deepEqual(game.grid.paths.map(arrowColorVariant),original);
    h.canvas.clientWidth=760;h.canvas.clientHeight=300;h.canvas.getBoundingClientRect=()=>({left:17,top:80,width:760,height:300});
    game.handleResize();assert.deepEqual(game.grid.paths.map(arrowColorVariant),original);
    assert.equal(game.undoLastMove(),true);assert.deepEqual(game.grid.paths.map(arrowColorVariant),original);
    game.startLevel(level,chapters[0]);assert.deepEqual(game.grid.paths.map(arrowColorVariant),original);
});

console.log(JSON.stringify({status:'PASS',checks:passed.length,passed},null,2));
