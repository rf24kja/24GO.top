import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STUDIO_STARTER,STUDIO_STATIC_STARTER} from '../site/library/studio/studio-core.mjs';
import {sameStudioSource,hasUnsavedStudioSource} from '../site/library/studio/studio-session.mjs';

test('Studio source baseline compares all four fields without confusing valid content with saved state',()=>{
 assert.equal(sameStudioSource(STUDIO_STARTER,{...STUDIO_STARTER}),true);
 assert.equal(hasUnsavedStudioSource(STUDIO_STARTER,STUDIO_STARTER),false);
 for(const key of ['name','html','css','js']){
  const edited={...STUDIO_STARTER,[key]:STUDIO_STARTER[key]+' local edit'};
  assert.equal(hasUnsavedStudioSource(edited,STUDIO_STARTER),true,key);
  assert.equal(hasUnsavedStudioSource({...edited,[key]:STUDIO_STARTER[key]},STUDIO_STARTER),false,key);
 }
 assert.equal(hasUnsavedStudioSource(STUDIO_STATIC_STARTER,STUDIO_STARTER),true);
 assert.equal(sameStudioSource({...STUDIO_STATIC_STARTER},STUDIO_STATIC_STARTER),true,
  'empty JS must compare as a valid field value');
});

test('bad or incomplete source snapshots never accidentally count as saved',()=>{
 for(const value of [null,undefined,{},[],{...STUDIO_STARTER,js:null},'Counter Lab']){
  assert.equal(sameStudioSource(STUDIO_STARTER,value),false);
  assert.equal(hasUnsavedStudioSource(value,STUDIO_STARTER),true);
 }
});

test('Studio browser wiring protects cancel, verified import, unchanged exit and ZIP download',()=>{
 const ui=readFileSync(new URL('../site/library/studio/studio.mjs',import.meta.url),'utf8');
 const page=readFileSync(new URL('../site/library/studio/index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../site/library/studio/studio.css',import.meta.url),'utf8');
 assert.match(ui,/function loadTemplate\(template,label,initial=false\)/);
 assert.ok(ui.includes("function restore(initial=false){return loadTemplate(STUDIO_STARTER,'Counter example',initial===true);}"));
 assert.ok(ui.includes("addEventListener('click',()=>restore())"),
  'click Event must never be forwarded as the initial setup permission');
 assert.match(ui,/hasUnsavedChanges\(\)/);
 assert.match(ui,/window\.confirm\('Replace your unsaved Studio source/);
 assert.match(ui,/window\.confirm\('This verified ZIP will replace unsaved Studio source/);
 assert.match(ui,/if\(ticket!==importEpoch\|\|!sameStudioSource\(previous,readDraft\(\)\)\)return/);
 assert.match(ui,/sourceBaseline=\{\.\.\.draft\}/);
 assert.match(ui,/window\.addEventListener\('beforeunload'/);
 assert.match(ui,/event\.preventDefault\(\)/);
 assert.match(ui,/event\.returnValue=''/);
 assert.match(page,/id="studio-save-status"[^>]+role="status" aria-live="polite"/);
 assert.match(css,/\.studio-save-notice\[data-unsaved="true"\]/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage|indexedDB|sendBeacon|\bfetch\s*\(/);
});

test('Studio ZIP remains available after click and receives delayed URL cleanup',()=>{
 const ui=readFileSync(new URL('../site/library/studio/studio.mjs',import.meta.url),'utf8');
 assert.ok(ui.includes('try{link.click();}finally{'));
 assert.ok(ui.includes('setTimeout(()=>URL.revokeObjectURL(url),10000);'));
 assert.ok(!ui.includes('link.remove();URL.revokeObjectURL(url)'));
 assert.ok(ui.includes('Confirm the download in your browser.'));
});
