import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const elements=new Map();
function el(id){if(!elements.has(id)){const classes=new Set();elements.set(id,{textContent:'',classList:{toggle(k,on){on?classes.add(k):classes.delete(k)},contains:k=>classes.has(k)}})}return elements.get(id)}
globalThis.document={getElementById:el,documentElement:{}};
globalThis.localStorage={getItem:()=>null,setItem(){throw Error('Pilot must not write a save')}};
globalThis.fetch=async url=>({json:async()=>JSON.parse(readFileSync(new URL('../'+url.split('?')[0],import.meta.url)))});
const {loadLanguage,t}=await import('../js/i18n.js?v=2');
const {renderEgyptResult}=await import('../js/egypt-story.js');
let checks=0;
for(const lang of ['tr','en','es','fr','ja']){
 await loadLanguage(lang,{persist:false});
 assert.ok(t('civilizations.1.text').length>80);
 assert.equal(t('civilizations.1.results').length,5);
 for(let i=1;i<=5;i++){
  renderEgyptResult({chapter:1,level:i});
  assert.equal(el('complete-story').classList.contains('hidden'),false);
  assert.equal(el('complete-story-text').textContent,t('civilizations.1.results.'+(i-1)));
  checks++;
 }
 for(const [level,daily] of [[{chapter:2,level:1},false],[{chapter:1,level:3},true],[null,false],[{chapter:1,level:6},false]]){
  renderEgyptResult(level,daily);
  assert.equal(el('complete-story').classList.contains('hidden'),true);
  assert.equal(el('complete-story-text').textContent,'');checks++;
 }
}
// Cache the two new modules; old offline installs must not miss the resolver.
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
assert.ok(sw.includes("'/js/hit-test.js'"));assert.ok(sw.includes("'/js/egypt-story.js'"));
console.log(JSON.stringify({passed:checks,languages:5,results:25,clearedTransitions:20,noSaveWrites:true},null,2));
