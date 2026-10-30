import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {buildEngineeringFeed,renderEngineeringFeed} from '../scripts/build-engineering-json-feed.mjs';
const dir=new URL('../site/engineering/',import.meta.url);
const rss=readFileSync(new URL('feed.xml',dir),'utf8');
const reader=file=>readFileSync(new URL(file,dir),'utf8');
test('JSON Feed 1.1 is deterministic, canonical and in RSS publication order',()=>{
 const feed=JSON.parse(readFileSync(new URL('feed.json',dir),'utf8'));
 assert.equal(readFileSync(new URL('feed.json',dir),'utf8'),renderEngineeringFeed());
 assert.equal(feed.version,'https://jsonfeed.org/version/1.1');
 assert.equal(feed.home_page_url,'https://24go.top/engineering/');
 assert.equal(feed.feed_url,'https://24go.top/engineering/feed.json');
 const files=readdirSync(dir).filter(file=>file.endsWith('.html')&&file!=='index.html');
 assert.equal(feed.items.length,files.length);
 assert.deepEqual(feed.items.map(item=>item.url).sort(),files.map(file=>'https://24go.top/engineering/'+file).sort());
 assert.equal(new Set(feed.items.map(item=>item.id)).size,files.length);
 for(const item of feed.items){
  assert.equal(item.id,item.url);
  assert.equal(item.language,'en');
  assert.ok(item.title.length>8 && item.summary.length>30);
  assert.equal(item.content_text,item.summary+'\n\nRead full original article: '+item.url);
  assert.ok(Number.isFinite(Date.parse(item.date_published)));
  assert.ok(item.authors.length===1&&item.authors[0].name);
 }
 assert.doesNotMatch(JSON.stringify(feed),/sb_secret_|service_role|draft-lab\.html/i);
});
test('malformed, duplicate or contradicted source metadata fails closed',()=>{
 assert.throws(()=>buildEngineeringFeed(rss.replace('</channel>','<item><title>Fake</title></item></channel>'),reader),/Missing RSS link/);
 assert.throws(()=>buildEngineeringFeed(rss.replace(
  'https://24go.top/engineering/safe-markdown-citation-links-without-xss.html',
  'https://wrong.example/bogus.html'),reader),/Noncanonical/);
 assert.throws(()=>buildEngineeringFeed(rss,()=>'<html></html>'),/one Article JSON-LD/);
 assert.throws(()=>buildEngineeringFeed(rss,file=>reader(file).replace('"inLanguage":"en"','"inLanguage":"xx"')),/metadata mismatch/);
});
test('site advertises machine-readable JSON feed without claiming indexing',()=>{
 const archive=reader('index.html');
 const home=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
 const index=readFileSync(new URL('../site/llms.txt',import.meta.url),'utf8');
 const audit=readFileSync(new URL('../scripts/check-live-seo.sh',import.meta.url),'utf8');
 assert.ok(archive.includes('type="application/feed+json"')&&archive.includes('href="./feed.json"'));
 assert.ok(home.includes('type="application/feed+json"')&&home.includes('href="./engineering/feed.json"'));
 assert.ok(index.includes('https://24go.top/engineering/feed.json'));
 assert.ok(audit.includes("probe '/engineering/feed.json'"));
});