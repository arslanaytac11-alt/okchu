// Offline authoring of three interleaved seals; gameplay uses static data.
// Initial Egypt introductions are retained. Deeper boards use verified exact
// minimum decisions over every winning route, not one difficult sample route.
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {allLevels} from './js/levels.js';
import {auditPuzzle} from './js/puzzle-catalog.js';
import {createRuneSolver} from './js/rune-order.js';
import {authorSealGeometry,pathVariety,campaignTargetArrows,campaignCriticalTarget,campaignDeepTargets,
    authorRuneOrder,FINAL_SEAL_WORD} from './js/puzzle-authoring.js';

const CHAPTERS=['egypt','greek','rome','viking','ottoman','china','maya','india','medieval','final'];
const cycles=[[0,1,2],[0,1,0,2],[0,0,1,2],[0,1,0,2,1,3],[0,0,1,2,1,3],
    [0,0,1,1,2,3],[0,1,0,1,2,3],[0,1,2,1,0,3],[0,1,2,3],
    [0,0,1,1,2,2],[0,1,0,1,2],[0,1,2,0,1,2]];
const args=process.argv.slice(2),selectedArg=args.find(arg=>arg.startsWith('--chapter='));
const selectedChapter=selectedArg?CHAPTERS.indexOf(selectedArg.slice(10))+1:0,auditOnly=args.includes('--audit-only');
if(args.some(arg=>arg!==selectedArg&&arg!=='--audit-only')||(selectedArg&&!selectedChapter))throw Error('Use --chapter=<key> and/or --audit-only');
const catalog=[],report=[],maxStates=20000,start=performance.now();
const compactAudit=a=>Object.fromEntries(['minimumCriticalDecisions','maximumCriticalDecisions',
    'minimumDeepCriticalDecisions','maximumDeepCriticalDecisions','minimumDeepBranchingDecisions','maximumDeepBranchingDecisions',
    'maximumNoCriticalRun','maximumForcedRun','reachableStates','winningOrders','criticalChoiceDensity',
    'unsafeChoiceRatio','solutionUnsafeChoiceRatio','trapLookaheadMedian','trapLookaheadIncludesWrongMove',
    'mixedChoiceStates','deadEnds','immediateUnsafeChoices','unsafeChoicesByEarliestDeadend'].map(key=>[key,a[key]]));
for(const existing of allLevels) {
    if(selectedChapter&&existing.chapter!==selectedChapter)continue;
    const chapter=existing.chapter,position=(existing.level-1)%5+1;
    let candidate,rune,config,accepted=0,unknown=0;
    if(chapter===1) {
        candidate=structuredClone(existing);rune=existing.runeCycle?createRuneSolver(candidate).audit():null;
        if(rune)candidate.runeAudit=compactAudit(rune);config=candidate.balance.authoring;
    } else {
        const n=campaignTargetArrows(chapter,position),counts=[0,1,2].map(i=>Math.floor(n/3)+(i<n%3?1:0));
        const geometry=authorSealGeometry(counts),deepTargets=campaignDeepTargets(chapter,position);
        const maxQuiet=chapter>=7?20:18,criticalTarget=campaignCriticalTarget(chapter,position);
        const coupledTargets=chapter>=7?{6:1}:{};
        const base={id:existing.id,chapter,level:existing.level,name:existing.name,shape:existing.shape,
            gridWidth:geometry.gridWidth,gridHeight:geometry.gridHeight,boardCells:geometry.boardCells,paths:geometry.paths};
        let best=null;
        for(let batch=0;batch<2;batch++) {
            const seed=existing.level*10007+734933+batch*900001,assignmentCandidates=batch?8192:4096;
            const result=authorRuneOrder(base,{seed,cycles,assignmentCandidates,maxStates,minimumCriticalTarget:criticalTarget,
                targetTrapLookahead:3,minimumDeepTargets:deepTargets,minimumDeepBranchingTargets:coupledTargets,
                maximumNoCriticalRun:maxQuiet,curatedCandidates:existing.id==='final_5'?[FINAL_SEAL_WORD]:[],stopWhenTargetsMet:true});
            accepted+=result.acceptedCandidates;unknown+=result.unknownCandidates;
            if(result.level&&(!best||result.penalty<best.penalty))best=result;
            if(best&&Object.entries(deepTargets).every(([h,target])=>best.audit.minimumDeepCriticalDecisions[h]>=target)&&
                Object.entries(coupledTargets).every(([h,target])=>best.audit.minimumDeepBranchingDecisions[h]>=target)&&
                best.audit.minimumCriticalDecisions>=criticalTarget&&best.audit.maximumNoCriticalRun<=maxQuiet)break;
        }
        assert.ok(best?.level,`${existing.id}: finite search produced no exact candidate`);
        rune=best.audit;candidate=best.level;
        const spatial=auditPuzzle(candidate);assert.equal(spatial.solvable,true);
        const {solution,errors,solvable,...metrics}=spatial;
        config={...geometry.geometry,seed:best.assignment.seed,assignmentCandidates:best.assignment.assignmentCandidates,
            maxStates,criticalTarget,deepTargets,coupledTargets,maximumNoCriticalRun:maxQuiet,
            runeAssignment:best.assignment,finiteBatches:2};
        candidate.solution=rune.solution;
        candidate.balance={...metrics,...pathVariety(candidate.paths),authoring:config,
            recommendedSeconds:Math.ceil(60+n*4+rune.minimumCriticalDecisions*16+Object.values(deepTargets).reduce((a,b)=>a+b,0)*12)};
        candidate.runeAudit=compactAudit(rune);
    }
    const targets=config.deepTargets||{},coupled=config.coupledTargets||{};
    const row={id:candidate.id,N:candidate.paths.length,dims:[candidate.gridWidth,candidate.gridHeight],
        minimumCritical:rune?.minimumCriticalDecisions||0,deep:rune?.minimumDeepCriticalDecisions||{4:0,6:0,8:0},
        coupled:rune?.minimumDeepBranchingDecisions||{4:0,6:0,8:0},maximumNoCriticalRun:rune?.maximumNoCriticalRun||0,
        targets,coupledTargets:coupled,states:rune?.reachableStates||0,accepted,unknown,
        targetMet:Object.entries(targets).every(([h,target])=>rune.minimumDeepCriticalDecisions[h]>=target)&&
            Object.entries(coupled).every(([h,target])=>rune.minimumDeepBranchingDecisions[h]>=target)&&
            (!config.deepTargets||rune.minimumCriticalDecisions>=config.criticalTarget)&&
            (!config.deepTargets||rune.maximumNoCriticalRun<=config.maximumNoCriticalRun),
        elapsedMs:Math.round(performance.now()-start)};
    catalog.push(candidate);report.push(row);console.log(JSON.stringify(row));
    mkdirSync(new URL('./outputs/qa',import.meta.url),{recursive:true});
    writeFileSync(new URL('./outputs/qa/rune-deep-campaign-progress.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}
// No silent downgrade: preview every finite result, and refuse production
// mutation if any declared minimum or maximum interval was not proved.
writeFileSync(new URL('./outputs/qa/rune-deep-campaign-preview.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
const summary={scope:'Exact all-winning-route deep4/6/8 and coupled first4-turn branches; bounded longest quiet interval',
    maxStates,levels:report,targetsMet:report.filter(row=>row.targetMet).length,totalArrows:catalog.reduce((s,l)=>s+l.paths.length,0),
    elapsedMs:Math.round(performance.now()-start)};
writeFileSync(new URL('./outputs/qa/rune-deep-campaign-authoring.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');
if(!auditOnly) {
    assert.ok(report.every(row=>row.targetMet),'Production data unchanged: some finite difficulty targets were not proved');
    for(let chapter=1;chapter<=10;chapter++) {
        if(selectedChapter&&chapter!==selectedChapter)continue;
        const key=CHAPTERS[chapter-1],levels=catalog.filter(l=>l.chapter===chapter);
        const data=levels.map(level=>{const{paths,...metadata}=level;
            const entries=Object.entries(metadata).map(([name,value])=>`        ${name}: ${JSON.stringify(value)},`);
            entries.push('        paths: [',...paths.map(path=>`            ${JSON.stringify(path)},`),'        ],');
            return `    {\n${entries.join('\n')}\n    }`;
        });
        writeFileSync(new URL(`./js/data/levels/${key}.js`,import.meta.url),
            `// Static exact-audited ${key} order puzzles. Authored offline.\n// Save IDs/chapter names are retained; boardCells defines the actual seal footprint.\nexport const ${key}Levels = [\n${data.join(',\n')}\n];\n`);
    }
}
console.log(JSON.stringify({targetsMet:summary.targetsMet,totalArrows:summary.totalArrows,auditOnly,elapsedMs:summary.elapsedMs}));
