import { allLevels } from '../js/levels.js';
import { Grid } from '../js/grid.js';
const results=[];
for (const l of allLevels) {
  const g=new Grid(l.gridWidth,l.gridHeight);g.loadFromData(l.paths,l.walls||[]);
  const occupied=new Map(), issues=[];
  l.paths.forEach((p,i)=>p.cells.forEach(([x,y],j)=>{
    if(x<0||x>=g.width||y<0||y>=g.height) issues.push({type:'bounds',i,j,x,y});
    const key=`${x},${y}`;
    if(occupied.has(key)) issues.push({type:'overlap',i,other:occupied.get(key),x,y});
    occupied.set(key,i);
    if(j && Math.abs(p.cells[j-1][0]-x)+Math.abs(p.cells[j-1][1]-y)!==1)issues.push({type:'disconnected',i,j});
    if(g.isWall(x,y))issues.push({type:'wall-overlap',i,j});
  }));
  let n=0;
  while(!g.isCleared()) {const p=g.paths.find(p=>g.isPathClear(p));if(!p)break;g.finalizeRemoval(p);n++;}
  results.push({id:l.id,removed:n,total:l.paths.length,walls:g.walls.length,issues:issues.slice(0,5),issueCount:issues.length});
}
console.log(JSON.stringify({total:results.length,solved:results.filter(r=>r.removed===r.total).length,failures:results.filter(r=>r.removed!==r.total),geometry:results.filter(r=>r.issueCount)},null,2));
