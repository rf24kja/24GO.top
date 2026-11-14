import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEditorialReviewPack,verifyEditorialReviewPack,
 readEditorialReviewPackFile,REVIEW_PACK_KIND,MAX_REVIEW_PACK_BYTES}
 from '../site/draft-lab-review-pack.js';
import {verifyReviewPackAtPath} from '../scripts/verify-editorial-review-pack.mjs';
import {formatDraft,matchesDraftExportSnapshot,createDraftImportGate} from '../site/draft-lab-logic.js';
import {readFileSync} from 'node:fs';
const fence=String.fromCharCode(96).repeat(3);
const draft={
 title:'Secure multilingual article handoff',locale:'ru',category:'guides',
 body:'## Проблема\n\nПубликация должна проходить проверку редактора.\n\n'+
 fence+'js\nconst sample = "<script>literal</script>";\n'+fence+'\n🔒 Пример',
 source:'https://example.org/security'
};
const bytes=string=>new TextEncoder().encode(string);
const file=(data,name='24gotop-editorial-review-pack.json')=>{
 const encoded=bytes(data);
 return {name,size:encoded.byteLength,
  async arrayBuffer(){return Uint8Array.from(encoded).buffer;}};
};
test('web and Node share a deterministic, standalone private manuscript package',async()=>{
 const p=await createEditorialReviewPack(draft);
 const parsed=JSON.parse(p);
 assert.deepEqual(Object.keys(parsed),['kind','version','document','sha256']);
 assert.equal(parsed.kind,REVIEW_PACK_KIND);
 assert.equal(parsed.version,1);
 assert.equal(parsed.document,formatDraft(draft));
 assert.match(parsed.sha256,/^[a-f0-9]{64}$/);
 assert.equal(await createEditorialReviewPack(draft),p);
 const verified=await verifyEditorialReviewPack(p);
 assert.equal(verified.sha256,parsed.sha256);
 assert.deepEqual(verified.draft,draft);
 assert.equal(verified.bytes,bytes(formatDraft(draft)).byteLength);
 const browser=await readEditorialReviewPackFile(file(p));
 assert.equal(browser.bytes,verified.bytes);
});
test('even one changed manuscript byte fails closed with unchanged digest',async()=>{
 const p=JSON.parse(await createEditorialReviewPack(draft));
 const original=p.document;
 p.document=original.replace('должна','может');
 assert.notEqual(p.document,original);
 await assert.rejects(verifyEditorialReviewPack(JSON.stringify(p)),/checksum mismatch/);
});
test('forged metadata, malformed grammar and extra JSON fields cannot pass',async()=>{
 const p=JSON.parse(await createEditorialReviewPack(draft));
 const corrupt=[
  {...p,kind:'another-app'},
  {...p,version:2},
  {...p,extra:'injected'},
  {...p,sha256:'0'.repeat(64)},
  {...p,sha256:'nothex'},
  {...p,document:p.document.replace('Language: ru','Language: unknown')},
  {...p,document:p.document+'\nunexpected'},
  [p]
 ];
 for(const v of corrupt)await assert.rejects(verifyEditorialReviewPack(JSON.stringify(v)));
 await assert.rejects(verifyEditorialReviewPack('{broken'),/JSON/);
 await assert.rejects(verifyEditorialReviewPack(' '),/JSON/);
 assert.ok(bytes(await createEditorialReviewPack(draft)).byteLength<MAX_REVIEW_PACK_BYTES);
});
test('selected file validation rejects invalid names, bad UTF-8, short buffers and oversize files',async()=>{
 const p=await createEditorialReviewPack(draft);
 await assert.rejects(readEditorialReviewPackFile(file(p,'bundle.md')),TypeError);
 await assert.rejects(readEditorialReviewPackFile(file(p,'../bundle.json')),TypeError);
 await assert.rejects(readEditorialReviewPackFile({
  name:'valid.json',size:20,async arrayBuffer(){return new ArrayBuffer(8);}
 }),TypeError);
 await assert.rejects(readEditorialReviewPackFile({
  name:'valid.json',size:MAX_REVIEW_PACK_BYTES+1,async arrayBuffer(){throw Error('should not read');}
 }),TypeError);
 await assert.rejects(readEditorialReviewPackFile({
  name:'valid.json',size:2,async arrayBuffer(){return Uint8Array.of(0xc3,0x28).buffer;}
 }),TypeError);
});
test('manual CLI verifies on-disk package without logging any manuscript content',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'24gotop-review-'));
 try{
  const path=join(dir,'review.json');
  await writeFile(path,await createEditorialReviewPack(draft));
  const verified=await verifyReviewPackAtPath(path);
  assert.match(verified.checksum,/^[a-f0-9]{64}$/);
  assert.ok(verified.bytes>100);
  await writeFile(path,'{"modified":true}');
  await assert.rejects(verifyReviewPackAtPath(path));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('editor clear is never an unchanged async export snapshot',()=>{
 const before={...draft};
 const empty={title:'',body:'',source:'',locale:'en',category:'guides'};
 assert.equal(matchesDraftExportSnapshot(before,before),true);
 assert.equal(matchesDraftExportSnapshot(before,empty),false,
  'empty current editor must not authorize the old private manuscript');
 assert.equal(matchesDraftExportSnapshot(before,{...before,body:'new text'}),false);
 assert.equal(matchesDraftExportSnapshot(before,{...before,locale:'en'}),false);
 assert.equal(matchesDraftExportSnapshot(before,null),false);
 assert.equal(matchesDraftExportSnapshot(null,before),false);
});

test('pending review digest cannot export after any change, even if undone',()=>{
 const gate=createDraftImportGate();
 const before={...draft};
 const first=gate.begin();
 assert.equal(gate.canApply(first)&&matchesDraftExportSnapshot(before,{...before}),true);
 gate.changed();
 assert.equal(gate.canApply(first)&&matchesDraftExportSnapshot(before,{...before}),false,
  'returning to identical content does not revive stale consent');
 const second=gate.begin();
 assert.equal(gate.canApply(second),true);
 const third=gate.begin();
 assert.equal(gate.canApply(second),false,'newer export invalidates older pending export');
 assert.equal(gate.canApply(third),true);
 gate.changed();
 assert.equal(gate.canApply(third),false,'clear or programmatic import invalidates digest');
});

test('public editor invalidates pending review exports at every existing mutation path',()=>{
 const editor=readFileSync(new URL('../site/draft-lab.js',import.meta.url),'utf8');
 assert.match(editor,/const reviewExportGate=createDraftImportGate\(\)/);
 assert.match(editor,/function editorChanged\(\)\{\s*importGate\.changed\(\);\s*reviewExportGate\.changed\(\)/);
 assert.equal((editor.match(/editorChanged\(\);/g)||[]).length,10,
  'typing, Markdown/image formatting, external Markdown insertion, single-match replacement, templates, opening, saved drafts and clear invalidate digest');
 assert.match(editor,/reviewExportGate\.canApply\(ticket\)/);
 assert.match(editor,/matchesDraftExportSnapshot\(draft,currentDraft\(\)\)/);
 assert.doesNotMatch(editor,/hasUnexportedChanges\(currentDraft\(\),draft\)/);
});
