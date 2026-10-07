// Offline campaign authoring. Run deliberately when refreshing the campaign;
// ordinary builds consume the reviewed, static level data instead.
import { writeFileSync, mkdirSync } from 'node:fs';
import { allLevels } from './js/levels.js';
import assert from 'node:assert/strict';
import { CAMPAIGN_SHAPES, silhouetteCells, auditPuzzle } from './js/puzzle-catalog.js';
import { authorSilhouette, pathVariety, campaignTargetDepth } from './js/puzzle-authoring.js';

const CHAPTERS = ['egypt', 'greek', 'rome', 'viking', 'ottoman', 'china', 'maya', 'india', 'medieval', 'final'];
// A focused refresh cannot silently rewrite the nine reviewed chapters.
// Example: node generate-balanced-puzzles.mjs --chapter=greek
const chapterArg = process.argv.slice(2);
if (chapterArg.length > 1 || (chapterArg.length && !chapterArg[0].startsWith('--chapter='))) throw new Error('Use --chapter=<chapter-key>');
const selectedChapter = chapterArg.length ? CHAPTERS.indexOf(chapterArg[0].slice('--chapter='.length)) + 1 : 0;
if (chapterArg.length && !selectedChapter) throw new Error('Unknown chapter');
const catalog = [];
const authoringReport = [];
for (const existing of allLevels) {
    if (selectedChapter && existing.chapter !== selectedChapter) continue;
    const n = existing.level;
    const chapterIndex = existing.chapter - 1;
    const { shape, gridWidth, gridHeight } = existing;
    assert.equal(shape, CAMPAIGN_SHAPES[chapterIndex][(n - 1) % 5], `${existing.id}: chapter shape identity`);
    const cells = silhouetteCells(shape, gridWidth, gridHeight);
    assert.deepEqual(existing.paths.flatMap(p=>p.cells).map(c=>c.join(',')).sort(), cells.map(c=>c.join(',')).sort(), `${existing.id}: preserve full occupied silhouette`);
    // Keep the two reviewed introductory boards exactly as played. The
    // bounded search below adjusts later dependency structure, not geometry.
    if (n <= 2) { catalog.push(existing); continue; }
    const requestedDepth = campaignTargetDepth(existing.chapter, (n-1)%5+1);
    const choiceGoal = existing.chapter>=7 ? 5 : 4;
    const candidates = [];
    for (let variant = 1; variant <= 128; variant++) {
        const options = {targetDepth:requestedDepth,initialChoices:3+variant%3,maxLength:n===3?3:4+variant%3,turnChance:0.4+(variant%3)*0.1};
        const seed = n*10007+variant*7919;
        const paths = authorSilhouette(cells, gridWidth, gridHeight, seed, options);
        const candidate = { id: existing.id, chapter: existing.chapter, level: n, name: existing.name, shape, gridWidth, gridHeight, paths };
        const audit = auditPuzzle(candidate);
        if (!audit.solvable) throw new Error(`${existing.id}: ${audit.errors.join(', ')}`);
        // A DAG with k starting choices cannot have a chain deeper than
        // arrows-k+1. Apply that structural bound before preferring depth.
        assert.ok(audit.dependencyDepth<=audit.totalPaths-audit.initialChoices+1);
        candidates.push({candidate,audit,variety:pathVariety(paths),seed,options});
    }
    const valid = candidates.filter(c=>c.audit.initialChoices>=3&&c.audit.initialChoices<=7&&c.audit.dependencyDepth<=requestedDepth);
    if (!valid.length) throw new Error(`${existing.id}: no readable candidate with 3–7 initial choices`);
    const boundedMaxDepth = Math.max(...valid.map(c=>c.audit.dependencyDepth));
    const depthGoal = Math.min(requestedDepth,boundedMaxDepth);
    function penalty(c) {
        const a=c.audit, v=c.variety;
        const singles=c.candidate.paths.filter(p=>p.cells.length===1).length/a.totalPaths;
        return (depthGoal-a.dependencyDepth)*25+Math.abs(a.initialChoices-choiceGoal)*0.5+
            Math.max(0,0.4-v.bentPaths/a.totalPaths)*6+Math.max(0,singles-0.4)*5-
            Math.min(v.uPaths+v.zPaths,Math.ceil(a.totalPaths*0.2))*0.1;
    }
    const best = valid.reduce((best,c)=>!best||penalty(c)<penalty(best)?c:best,null);
    const { solution, errors, solvable, ...metrics } = best.audit;
    // Time accounts for both physical taps and dependency planning. The first
    // three puzzles have extra reading time. Harder shapes receive more time
    // instead of the previous chapter-only shrinking time per arrow.
    const recommendedSeconds = Math.ceil(40 + metrics.totalPaths * 2.8 + metrics.dependencyDepth * 5 + (n <= 3 ? 30 : 0));
    best.candidate.balance = { ...metrics, recommendedSeconds, ...best.variety,
        authoring:{seed:best.seed,...best.options,requestedDepth,boundedMaxDepth,candidates:128} };
    best.candidate.solution = solution;
    catalog.push(best.candidate);
    authoringReport.push({id:existing.id,shape,occupiedCells:cells.length,
        oldDepth:existing.balance.dependencyDepth,newDepth:metrics.dependencyDepth,requestedDepth,boundedMaxDepth,
        oldArrows:existing.paths.length,newArrows:metrics.totalPaths,
        oldInitialChoices:existing.balance.initialChoices,newInitialChoices:metrics.initialChoices,...best.variety});
}
for (let chapter = 1; chapter <= 10; chapter++) {
    if (selectedChapter && chapter !== selectedChapter) continue;
    const key = CHAPTERS[chapter - 1];
    const levels = catalog.filter(level => level.chapter === chapter);
    const data = levels.map(level => {
        const { paths, ...metadata } = level;
        const entries = Object.entries(metadata).map(([key, value]) => `        ${key}: ${JSON.stringify(value)},`);
        entries.push('        paths: [', ...paths.map(path => `            ${JSON.stringify(path)},`), '        ],');
        return `    {\n${entries.join('\n')}\n    }`;
    });
    writeFileSync(new URL(`./js/data/levels/${key}.js`, import.meta.url), `// Static, audited ${key} silhouettes. Generated offline by generate-balanced-puzzles.mjs.\n// IDs and campaign order are retained so existing progress remains compatible.\nexport const ${key}Levels = [\n${data.join(',\n')}\n];\n`);
}
console.table(catalog.map(l => ({ id: l.id, shape: l.shape, arrows: l.balance.totalPaths, depth: l.balance.dependencyDepth, blocked: l.balance.blockedRatio, seconds: l.balance.recommendedSeconds })));
mkdirSync(new URL('./outputs/qa',import.meta.url),{recursive:true});
writeFileSync(new URL('./outputs/qa/difficulty-authoring-audit.json',import.meta.url),JSON.stringify({boundedCandidatesPerBoard:128,unchangedIntroductoryIds:allLevels.slice(0,2).map(l=>l.id),levels:authoringReport},null,2)+'\n');
