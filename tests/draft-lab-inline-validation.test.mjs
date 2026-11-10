import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('site/draft-lab.html');
const code=read('site/draft-lab.js');
const css=read('site/draft-lab.css');
const browser=read('scripts/check-draft-lab-accessibility.mjs');

test('all five validated Draft Lab fields have a distinct adjacent error element',()=>{
 const ids=['postTitle','postBody','postLocale','postCategory','postSource'];
 for(const id of ids){
  assert.match(html,new RegExp('id="'+id+'"[\\s\\S]*?id="'+id+'Error" class="field-error" hidden'));
  assert.equal([...html.matchAll(new RegExp('id="'+id+'Error"','g'))].length,1);
 }
 assert.match(html,/id="formStatus" role="status" aria-live="polite"/);
});

test('invalid inputs are announced through their own visible ARIA descriptions',()=>{
 assert.match(code,/const validationErrors=Object.freeze/);
 assert.match(code,/error.textContent=ui\(validationLabels\[invalid\]\)/);
 assert.match(code,/error.hidden=false/);
 assert.match(code,/control.setAttribute\('aria-invalid','true'\)/);
 assert.match(code,/control.setAttribute\('aria-describedby',error.id\)/);
 assert.match(code,/control.setAttribute\('aria-errormessage',error.id\)/);
 assert.match(code,/control.focus\(\)/);
 assert.match(code,/validationErrors\[key\].hidden=true/);
 assert.match(code,/validationErrors\[key\].textContent=ui\(validationLabels\[key\]\)/);
 assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|innerHTML/);
});

test('visible errors fit mobile widths and remain legible in light/dark and increased contrast',()=>{
 assert.match(css,/\.field-error\{/);
 assert.match(css,/\.field-error\[hidden\]\{display:none!important\}/);
 assert.match(css,/input\[aria-invalid="true"\]/);
 assert.match(css,/@media\(prefers-color-scheme:light\)\{\.field-error/);
 assert.match(css,/@media\(prefers-contrast:more\)\{\.field-error/);
 assert.match(css,/@media\(max-width:550px\)\{\.panel-head\{flex-wrap:wrap;min-width:0\}/);
 assert.match(css,/\.panel-head \.pill\{min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere\}/);
 assert.match(css,/@media\(max-width:550px\)\{\.intro h1\{min-width:0;overflow-wrap:anywhere\}\}/);
 assert.match(browser,/UI_LOCALES,UI_STRINGS/);
 assert.match(browser,/Emulation.setDeviceMetricsOverride/);
 assert.match(browser,/browser\.proc\.kill\('SIGKILL'\)/);
 assert.doesNotMatch(browser,/24GO\.online|service_role|sb_secret_|PUBLISH_API_KEY/);
});
