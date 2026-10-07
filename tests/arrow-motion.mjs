import assert from 'node:assert/strict';
import { createArrowRoute, pointOnArrowRoute, sampleArrowMotion, arrowShaftPoints, arrowExitDistance, arrowDepartureEase, arrowColorVariant, assignBalancedArrowColors, ARROW_COLORS, ARROW_DARK_COLORS, ARROW_ERROR_COLOR, ARROW_DARK_ERROR_COLOR } from '../js/arrow-motion.js';
import { Renderer } from '../js/renderer.js';
import { allLevels } from '../js/levels.js';
import { BOARD_VISUALS } from '../js/balance.js';
import { Grid } from '../js/grid.js';

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} vs ${expected}`);
const pointClose = (a, b) => { close(a.x,b.x,'x'); close(a.y,b.y,'y'); };
function assertContinuous(geometry, length) {
    let actual = 0;
    for (let i = 1; i < geometry.points.length; i++) {
        const a = geometry.points[i - 1], b = geometry.points[i];
        assert.ok(Math.abs(a.x-b.x)<1e-8 || Math.abs(a.y-b.y)<1e-8, 'Every body segment must remain axis-aligned');
        actual += Math.hypot(b.x-a.x,b.y-a.y);
    }
    close(actual,length,'Body arc length');
    pointClose(geometry.tip,geometry.points.at(-1));
    assert.equal(geometry.alpha,1,'A moving arrow remains opaque until it leaves the canvas');
}

// This fixture is a down/right/right/up route before the right-facing exit.
const bentCells = [[1,1],[1,2],[2,2],[3,2],[3,1]];
const bent = createArrowRoute(bentCells,'right');
assert.deepEqual(sampleArrowMotion(bent).points,bent.points,'The first moving frame must match idle geometry exactly');
for (const distance of [0,.2,.42,.6,1.42,2.2,3.42,bent.length,bent.length+20]) assertContinuous(sampleArrowMotion(bent,distance),bent.length);
pointClose(sampleArrowMotion(bent,.6).points[0],{x:1.5,y:1.68});
pointClose(sampleArrowMotion(bent,1.8).points[0],{x:1.88,y:2.5});
pointClose(sampleArrowMotion(bent,3.7).points[0],{x:3.5,y:2.22});
assert.deepEqual(bentCells,[[1,1],[1,2],[2,2],[3,2],[3,1]],'Sampling must not mutate the puzzle');

let singleCellChecks = 0;
const vectors = {up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
for (const [direction,[dx,dy]] of Object.entries(vectors)) {
    const route = createArrowRoute([[4,5]],direction);
    close(route.length,.7,'Single-cell body');
    for (const distance of [0,.1,1,8]) {
        const geometry = sampleArrowMotion(route,distance);
        assertContinuous(geometry,.7);
        pointClose(geometry.tip,{x:4.5+dx*(.35+distance),y:5.5+dy*(.35+distance)});
        singleCellChecks++;
    }
    const bounds = {left:-5,top:-7,right:15,bottom:17};
    const geometry = sampleArrowMotion(route,arrowExitDistance(route,bounds));
    assert.ok(geometry.points.every(p => dx>0?p.x>bounds.right:dx<0?p.x<bounds.left:dy>0?p.y>bounds.bottom:p.y<bounds.top),'The entire tail must be beyond the clipping edge');
}

let campaignFrames = 0;
const variants = new Set();
for (const level of allLevels) for (const [index,path] of level.paths.entries()) {
    const route = createArrowRoute(path.cells,path.direction);
    assert.deepEqual(sampleArrowMotion(route).points,route.points);
    const snapshot = JSON.stringify(path.cells);
    const distance = arrowExitDistance(route,{left:-3,top:-3,right:level.gridWidth+3,bottom:level.gridHeight+3});
    for (let frame = 0; frame <= 32; frame++) {
        const geometry = sampleArrowMotion(route,arrowDepartureEase(frame/32)*distance);
        assertContinuous(geometry,route.length);
        const shaft = arrowShaftPoints(geometry,.238);
        assert.ok(shaft.length >= 2);
        campaignFrames++;
    }
    assert.equal(JSON.stringify(path.cells),snapshot);
    const colorPath = {cells:path.cells.map(([x,y])=>({x,y})),direction:path.direction,colorIndex:index%8};
    const variant = arrowColorVariant(colorPath); variants.add(variant);
    for (const state of ['idle','removable','removing','removed']) {
        colorPath.state = state;
        assert.equal(arrowColorVariant(colorPath),variant,'Arrow color must never signal removability');
    }
}
assert.equal(variants.size,3);
let balancedPaletteBoards=0,paletteStateCases=0;
for (const level of allLevels) {
    const grid=new Grid(level.gridWidth,level.gridHeight);grid.loadFromData(level.paths);
    assignBalancedArrowColors(grid.paths);
    const original=grid.paths.map(arrowColorVariant), counts=[0,0,0];
    for (const [index,path] of grid.paths.entries()) {
        counts[original[index]]++;
        assert.equal(Object.getOwnPropertyDescriptor(path,'paletteIndex').writable,false);
        for (const state of ['idle','removable','removing','removed']) {
            path.state=state;assert.equal(arrowColorVariant(path),original[index]);paletteStateCases++;
        }
    }
    assert.ok(Math.max(...counts)-Math.min(...counts)<=1,`${level.id}: every full board has balanced decoration`);
    assignBalancedArrowColors(grid.paths.slice().reverse());
    assert.deepEqual(grid.paths.map(arrowColorVariant),original,'Array/solution order and all-removed states cannot determine the palette');
    balancedPaletteBoards++;
}
close(arrowDepartureEase(0),0,'Ease starts at zero');close(arrowDepartureEase(1),1,'Ease completes');
const velocity = t => (arrowDepartureEase(t+.001)-arrowDepartureEase(t))/.001;
assert.ok(velocity(.8)>velocity(.4) && velocity(.4)>velocity(.1),'Departure accelerates and never eases to a stop');
assert.throws(()=>createArrowRoute([[0,0],[1,1]],'right'),/axis-aligned/);

globalThis.window = {devicePixelRatio:3,matchMedia:()=>({matches:false})};
const calls = [];
const context = new Proxy({},{get:(object,key)=>key in object?object[key]:(...args)=>calls.push([key,...args]),set:(object,key,value)=>(object[key]=value,true)});
let width = 390, height = 560;
const canvas = {getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width,height}),get clientWidth(){return width;},get clientHeight(){return height;}};
const renderer = new Renderer(canvas);
renderer.resize(15,17);
const path = {cells:bentCells.map(([x,y])=>({x,y})),direction:'right',colorIndex:0};
const metrics = renderer._getArrowMetrics();
assert.ok(metrics.width>=3.5 && metrics.width<=renderer.cellSize*.24,'The slimmer fitted phone shaft remains legible without touching adjacent cells');
const idle = renderer._buildPathPoints(path,metrics);
path._visualGeometry = sampleArrowMotion(bent);
assert.deepEqual(renderer._buildPathPoints(path,metrics),idle,'Idle and motion use exactly the same renderer geometry');
path._visualGeometry = sampleArrowMotion(bent,1.8);
const movingSnapshot = JSON.stringify(path._visualGeometry);
width = 900; height = 400; renderer.resize(15,17,{preserveView:true});
assert.equal(JSON.stringify(path._visualGeometry),movingSnapshot,'Resize cannot modify grid-space motion');
renderer.setZoom(2,450,200);
const projected = renderer._buildPathPoints(path,renderer._getArrowMetrics());
close(projected.tipX,renderer.gridOffsetX+path._visualGeometry.tip.x*renderer.cellSize,'Projected tip x');
close(projected.tipY,renderer.gridOffsetY+path._visualGeometry.tip.y*renderer.cellSize,'Projected tip y');
renderer.drawPath(path);
assert.ok(calls.some(([name])=>name==='quadraticCurveTo'),'Elbows must be rounded curves, not pointed joins');
assert.equal(context.globalAlpha,1);

function luminance(hex) {
    const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
function contrast(a,b) { const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
for (const color of ARROW_COLORS) assert.ok(contrast(color,BOARD_VISUALS.background)>=4.5,`${color}: light contrast`);
for (const color of ARROW_DARK_COLORS) assert.ok(contrast(color,BOARD_VISUALS.darkBackground)>=4.5,`${color}: dark contrast`);
for (const bg of [BOARD_VISUALS.background,BOARD_VISUALS.darkBackground]) assert.ok(contrast(ARROW_ERROR_COLOR,bg)>=3,'The error cue must remain distinct on both themes');

// Capture the actual rendered stone endpoints instead of checking only the
// older canvas background. Composite each real ray/outline alpha as drawn.
let stoneContrastChecks=0;
const stoneMinimums={body:Infinity,error:Infinity};
function composite(foreground,background,alpha) {
    const rgb=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16));
    const a=rgb(foreground), b=rgb(background);
    return '#'+a.map((v,i)=>Math.round(v*alpha+b[i]*(1-alpha)).toString(16).padStart(2,'0')).join('');
}
for (const dark of [false,true]) {
    renderer.theme.background=dark?BOARD_VISUALS.darkBackground:BOARD_VISUALS.background;
    assert.equal(renderer.errorColor,dark?ARROW_DARK_ERROR_COLOR:ARROW_ERROR_COLOR,'Both error animation and causal outline use the theme color');
    renderer.setBoardShape('diamond',9,11);
    const stops=[];
    context.createLinearGradient=()=>({addColorStop:(_offset,color)=>stops.push(color)});
    context.globalAlpha=1;
    renderer.drawBoardShape();
    assert.equal(stops.length,2);
    const strokes=[];
    context.stroke=()=>strokes.push({color:context.strokeStyle,alpha:context.globalAlpha,width:context.lineWidth});
    renderer.getBlockedFeedbackGeometry=()=>({start:{x:1.94,y:2.5},end:{x:5.06,y:2.5},cell:{x:5,y:2},type:'path'});
    renderer.drawBlockedFeedback();
    assert.equal(strokes.length,2);
    for (const bg of stops) {
        for (const color of dark?ARROW_DARK_COLORS:ARROW_COLORS) {
            const ratio=contrast(color,bg); stoneMinimums.body=Math.min(stoneMinimums.body,ratio);
            assert.ok(ratio>=3,`${color}: solid arrow body contrast against stone ${bg}`);stoneContrastChecks++;
        }
        const ratio=contrast(renderer.errorColor,bg); stoneMinimums.error=Math.min(stoneMinimums.error,ratio);
        assert.ok(ratio>=3,'Error flash must remain distinct on the new stone');stoneContrastChecks++;
        for (const stroke of strokes) {
            const ratio=contrast(composite(stroke.color,bg,stroke.alpha),bg);stoneMinimums.error=Math.min(stoneMinimums.error,ratio);
            assert.ok(ratio>=3,`Static blocked ray/outline contrast against stone ${bg}`);stoneContrastChecks++;
        }
    }
}

console.log(JSON.stringify({campaignFrames,singleCellChecks,bendTailChecks:3,rendererChecks:7,decorativeColorVariants:variants.size,balancedPaletteBoards,paletteStateCases,contrastChecks:8,stoneContrastChecks,stoneMinimums},null,2));
