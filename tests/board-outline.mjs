import assert from 'node:assert/strict';
import { buildBoardOutline } from '../js/board-outline.js';
import { allLevels } from '../js/levels.js';
import { silhouetteCells } from '../js/puzzle-catalog.js';

const key = point => `${point.x},${point.y}`;
const area = loop => loop.slice(0,-1).reduce((sum,p,i) => sum + p.x*loop[i+1].y - loop[i+1].x*p.y,0)/2;
const intersects = (a,b,c,d) => {
    if(a.x===b.x && c.x===d.x) return a.x===c.x && Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y));
    if(a.y===b.y && c.y===d.y) return a.y===c.y && Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x));
    const [v1,v2,h1,h2]=a.x===b.x?[a,b,c,d]:[c,d,a,b];
    return v1.x>=Math.min(h1.x,h2.x)&&v1.x<=Math.max(h1.x,h2.x)&&h1.y>=Math.min(v1.y,v2.y)&&h1.y<=Math.max(v1.y,v2.y);
};
const inside = (point,loop) => {
    let result = false;
    for (let i=0,j=loop.length-2;i<loop.length-1;j=i++) {
        const a=loop[i],b=loop[j];
        if ((a.y>point.y)!==(b.y>point.y) && point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) result=!result;
    }
    return result;
};
let checked = 0, loopsChecked = 0;
function verify(cells,label) {
    const loops = buildBoardOutline(cells);
    const occupied = new Set(cells.map(([x,y])=>`${x},${y}`));
    let totalArea=0;
    for (const loop of loops) {
        assert.ok(loop.length>=5,`${label}: closed polygon needs four corners`);
        assert.deepEqual(loop[0],loop.at(-1),`${label}: must close`);
        assert.equal(new Set(loop.slice(0,-1).map(key)).size,loop.length-1,`${label}: no repeated/self-touching vertex`);
        assert.ok(loop.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),`${label}: finite coordinates`);
        assert.notEqual(area(loop),0,`${label}: no zero-area cycle`);
        for(let i=0;i<loop.length-1;i++) {
            const a=loop[i],b=loop[i+1];
            assert.ok((a.x===b.x)!==(a.y===b.y),`${label}: nonzero axis-aligned segment`);
            const c=loop[(i+2)%(loop.length-1)];
            assert.ok((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)!==0,`${label}: omit collinear vertices`);
            for(let j=i+2;j<loop.length-1;j++) {
                if(i===0 && j===loop.length-2) continue;
                assert.equal(intersects(a,b,loop[j],loop[j+1]),false,`${label}: nonadjacent segments must not intersect`);
            }
        }
        totalArea+=area(loop);loopsChecked++;
    }
    assert.equal(totalArea,occupied.size,`${label}: signed contour area equals occupied cells`);
    if (cells.length) {
        const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]);
        // Independently classify every cell center using polygon parity,
        // including empty holes/margins rather than mirroring edge generation.
        for(let y=Math.min(...ys)-1;y<=Math.max(...ys)+1;y++) for(let x=Math.min(...xs)-1;x<=Math.max(...xs)+1;x++) {
            const filled=loops.reduce((w,loop)=>w+(inside({x:x+.5,y:y+.5},loop)?Math.sign(area(loop)):0),0)!==0;
            assert.equal(filled,occupied.has(`${x},${y}`),`${label}: occupancy at ${x},${y}`);
        }
    }
    checked++;
    return loops;
}

assert.deepEqual(verify([],'empty'),[]);
assert.equal(verify([[0,0]],'one cell').length,1);
assert.equal(verify([[0,0],[1,0],[0,1]],'L shape').length,1);
const ring=Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3)]).filter(([x,y])=>x!==1||y!==1);
const ringLoops=verify(ring,'hollow ring');
assert.equal(ringLoops.length,2);assert.deepEqual(ringLoops.map(area).sort((a,b)=>a-b),[-1,9]);
assert.equal(verify([[0,0],[4,0]],'disjoint').length,2);
assert.equal(verify([[0,0],[1,1]],'diagonal contact').length,2);
assert.equal(verify([[0,0],[1,1],[2,2]],'diagonal chain').length,3);
assert.equal(verify(ring.filter(([x,y])=>x!==2||y!==0),'hole touching exterior at vertex').length,2);
verify([[-3,-2],[-2,-2],[-2,-1],[-3,-2]],'negative coordinates and duplicate input');
for(const input of [[[NaN,0]],[[0,Infinity]],[[.5,0]],[[Number.MAX_SAFE_INTEGER,0]]]) assert.throws(()=>buildBoardOutline(input),TypeError);

const shapes=new Set();
for(const level of allLevels) {
    verify(level.paths.flatMap(path=>path.cells),`puzzle ${level.id}`);
    verify(silhouetteCells(level.shape,level.gridWidth,level.gridHeight),`template ${level.shape}/${level.id}`);
    shapes.add(level.shape);
}
// Every 3x3 occupancy pattern includes diagonal joins, holes, concave corners
// and disconnected components, with no dependency on implementation logic.
for(let mask=0;mask<512;mask++) verify(Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3)]).filter((_,i)=>mask&(1<<i)),`3x3 mask ${mask}`);
console.log(JSON.stringify({checked,loopsChecked,puzzles:allLevels.length,templates:shapes.size,exhaustive3x3:512},null,2));
