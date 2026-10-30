import test from 'node:test';
import assert from 'node:assert/strict';
import {LOCALES,CATEGORIES,formatDraft,readDraftFileStrict,MAX_DRAFT_FILE_BYTES}
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
