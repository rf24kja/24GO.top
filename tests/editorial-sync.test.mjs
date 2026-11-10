import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planFromReviewedSite,planEditorialSync,regenerateReaderAllowlist,changedEditorialFiles}
 from '../scripts/sync-editorial.mjs';

const root=new URL('../site/',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const feed=JSON.parse(read('engineering/feed.json'));
const sources=()=>({
 rss:read('engineering/feed.xml'),
 archive:read('engineering/index.html'),
 home:read('index.html'),
 readerSource:read('engineering/article-reader.mjs'),
 readPage:read
});

test('all editorial derived files match one reviewed source plan',()=>{
 const plan=planFromReviewedSite();
 assert.equal(plan.size,feed.items.length+4);
 assert.deepEqual(changedEditorialFiles(plan),[]);
 for(const [path,html] of plan){
  assert.equal(read(path),html,'stale generated public artifact: '+path);
  assert.ok(path==='sitemap.xml'||path.startsWith('engineering/'));
 }
 assert.deepEqual([...plan.keys()].slice(0,4),[
  'engineering/feed.json','engineering/search-index.json','sitemap.xml',
  'engineering/article-reader.mjs'
 ]);
});

test('reading-list manifest is regenerated from the exact reviewed article inventory',()=>{
 const source=read('engineering/article-reader.mjs');
 assert.equal(regenerateReaderAllowlist(source,feed.items),source);
 assert.match(source,/export const PUBLIC_READING_FILES=Object.freeze/);
 const newItem={id:'https://24go.top/engineering/example-review.html',
  url:'https://24go.top/engineering/example-review.html'};
 const updated=regenerateReaderAllowlist(source,[newItem,...feed.items]);
 assert.ok(updated.includes('"example-review.html"'));
 assert.equal(updated.includes('const APPROVED_READING_FILES=new Set(PUBLIC_READING_FILES)'),true);
});

test('fail closed on duplicates, unsafe article URLs and manipulated manifest source',()=>{
 const source=read('engineering/article-reader.mjs');
 for(const items of [
  [{id:'https://evil.test/article.html',url:'https://evil.test/article.html'}],
  [{id:'https://24go.top/engineering/a.html',
    url:'https://24go.top/engineering/b.html'}],
  [feed.items[0],feed.items[0]],
  [{id:'https://24go.top/engineering/../secrets.html',
    url:'https://24go.top/engineering/../secrets.html'}]
 ])assert.throws(()=>regenerateReaderAllowlist(source,items),TypeError);
 assert.throws(()=>regenerateReaderAllowlist(source.replace('export const PUBLIC_READING_FILES','export const BAD_FILES'),feed.items),TypeError);
 assert.throws(()=>regenerateReaderAllowlist(source+'\n'+source.match(/export const PUBLIC_READING_FILES=[^\n]+/)[0],feed.items),TypeError);
});

test('source validation rejects poisoned RSS or executable article markup before a write',()=>{
 const input=sources();
 const attacked=input.rss.replace('<link>'+feed.items[0].url+'</link>',
   '<link>https://attacker.invalid/engineering/article.html</link>');
 assert.throws(()=>planEditorialSync({...input,rss:attacked}),/Noncanonical|duplicate/);
 const first=feed.items[0].url.split('/').at(-1);
 const malicious=path=>{
  const html=read(path);
  return path==='engineering/'+first
   ?html.replace('<article class="article">','<article class="article"><script>bad()</script>')
   :html;
 };
 assert.throws(()=>planEditorialSync({...input,readPage:malicious}),/Unexpected executable/);
});

test('check mode accurately reports stale assets without writing files',()=>{
 const plan=planFromReviewedSite();
 const fake=path=>path==='engineering/feed.json'?'outdated':read(path);
 assert.deepEqual(changedEditorialFiles(plan,fake),['engineering/feed.json']);
 assert.deepEqual(changedEditorialFiles(plan,read),[]);
 assert.throws(()=>changedEditorialFiles({}),TypeError);
});

test('publisher sync never uses network, private APIs or credentials',()=>{
 const source=readFileSync(new URL('../scripts/sync-editorial.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|service_role|sb_secret_|PUBLISH_API_KEY|24GO\.online|child_process/);
 assert.match(source,/planFromReviewedSite/);
 assert.match(source,/--check/);
 assert.match(source,/--write/);
});
