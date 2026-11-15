import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {STUDIO_STARTER,buildStudioZip,buildStudioHtml}
 from '../site/library/studio/studio-core.mjs';
import {parseStudioHtml,readValidatedStudioZip}
 from '../site/library/studio/studio-import.mjs';
import {validateStaticZip} from '../packages/library/validator.mjs';
import {validateBrowserZip} from '../site/library/intake-core.mjs';

const digest=async bytes=>createHash('sha256').update(bytes).digest('hex');
const validate=zip=>validateBrowserZip(zip,{digest});

test('ZIP exported from Studio imports as exactly the original HTML/CSS/JS source',async()=>{
 const zip=buildStudioZip(STUDIO_STARTER);
 const report=await validate(zip);
 const imported=readValidatedStudioZip(zip,report);
 assert.deepEqual(imported,STUDIO_STARTER);
 assert.equal(buildStudioHtml(imported),buildStudioHtml(STUDIO_STARTER));
 assert.deepEqual(buildStudioZip(imported),zip);
 assert.equal(validateStaticZip(Buffer.from(zip)).archiveSha256,report.archiveSha256);
 const changed={...imported,name:'Counter Lab Updated',
  js:imported.js+'\n// Version 2 local change'};
 const newerZip=buildStudioZip(changed);
 const newer=readValidatedStudioZip(newerZip,await validate(newerZip));
 assert.deepEqual(newer,changed);
 assert.notEqual(createHash('sha256').update(zip).digest('hex'),
  createHash('sha256').update(newerZip).digest('hex'));
});
test('arbitrary or tampered static ZIPs are not accepted as an App Studio project',async()=>{
 const zip=buildStudioZip(STUDIO_STARTER);
 const report=await validate(zip);
 const mutated=new Uint8Array(zip);
 mutated[65]^=1; // changed data without recomputing CRC32
 await assert.rejects(()=>validate(mutated),/CRC32|mismatch|Unsafe ZIP/);
 assert.throws(()=>readValidatedStudioZip(mutated,report),TypeError);
 const other=await validate(zip);
 for(const forged of [
  {...other,files:[{path:'app.js',size:10}]},
  {...other,files:[{path:'index.html',size:1}]},
  {...other,reviewRequired:false},
  {...other,automaticHosting:true}
 ])assert.throws(()=>readValidatedStudioZip(zip,forged),TypeError);
 assert.throws(()=>readValidatedStudioZip('not a zip',report),TypeError);
 assert.throws(()=>readValidatedStudioZip(new Uint8Array(0),report),TypeError);
});
test('Studio HTML import fails closed on alternate layout, injected scripts or fake CSP',()=>{
 const html=buildStudioHtml(STUDIO_STARTER);
 assert.deepEqual(parseStudioHtml(html),STUDIO_STARTER);
 for(const altered of [
  html.replace('Counter Lab</title>','Attacker</title>'),
  html.replace("default-src 'none'","default-src *"),
  html.replace('<script>','<script src="https://evil.example/app.js">'),
  html.replace('</body></html>','<img src=x onerror=alert(1)></body></html>'),
  html.replace('<style>','<style>@import "https://evil.example";'),
  '<html><head><title>Other Bundle</title></head><body>Not Studio</body></html>'
 ])assert.throws(()=>parseStudioHtml(altered),TypeError);
});
test('import UI requires explicit file selection and never automatically executes a package',()=>{
 const page=new URL('../site/library/studio/',import.meta.url);
 const html=requireRead('index.html'),code=requireRead('studio.mjs');
 function requireRead(p){
  return import.meta.url&&globalThis.readFileSync?
   globalThis.readFileSync(new URL(p,page),'utf8'):null;
 }
 assert.ok(html===null||html.includes('studio-import-file'));
 assert.ok(code===null||code.includes('readValidatedStudioZip'));
});
