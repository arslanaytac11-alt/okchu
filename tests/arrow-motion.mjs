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
assert.ok(metrics.width>=2.2 && metrics.width<=2.4,'The fitted phone shaft uses a fine, constant screen weight');
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

// A sparse first board must not grow a pipe. Zoom should reveal more detail,
// while retaining the same screen ink and keeping dense tips in their cells.
const savedView={cellSize:renderer.cellSize,scale:renderer.scale};
let thinMetricCases=0;
for (const dpr of [1,2,3]) {
    window.devicePixelRatio=dpr;
    for (const cellCss of [6.5,13,19,24,60,98]) for (const scale of [.5,1,2,3]) {
        renderer.scale=scale;renderer.cellSize=cellCss/scale;
        const m=renderer._getArrowMetrics();
        assert.ok(m.width*scale>0 && m.width*scale<=2.4,'Every shaft remains a fine CSS-pixel stroke');
        assert.ok(m.width*scale<=cellCss*.16+1e-8,'Even the round tip cap fits its logical cell');
        if (cellCss>=19) assert.ok(m.width*scale>=2.2,'Full phone boards retain legible fine ink');
        assert.ok(m.headSize*scale<=8+1e-8 && m.headSize*scale<=cellCss*.34+1e-8,'Open heads remain small on both sparse and dense boards');
        assert.ok(m.headSize*m.headSpread+m.width/2<renderer.cellSize/2,'The full head spread cannot overlap a neighboring path');
        thinMetricCases++;
    }
}
window.devicePixelRatio=3;
Object.assign(renderer,savedView);

let flatDrawCases=0;
const plainPath={...path,cells:path.cells.map(cell=>({...cell}))};
delete plainPath._visualGeometry;
let idleCommands;
for (const state of ['idle','removable','removing']) {
    plainPath.state=state;
    if (state==='removing') plainPath._visualGeometry=sampleArrowMotion(bent,0);
    calls.length=0;
    renderer.drawPath(plainPath);
    assert.equal(calls.filter(([name])=>name==='stroke').length,2,'The arrow has exactly one shaft and one open chevron');
    assert.equal(calls.filter(([name])=>name==='fill'||name==='closePath'||name==='translate').length,0,'No filled head, extrusion, ridge or tail stripe remains');
    if (!idleCommands) idleCommands=structuredClone(calls);
    else assert.deepEqual(calls,idleCommands,'State changes and the first moving frame preserve the entire flat drawing');
    flatDrawCases++;
}
calls.length=0;
renderer.drawPreviewHalo(plainPath);
assert.equal(calls.filter(([name])=>name==='stroke').length,2,'Touch preview uses the same restrained shaft and open head');
assert.equal(calls.filter(([name])=>name==='fill').length,0,'Touch preview does not restore a filled head or thick halo');
assert.deepEqual(calls.filter(([name])=>name==='translate'),[['translate',renderer.panX+renderer.shakeX,renderer.panY+renderer.shakeY]],'The only preview translation projects the world, without extruded ink');
flatDrawCases++;

// Every rune has a different visible contour. Its location, unlike its color,
// expresses its persisted identity and follows the tail through real bends.
let runeGlyphCases=0;
const runeContours=new Set();
renderer.theme.background=BOARD_VISUALS.background;
renderer.setBoardShape('diamond',9,11);
const runePath={...plainPath,cells:plainPath.cells.map(cell=>({...cell})),rune:0};
delete runePath._visualGeometry;
for (const rune of [0,1,2,3]) {
    runePath.rune=rune;
    const geometry=renderer._getRuneGeometry(runePath);
    const tail=renderer._cellCenter(runePath.cells[0]);
    pointClose(geometry,tail);
    calls.length=0;
    renderer._drawRuneMarker(runePath,ARROW_COLORS[0]);
    const contour=calls.filter(([name])=>['arc','moveTo','lineTo','closePath'].includes(name));
    runeContours.add(JSON.stringify(contour));
    assert.equal(calls.filter(([name])=>name==='fill').length,1,'The quiet interior keeps the glyph recognizable across its shaft');
    assert.equal(calls.filter(([name])=>name==='stroke').length,1,'Rune outline is a single fine stroke');
    const idleGlyphCommands=structuredClone(calls);
    runePath._visualGeometry=sampleArrowMotion(bent,0);
    assert.deepEqual(renderer._getRuneGeometry(runePath),geometry,'Glyph starts at exactly the idle tail center');
    calls.length=0;renderer._drawRuneMarker(runePath,ARROW_COLORS[0]);
    assert.deepEqual(calls,idleGlyphCommands,'A successful departure cannot pop the rune on its first frame');
    for (const distance of [.2,.6,1.8,3.7,bent.length+2]) {
        runePath._visualGeometry=sampleArrowMotion(bent,distance);
        const glyph=renderer._getRuneGeometry(runePath);
        const expected=pointOnArrowRoute(bent,distance+.42);
        pointClose(glyph,{x:renderer.gridOffsetX+expected.x*renderer.cellSize,y:renderer.gridOffsetY+expected.y*renderer.cellSize});
        runeGlyphCases++;
    }
    delete runePath._visualGeometry;
    runeGlyphCases++;
}
assert.equal(runeContours.size,4,'Circle, diamond, triangle and square remain distinct without color');
assert.equal(renderer._getRuneGeometry(plainPath),null,'Ordinary introduction arrows do not gain a decorative rune');
for (const rune of [-1,4,1.5,null,undefined]) {
    assert.equal(renderer._getRuneGeometry({...runePath,rune}),null,'Invalid or absent rune IDs cannot invent a marker');
    runeGlyphCases++;
}
for (const cellCss of [6.5,19,98]) for (const scale of [.5,1,3]) {
    renderer.scale=scale;renderer.cellSize=cellCss/scale;
    const glyph=renderer._getRuneGeometry(runePath);
    assert.ok(glyph.size*scale<=11+1e-8 && glyph.size*scale<=cellCss*.48+1e-8,'Rune size remains bounded and readable under zoom');
    assert.ok(glyph.width*scale<=1.3+1e-8,'The rune does not become a heavy outline under zoom');
    runeGlyphCases++;
}
Object.assign(renderer,savedView);
for (const direction of Object.keys(vectors)) {
    const cell=[{x:4,y:5}],route=createArrowRoute(cell,direction);
    const single={cells:cell,direction,rune:0};
    pointClose(renderer._getRuneGeometry(single),renderer._cellCenter(cell[0]));
    single._visualGeometry=sampleArrowMotion(route,.8);
    const expected=pointOnArrowRoute(route,1.15);
    pointClose(renderer._getRuneGeometry(single),{x:renderer.gridOffsetX+expected.x*renderer.cellSize,y:renderer.gridOffsetY+expected.y*renderer.cellSize});
    runeGlyphCases++;
}
assert.deepEqual(runePath.cells,path.cells,'Marker rendering never changes logical cells or touch zones');

// Actual card canvases share the gameplay palette and open-head grammar.
// The smaller visual never changes level data or acts as an eligible-move cue.
globalThis.localStorage={getItem:()=>null,setItem:()=>{throw new Error('Drawing a preview cannot persist game data');}};
const {ScreenManager}=await import('../js/screens.js');
let thumbnailCases=0;
for (const displayWidth of [58,68]) for (const level of allLevels) {
    const strokes=[],surfaces=[];
    const thumbnailContext=new Proxy({}, {
        get:(object,key)=>key in object?object[key]:(...args)=>{
            if(key==='stroke') strokes.push({color:object.strokeStyle,width:object.lineWidth});
            if(key==='fillRect') surfaces.push(object.fillStyle);
        },set:(object,key,value)=>(object[key]=value,true),
    });
    const thumbnailCanvas={width:160,height:160,getContext:()=>thumbnailContext,getBoundingClientRect:()=>({width:displayWidth})};
    const snapshot=JSON.stringify(level.paths);
    ScreenManager.prototype._drawLevelThumbnail(thumbnailCanvas,level);
    const grid=new Grid(level.gridWidth,level.gridHeight);grid.loadFromData(level.paths);assignBalancedArrowColors(grid.paths);
    let strokeIndex=0;
    for (const [index,arrow] of level.paths.entries()) {
        const body=strokes[strokeIndex++],head=strokes[strokeIndex++];
        assert.equal(body.color,ARROW_COLORS[arrowColorVariant(grid.paths[index])],'Thumbnail preserves the board decorative color');
        assert.deepEqual(head,body,'Open thumbnail head shares the fine shaft ink');
        assert.ok(body.width*displayWidth/160>0 && body.width*displayWidth/160<=1.3+1e-8,'Both responsive thumbnail sizes retain fine screen ink');
        if(Number.isInteger(arrow.rune)&&arrow.rune>=0&&arrow.rune<=3) {
            assert.equal(strokes[strokeIndex++].color,body.color,'Rune identity keeps the same decorative color');
        }
    }
    assert.equal(strokes.length,strokeIndex,'No extra outline, facets or tail stripes remain in previews');
    assert.deepEqual(surfaces,['#F6F0DE'],'Known matte surface keeps the palette legible on either UI theme');
    assert.equal(JSON.stringify(level.paths),snapshot,'Preview does not add palette or rune properties to authored data');
    thumbnailCases++;
}
let thumbnailRuneCases=0;
for(const displayWidth of [58,68]) {
    const runeLevel={gridWidth:9,gridHeight:5,paths:[0,1,2,3].map(rune=>({cells:[[1+rune*2,2]],direction:'up',rune}))};
    const contours=[];let current=[];
    const glyphContext=new Proxy({}, {
        get:(object,key)=>key in object?object[key]:(...args)=>{
            if(key==='beginPath') current=[];
            else if(['arc','moveTo','lineTo','closePath'].includes(key)) current.push([key,...args]);
            else if(key==='stroke') contours.push(structuredClone(current));
        },set:(object,key,value)=>(object[key]=value,true),
    });
    ScreenManager.prototype._drawLevelThumbnail({width:160,height:160,getContext:()=>glyphContext,getBoundingClientRect:()=>({width:displayWidth})},runeLevel);
    assert.equal(contours.length,12,'Four thumbnail arrows each have a shaft, open head and rune outline');
    for(const rune of [0,1,2,3]) {
        const contour=contours[rune*3+2];
        if(rune===0) assert.equal(contour[0][0],'arc','The first thumbnail rune is a circle');
        else {
            assert.equal(contour.at(-1)[0],'closePath');
            assert.equal(contour.filter(([name])=>name==='lineTo').length,rune===2?2:3,'Triangle is distinct from both four-sided glyphs');
            const cs=140/9,ox=(160-9*cs)/2,centerX=ox+(1+rune*2+.5)*cs;
            if(rune===1) close(contour[0][1],centerX,'Diamond starts above its center');
            if(rune===3) assert.ok(contour[0][1]<centerX,'Square starts at its upper left corner');
        }
        thumbnailRuneCases++;
    }
}

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
    calls.length=0;
    context.stroke=()=>calls.push(['stroke']);
    renderer.drawBoardShape();
    assert.equal(stops.length,2);
    assert.equal(stops[0],stops[1],'The board surface is a flat matte impression');
    assert.equal(calls.filter(([name])=>name==='fill').length,1,'One silhouette impression preserves actual static footprint');
    assert.equal(calls.filter(([name])=>name==='stroke').length,0,'No cell-track contour or raised ledge remains');
    assert.equal(context.shadowBlur,0);assert.equal(context.shadowOffsetX,0);assert.equal(context.shadowOffsetY,0);
    assert.equal(renderer._getBoardSurfaceColor(renderer._boardShapeBounds.top+.5).toLowerCase(),stops[0].toLowerCase(),'Rune interiors use the identical paper material');
    const strokes=[];
    context.stroke=()=>strokes.push({color:context.strokeStyle,alpha:context.globalAlpha,width:context.lineWidth});
    renderer.getBlockedFeedbackGeometry=()=>({start:{x:1.94,y:2.5},end:{x:5.06,y:2.5},cell:{x:5,y:2},type:'path'});
    renderer.drawBlockedFeedback();
    assert.equal(strokes.length,2);
    for (const bg of stops) {
        for (const color of dark?ARROW_DARK_COLORS:ARROW_COLORS) {
            const ratio=contrast(color,bg); stoneMinimums.body=Math.min(stoneMinimums.body,ratio);
            assert.ok(ratio>=4.5,`${color}: refined thin arrow body contrast against paper ${bg}`);stoneContrastChecks++;
        }
        const ratio=contrast(renderer.errorColor,bg); stoneMinimums.error=Math.min(stoneMinimums.error,ratio);
        assert.ok(ratio>=3,'Error flash must remain distinct on the new stone');stoneContrastChecks++;
        assert.ok(contrast(dark?BOARD_VISUALS.darkSelected:BOARD_VISUALS.selected,bg)>=3,'Thin touch selection stays visible on either stone theme');
        for (const stroke of strokes) {
            const ratio=contrast(composite(stroke.color,bg,stroke.alpha),bg);stoneMinimums.error=Math.min(stoneMinimums.error,ratio);
            assert.ok(ratio>=3,`Static blocked ray/outline contrast against stone ${bg}`);stoneContrastChecks++;
        }
    }
}

console.log(JSON.stringify({campaignFrames,singleCellChecks,bendTailChecks:3,rendererChecks:7,thinMetricCases,flatDrawCases,runeGlyphCases,thumbnailCases,thumbnailRuneCases,decorativeColorVariants:variants.size,balancedPaletteBoards,paletteStateCases,contrastChecks:8,stoneContrastChecks,stoneMinimums},null,2));
