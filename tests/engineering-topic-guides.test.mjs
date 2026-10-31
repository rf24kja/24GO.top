import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {renderEngineeringFeed} from '../scripts/build-engineering-json-feed.mjs';

const root=new URL('../site/engineering/',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const archive=read('index.html'),feed=JSON.parse(renderEngineeringFeed());
const topics=['security','writing','infrastructure','publishing'];
const cards=new Map([...archive.matchAll(/<article class="card" data-note-card data-note-topic="([^"]+)" data-note-file="([^"]+)">/g)]
 .map(m=>[m[2],m[1]]));
const published=new Set(feed.items.map(x=>x.url.slice('https://24go.top/engineering/'.length)));

test('topic reading paths are real canonical pages with reviewed, topic-matched articles',()=>{
 for(const topic of topics){
  const page='topics/'+topic+'.html',html=read(page);
  assert.match(html,new RegExp('<link rel="canonical" href="https://24go\\.top/engineering/topics/'+topic+'\\.html">'));
  assert.match(html,/<h1>[^<]+<\/h1>/);
  assert.match(html,/id="reading-heading"/);
  assert.match(html,/id="questions-heading"/);
  assert.match(html,/Pre-launch transparency/);
  assert.doesNotMatch(html,/<script|noindex|AggregateRating|SearchAction/);
  assert.ok(archive.includes('href="./topics/'+topic+'.html"'));
  const links=[...html.matchAll(/<li><span class="topic-order">0\d<\/span><div><h3><a href="\.\.\/([^"]+)"/g)]
   .map(x=>x[1]);
  assert.ok(links.length>=2&&links.length<=3,'each collection needs actual useful guides: '+topic);
  assert.equal(new Set(links).size,links.length);
  for(const file of links){
   assert.ok(published.has(file),'published content only: '+file);
   assert.equal(cards.get(file),topic,'no fabricated topic labels: '+file);
  }
  const url=new URL(page,root);
  for(const [,href] of html.matchAll(/\bhref="([^"]+)"/g)){
   if(/^(https?:|mailto:|#)/.test(href))continue;
   const target=new URL(href,url);
   const dest=fileURLToPath(target)+(target.pathname.endsWith('/')?'index.html':'');
   assert.ok(existsSync(dest),'broken topic link: '+topic+' '+href);
  }
 }
});
test('collections are reachable through sitemap and author-curated discovery files',()=>{
 const xml=readFileSync(new URL('../site/sitemap.xml',import.meta.url),'utf8');
 const llms=readFileSync(new URL('../site/llms.txt',import.meta.url),'utf8');
 for(const topic of topics){
  const url='https://24go.top/engineering/topics/'+topic+'.html';
  assert.ok(xml.includes('<loc>'+url+'</loc>'),url);
  assert.ok(llms.includes(url),url);
 }
 assert.ok(!xml.includes('/engineering/topics/discovery.html'),
  'do not generate a thin collection for only one published discovery note');
});

test('live audit distinguishes article leaves from nested topic guides',()=>{
 const audit=readFileSync(new URL('../scripts/check-live-seo.sh',import.meta.url),'utf8');
 assert.ok(audit.includes('if [[ "$route" =~ ^/engineering/[a-z0-9-]+[.]html$ ]]; then'),
  'article-only checks must never include nested /topics/*.html pages');
 assert.ok(!audit.includes('if [[ "$route" == /engineering/*.html ]]; then'));
 assert.ok(archive.includes('href="./discoverable-technical-articles.html">Read the original technical discovery checklist</a>'),
  'a single discovery article must remain easy to reach without thin collection pages');
});
