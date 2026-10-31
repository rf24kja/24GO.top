import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRelatedReading,renderRelatedReadingPages}
 from '../scripts/build-related-reading.mjs';
import {renderEngineeringFeed} from '../scripts/build-engineering-json-feed.mjs';

const base=new URL('../site/engineering/',import.meta.url);
const read=path=>readFileSync(new URL(path,base),'utf8');
const feed=JSON.parse(renderEngineeringFeed()),archive=read('index.html');
const build=({items=feed.items,index=archive,reader=read}={})=>
 buildRelatedReading({feed:{...feed,items},archive:index,readArticle:reader});

test('every shipped note has exactly two crawlable verified contextual links',()=>{
 const expected=renderRelatedReadingPages();
 assert.equal(expected.size,feed.items.length);
 const verified=new Set(feed.items.map(x=>x.url));
 for(const [file,generated] of expected){
  assert.equal(read(file),generated,'stale navigation in '+file);
  const nav=generated.match(/<nav class="related-reading" aria-label="Continue reading">([\s\S]*?)<\/nav>/g);
  assert.equal(nav?.length,1,file+' must expose one navigation landmark');
  const html=nav[0],urls=[...html.matchAll(/<li><a href="\.\/([^"]+)">/g)]
   .map(x=>'https://24go.top/engineering/'+x[1]);
  assert.equal(urls.length,2,file+' has exactly two recommendations');
  assert.equal(new Set(urls).size,2);
  assert.ok(urls.every(x=>verified.has(x)),'only genuinely published pages');
  assert.ok(urls.every(x=>!x.endsWith('/'+file)),'no self-link');
  assert.match(html,/<h2>Continue reading<\/h2>/);
  assert.match(html,/<p><a href="\.\/">Explore all engineering notes<\/a><\/p>/);
  assert.ok(generated.lastIndexOf('<\/article>')<generated.indexOf('<nav class="related-reading"'),
   'links must remain outside researched article body');
  assert.ok(generated.indexOf('<nav class="related-reading"')<generated.indexOf('</main>'));
  assert.doesNotMatch(html,/<script|onclick=|<iframe|javascript:/i);
 }
});

test('generator is idempotent and preserves author-visible article text',()=>{
 const first=build(),again=build({reader:file=>first.get(file)});
 assert.deepEqual([...again.entries()],[...first.entries()]);
 for(const [file,html] of first){
  const original=read(file);
  assert.equal(
   html.split('</article>')[0],original.split('</article>')[0],
   file+' must not rewrite published research, citations or JSON-LD');
 }
});

test('untrusted, missing and duplicate editorial records fail closed',()=>{
 const a=feed.items[0];
 assert.throws(()=>build({items:[...feed.items,a]}),/cardinality|unverified/);
 assert.throws(()=>build({items:feed.items.map((x,i)=>i===0
  ?{...x,url:'https://evil.example/article.html'}:x)}),/unverified/);
 assert.throws(()=>build({items:feed.items.map((x,i)=>i===0
  ?{...x,id:'https://evil.example/bogus.html'}:x)}),/unverified/);
 assert.throws(()=>build({index:archive.replace('data-note-topic="security"',
  'data-note-topic="__proto__"')}),/untrusted/);
 assert.throws(()=>build({reader:file=>file===feed.items[0].url.split('/').at(-1)
   ?read(file).replace('<link rel="canonical"','<link rel="not-canonical"')
   :read(file)}),/canonical missing/);
});

test('published titles are escaped as text, never as raw HTML',()=>{
 const injected=feed.items.map((item,i)=>i===1
  ?{...item,title:'Untrusted <img onerror="x"> & research'}:item);
 const output=build({items:injected});
 const all=[...output.values()].join('');
 assert.match(all,/Untrusted &lt;img onerror=&quot;x&quot;&gt; &amp; research/);
 assert.doesNotMatch(all,/<img onerror=/);
});

test('this is static source-backed navigation, not a backend or AI ranking feature',()=>{
 const js=readFileSync(new URL('../scripts/build-related-reading.mjs',import.meta.url),'utf8');
 assert.match(js,/renderEngineeringFeed/);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sb_secret_|service_role|OPENAI_API_KEY/);
});
