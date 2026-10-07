import { spawnSync } from 'node:child_process';
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const checks = ['input-state','story-navigation','level-audit','egypt-pilot','redesign-puzzles','puzzle-authoring','launch-scheduler','ad-banner','ad-consent','iap','rating','haptics','arrow-motion','blocked-feedback','celebration','progress-reset','board-outline','duo-viewport','preview-mode','service-worker'];
const results = {};
for (const name of checks) {
    const result = spawnSync(process.execPath, [`tests/${name}.mjs`], { encoding:'utf8' });
    if (result.status !== 0) { process.stderr.write(result.stdout + result.stderr); process.exit(result.status || 1); }
    try { results[name] = JSON.parse(result.stdout); } catch { results[name] = result.stdout.trim(); }
}
const validate = spawnSync(process.execPath, ['validate.mjs'], {encoding:'utf8'});
if (validate.status !== 0) { process.stderr.write(validate.stdout+validate.stderr); process.exit(1); }
results.validator = validate.stdout.trim().split('\n').slice(-1)[0];
function jsFiles(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? jsFiles(join(dir,entry.name)) : entry.name.endsWith('.js') ? [join(dir,entry.name)] : []); }
const files = jsFiles('js');
for (const file of files) {
    const syntax = spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    if (syntax.status !== 0) { process.stderr.write(syntax.stderr); process.exit(1); }
}
results.syntaxFiles = files.length;
mkdirSync('outputs/qa', {recursive:true});
writeFileSync('outputs/qa/test-results.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
