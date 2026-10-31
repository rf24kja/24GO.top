import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildEngineeringSearchIndex,renderEngineeringSearchIndex} from '../scripts/build-engineering-search-index.mjs';

const root=new URL('../site/engineering/',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');
const feed=JSON.parse(read('feed.json'));
const shipped=read('search-index.json');
const articleUrls=new Set(feed.items.map(x=>x.url));

test('published full-text index is deterministic, current and restricted to canonical feed articles',()=>{
 assert.equal(shipped,renderEngineeringSearchIndex(),'content must match reviewed HTML and JSON Feed exactly');
 const index=JSON.parse(shipped);
 assert.equal(index.version,1);
 assert.equal(index.articles.length,10);
 assert.equal(index.articles.length,articleUrls.size);
 for(const article of index.articles){
  assert.match(article.file,/^[a-z0-9-]+\.html$/);
  assert.ok(articleUrls.has('https://24go.top/engineering/'+article.file));
  assert.ok(article.text.length>=300 && article.text.length<=24000);
  assert.equal(article.text,article.text.normalize('NFC'));
  assert.doesNotMatch(article.text,/<(?:script|article|div|h1|p)\b/i);
 }
 assert.ok(index.articles.some(x=>x.text.includes('content security policy')));
});

test('index refuses unapproved sources, missing article files and executable editorial markup',()=>{
 const valid=buildEngineeringSearchIndex(feed,file=>read(file));
 assert.equal(valid.articles.length,10);
 assert.throws(()=>buildEngineeringSearchIndex({...feed,items:[
  {...feed.items[0],url:'https://example.com/a.html'}]},()=>''),/Untrusted article URL/);
 assert.throws(()=>buildEngineeringSearchIndex({...feed,items:[feed.items[0],feed.items[0]]},file=>read(file)),/Duplicate/);
 assert.throws(()=>buildEngineeringSearchIndex({...feed,items:[
  {...feed.items[0],url:'https://24go.top/engineering/../../secret.env'}
 ]},()=>''),/noncanonical/);
 assert.throws(()=>buildEngineeringSearchIndex(feed,()=>'<html></html>'),/Missing article or canonical HTML/);
 assert.throws(()=>buildEngineeringSearchIndex({...feed,items:[feed.items[0]]},
  ()=>'<link rel="canonical" href="'+feed.items[0].url+'"><article class="article"><script>1</script></article>'),/Unexpected executable markup/);
});
