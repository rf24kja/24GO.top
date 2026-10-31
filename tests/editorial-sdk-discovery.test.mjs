import test from 'node:test';
import assert from 'node:assert/strict';
import {TopEditorialClient} from '../packages/sdk/index.mjs';

import {readFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL('../site/engineering/'+name,import.meta.url),'utf8'));
const feed=read('feed.json'),index=read('search-index.json');
function makeClient(f=feed,i=index){
 const calls=[];
 const client=new TopEditorialClient({fetchImpl:async (url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/feed.json'))return new Response(JSON.stringify(f));
  if(url.endsWith('/search-index.json'))return new Response(JSON.stringify(i));
  throw Error('Unexpected resource');
 }});
 return {client,calls};
}
test('search existing reviewed article text without credentials or query upload',async()=>{
 const {client,calls}=makeClient();
 const result=await client.searchArticles({query:'PostgreSQL',limit:5});
 assert.ok(result.total>0);
 assert.ok(result.articles.length<=5);
 assert.ok(result.articles.every(x=>feed.items.some(y=>y.url===x.url)));
 assert.equal(calls.length,2);
 assert.deepEqual(calls.map(x=>x.url).sort(),[
  'https://24go.top/engineering/feed.json',
  'https://24go.top/engineering/search-index.json'
 ]);
 assert.ok(calls.every(x=>!x.url.includes('PostgreSQL')&&
  x.options.headers?.authorization===undefined&&x.options.redirect==='error'));
});
test('fixed corpus search is deterministic across keyword order',async()=>{
 const {client}=makeClient();
 const first=await client.searchArticles({query:'markdown preview'});
 const second=await client.searchArticles({query:'preview markdown'});
 assert.ok(first.total>0);
 assert.deepEqual(first.articles.map(x=>x.url),second.articles.map(x=>x.url));
 const none=await client.searchArticles({query:'zzzznonexistentzzzz'});
 assert.equal(none.total,0);
 assert.deepEqual(none.articles,[]);
});

test('canonical indexed text is explicitly labeled as a lossy search representation',async()=>{
 const {client}=makeClient();
 const url=feed.items[0].url;
 const found=await client.getArticleSearchText(url);
 assert.equal(found.url,url);
 assert.equal(found.textKind,'normalized-lossy-search-index');
 assert.ok(found.searchText.length>=300);
 assert.equal(found.source,'https://24go.top/engineering/search-index.json');
 await assert.rejects(client.getArticleSearchText(
  'https://24go.top/engineering/not-in-review.html'),e=>e.code==='ARTICLE_NOT_FOUND');
});
test('invalid query and URL arguments fail before a request',async()=>{
 const {client,calls}=makeClient();
 for(const query of [undefined,'',' ','a'.repeat(81)]){
  await assert.rejects(client.searchArticles({query}),TypeError);
 }
 for(const limit of [0,21,1.25,'5']){
  await assert.rejects(client.searchArticles({query:'valid',limit}),RangeError);
 }
 for(const url of [
  'https://another.example/engineering/article.html',
  'https://24go.top/engineering/../article.html',
  'https://24go.top/engineering/article.html?extra=1'
 ]){
  await assert.rejects(client.getArticleSearchText(url),TypeError);
 }
 assert.equal(calls.length,0);
});
test('index anomalies fail closed before returning any result',async()=>{
 const variants=[
  {version:1,articles:index.articles.slice(1)},
  {version:1,articles:[...index.articles.slice(0,-1),index.articles[0]]},
  {version:2,articles:index.articles},
  {version:1,articles:index.articles.map((x,i)=>i===0?{...x,file:'unknown.html'}:x)},
  {version:1,articles:index.articles.map((x,i)=>i===0?{...x,text:'x'.repeat(24001)}:x)}
 ];
 for(const variant of variants){
  await assert.rejects(makeClient(feed,variant).client.searchArticles({query:'PostgreSQL'}),e=>{
   assert.equal(e.code,'INVALID_INDEX');
   return true;
  });
 }
});

test('pre-aborted public search never sends requests',async()=>{
 const controller=new AbortController();
 controller.abort();
 const {client,calls}=makeClient();
 await assert.rejects(client.searchArticles({
  query:'security',signal:controller.signal
 }),e=>e.code==='ABORTED');
 assert.equal(calls.length,0);
});
test('numeric response-size preflight refuses a declared oversized stream',async()=>{
 let cancelled=0;
 const stream=new ReadableStream({
  pull(controller){controller.enqueue(new Uint8Array([123]));},
  cancel(){cancelled++;}
 });
 const client=new TopEditorialClient({fetchImpl:async()=>new Response(stream,{
  headers:{'content-length':String(2*1024*1024+1)}
 })});
 await assert.rejects(client.searchArticles({query:'valid'}),e=>{
  assert.equal(e.code,'RESPONSE_TOO_LARGE');
  return true;
 });
 assert.ok(cancelled>=1);
});
