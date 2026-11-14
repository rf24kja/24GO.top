import test from 'node:test';
import assert from 'node:assert/strict';
import {LOCALES,CATEGORIES,formatDraft,readDraftFileStrict,MAX_DRAFT_FILE_BYTES,readExternalMarkdownStrict,MAX_EXTERNAL_MARKDOWN_BYTES,formatExternalMarkdownInsertion}
 from '../site/draft-lab-logic.js';
const sample={title:'Reproducible technical investigation',
 body:'Code and original research explained with a reproducible test.\n\n🔐 ภาษาไทย 中文 Русский',
 locale:'ru',category:'tools',source:'https://example.org/technical-report'};
const file=(text,name='24gotop-example.md')=>{
 const bytes=new TextEncoder().encode(text);
 return {name,size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer};
};
test('strict on-device UTF-8 import restores every original language and category',async()=>{
 for(const locale of LOCALES)for(const category of CATEGORIES){
  const original={...sample,locale,category};
  assert.deepEqual(await readDraftFileStrict(file(formatDraft(original))),original);
 }
});
test('strict UTF-8 import retains whitespace in padded code samples',async()=>{
 const body='\n  Four-space code indentation stays intact.  \n    second indented line\n\n';
 const original={...sample,body,locale:'th'};
 const restored=await readDraftFileStrict(file(formatDraft(original)));
 assert.deepEqual(restored,original);
});
test('UTF-8 BOM is allowed without silently changing original article text',async()=>{
 const original={...sample,locale:'zh'};
 const data=new TextEncoder().encode(formatDraft(original));
 const bytes=new Uint8Array(3+data.byteLength);
 bytes.set([0xef,0xbb,0xbf]);bytes.set(data,3);
 const imported=await readDraftFileStrict({name:'24gotop-bom.md',size:bytes.byteLength,
  arrayBuffer:async()=>bytes.buffer});
 assert.deepEqual(imported,original);
});
test('malformed UTF-8 is refused rather than rewritten with replacement characters',async()=>{
 const variants=[
  [0xff,0xfe,0x23,0x20,0x41],
  [0x23,0x20,0xc3,0x28,0x0a],
  [0xef,0xbb,0xbf,0xf0,0x80,0x80,0x80]
 ];
 for(const input of variants){
  const bytes=Uint8Array.from(input);
  await assert.rejects(readDraftFileStrict({
    name:'24gotop-invalid.md',size:bytes.byteLength,
    arrayBuffer:async()=>bytes.buffer
  }),/not valid UTF-8/);
 }
});
test('refuse oversized, mismatched, malicious or non-ArrayBuffer files before editor update',async()=>{
 const good=formatDraft(sample),saved=file(good);
 for(const invalid of [
  {name:'not-an-export.html',size:saved.size,arrayBuffer:saved.arrayBuffer},
  {...saved,name:'../../file.md'}, {...saved,name:'x\u0000.md'},
  {...saved,size:MAX_DRAFT_FILE_BYTES+1},{...saved,size:1},
  {...saved,size:NaN},{...saved,size:-1},{...saved,arrayBuffer:async()=>new Uint8Array(3)},
  {...saved,arrayBuffer:async()=>null},
  {...saved,arrayBuffer:async()=>{throw Error('private IO failure')}},
  {...saved,arrayBuffer:undefined},null
 ]){
  await assert.rejects(readDraftFileStrict(invalid),TypeError);
 }
 assert.equal((await readDraftFileStrict(saved)).title,sample.title);
});
test('invalid but UTF-8 well-formed ordinary Markdown is not treated as our export',async()=>{
 await assert.rejects(readDraftFileStrict(file('# An unrelated Markdown file\n\nHello world.')),
  /Not a 24GOTOP Draft Lab export/);
});


test('ordinary UTF-8 Markdown inserts exactly as text, including code and multilingual content',async()=>{
 const content='# A real technical guide\n\n    SELECT * FROM table;\n\nภาษาไทย 中文 Русский\n';
 assert.equal(await readExternalMarkdownStrict(file(content,'existing.md')),content);
 const bytes=new TextEncoder().encode('\uFEFF'+content);
 assert.equal(await readExternalMarkdownStrict({name:'unicode.MD',size:bytes.length,
  arrayBuffer:async()=>bytes.buffer}),content,'optional BOM removed, body preserved');
 const start=formatExternalMarkdownInsertion('',0,0,content);
 assert.deepEqual({...start},{replacement:content,start:0,end:0,
  selectionStart:content.length,selectionEnd:content.length});
 const old='Before after';
 const inMiddle=formatExternalMarkdownInsertion(old,0,6,content);
 const combined=old.slice(0,inMiddle.start)+inMiddle.replacement+old.slice(inMiddle.end);
 assert.ok(combined.startsWith('Before\n\n# A real technical guide'));
 assert.ok(combined.endsWith('\n\n after'),'no selected manuscript text was removed');
 assert.ok(Object.isFrozen(inMiddle));
});

test('external Markdown file import rejects invalid UTF-8, oversized files, files from our export, and unsafe filenames',async()=>{
 const valid=file('# Guide\n\nContent here.');
 assert.equal(MAX_EXTERNAL_MARKDOWN_BYTES,16384);
 for(const bad of [
  {...valid,name:'index.html'},{...valid,name:'../private.md'},
  {...valid,name:'bad\u0000.md'},{...valid,name:'x'.repeat(255)+'.md'},
  {...valid,size:0},{...valid,size:MAX_EXTERNAL_MARKDOWN_BYTES+1},
  {...valid,size:1},{...valid,size:NaN},
  {...valid,arrayBuffer:async()=>new Uint8Array([1,2])},
  {...valid,arrayBuffer:async()=>{throw Error('read denied')}},
  {...valid,arrayBuffer:async()=>null},null
 ])await assert.rejects(readExternalMarkdownStrict(bad),TypeError);
 const corrupt=Uint8Array.from([0xff,0xfe,0x80]);
 await assert.rejects(readExternalMarkdownStrict({name:'broken.md',
  size:corrupt.length,arrayBuffer:async()=>corrupt.buffer}),TypeError);
 await assert.rejects(readExternalMarkdownStrict(file(' \n  \t ')),TypeError);
 await assert.rejects(readExternalMarkdownStrict(file('Bad \u0000 text')),TypeError);
 await assert.rejects(readExternalMarkdownStrict(file(formatDraft(sample))),
  /Unsupported Markdown document/);
});

test('plain Markdown insertion validates the final 12k character body without removing selected text',()=>{
 const insert='## Finding';
 const value='alpha beta gamma';
 const result=formatExternalMarkdownInsertion(value,6,10,insert);
 assert.equal(result.start,10);
 assert.equal(result.end,10);
 const updated=value.slice(0,result.start)+result.replacement+value.slice(result.end);
 assert.match(updated,/alpha beta\n\n## Finding\n\n gamma/);
 for(const args of [
  [null,0,0,'# valid'],['abc',-1,0,'# valid'],
  ['abc',0,4,'# valid'],['abc',2,1,'# valid'],
  ['abc',0,0,''],['abc',0,0,'  \n'],
  ['abc',0,0,'contains\u0000zero'],
  ['a'.repeat(12001),0,0,'text']
 ])assert.throws(()=>formatExternalMarkdownInsertion(...args),TypeError);
 assert.throws(()=>formatExternalMarkdownInsertion('x'.repeat(11990),0,0,
  '## Too long by several characters'),RangeError);
});
