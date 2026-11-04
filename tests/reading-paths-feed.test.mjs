import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadStaticReadingPathCatalog} from '../site/engineering/paths-feed.mjs';

const source=readFileSync(new URL('../site/engineering/feed.json',import.meta.url),'utf8');
function fixture({text=source,status=200,type='application/feed+json',
 headers={},redirected=false,fetchError=null}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  if(fetchError)throw fetchError;
  const response=new Response(text,{status,headers:{'content-type':type,...headers}});
  if(redirected)Object.defineProperty(response,'redirected',{value:true});
  return response;
 };
 return {calls,fetchImpl};
}
test('reads the real published catalog with one no-credentials, no-redirect GET',async()=>{
 const x=fixture();
 const articles=await loadStaticReadingPathCatalog({fetchImpl:x.fetchImpl});
 assert.ok(articles.length>=5);
 assert.ok(articles.every(a=>a.url.startsWith('https://24go.top/engineering/')));
 assert.equal(x.calls.length,1);
 const call=x.calls[0];
 assert.equal(call.url,'../feed.json');
 assert.equal(call.options.method,'GET');
 assert.equal(call.options.credentials,'omit');
 assert.equal(call.options.redirect,'error');
 assert.equal(call.options.referrerPolicy,'no-referrer');
 assert.equal(call.options.cache,'no-store');
 assert.equal(call.options.headers.accept,'application/feed+json, application/json');
 assert.equal(typeof call.options.signal.aborted,'boolean');
 assert.equal(call.options.headers.authorization,undefined);
});
test('refuses offsite redirects, wrong media, HTTP errors and provider failure',async()=>{
 for(const opts of [
  {redirected:true},{status:302},{status:403},{status:404},
  {status:500},{type:'text/html'}, {type:'text/plain'},
  {fetchError:new Error('SECRET_PROVIDER_DETAILS')}
 ]){
  const x=fixture(opts);
  await assert.rejects(loadStaticReadingPathCatalog({fetchImpl:x.fetchImpl}),
   /public_reading_catalog_unavailable/);
  assert.equal(x.calls.length,1);
 }
});
test('rejects oversized content-length, invalid UTF-8, malformed JSON, and corrupt corpus',async()=>{
 const bads=[
  fixture({headers:{'content-length':'524289'}}),
  fixture({headers:{'content-length':'NaN'}}),
  fixture({text:'not JSON'}),
  fixture({text:'{"items":[]}'}),
  fixture({text:JSON.stringify({items:[{url:'https://evil.example/attacker.html'}]})})
 ];
 for(const f of bads)await assert.rejects(
  loadStaticReadingPathCatalog({fetchImpl:f.fetchImpl}),
  /public_reading_catalog_unavailable/);
 const malformed=await loadStaticReadingPathCatalog({
  fetchImpl:async()=>new Response(new Uint8Array([0xff,0xfe]),{
   headers:{'content-type':'application/json'}
  })
 }).catch(e=>e);
 assert.match(malformed.message,/public_reading_catalog_unavailable/);
});
test('streaming reader caps actual bytes and tiny-chunk storms before allocating',async()=>{
 const make=(stream)=>async()=>new Response(stream,{headers:{'content-type':'application/json'}});
 const big=make(new ReadableStream({start(controller){
  controller.enqueue(new Uint8Array(512*1024+1));
 }}));
 await assert.rejects(loadStaticReadingPathCatalog({fetchImpl:big}),
  /public_reading_catalog_unavailable/);
 const many=make(new ReadableStream({start(controller){
  for(let i=0;i<514;i++)controller.enqueue(new Uint8Array(0));
 }}));
 await assert.rejects(loadStaticReadingPathCatalog({fetchImpl:many}),
  /public_reading_catalog_unavailable/);
});
test('live reading paths UI imports guarded loader and never directly buffers response.json()',()=>{
 const ui=readFileSync(new URL('../site/engineering/paths.js',import.meta.url),'utf8');
 assert.match(ui,/import \{loadStaticReadingPathCatalog\} from '\.\/paths-feed\.mjs'/);
 assert.match(ui,/approved=await loadStaticReadingPathCatalog\(\)/);
 assert.doesNotMatch(ui,/response\.json\(\)/);
});
