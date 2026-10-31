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
