import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expectedReceipt,verifyPagesDelivery,verifyEssentialPublicPages,ESSENTIAL_PUBLIC_ROUTES} from '../scripts/verify-pages-delivery.mjs';

const SHA='845531da1202f1abf9dfb414191842d714fdd7bb';
const RUN='41396728819';
const payload=()=>expectedReceipt(SHA,RUN);
const response=(value,status=200)=>new Response(value,{status,headers:{
 'content-type':'application/json'
}});

test('Pages receipt is bound to one exact SHA and workflow run',()=>{
 assert.equal(payload(),
  '{"commit":"'+SHA+'","pages_run_id":"'+RUN+'"}\n');
 for(const [sha,runId] of [
  ['main',RUN],[SHA.toUpperCase(),RUN],[SHA,'0'],[SHA,'1/../../settings'],
  [SHA,42],[SHA.slice(0,39),RUN]
 ])assert.throws(()=>expectedReceipt(sha,runId),TypeError);
});

test('exact public HTTPS receipt is verified without secrets or redirects',async()=>{
 let called=0;
 const result=await verifyPagesDelivery({sha:SHA,runId:RUN,attempts:1,
  fetchImpl:async(url,options)=>{
   called++;
   assert.equal(url,'https://24go.top/release.json?pages_audit='+RUN);
   assert.equal(options.method,'GET');
   assert.equal(options.redirect,'error');
   assert.equal(options.cache,'no-store');
   assert.equal(options.headers.accept,'application/json');
   assert.equal(options.headers['cache-control'],'no-cache');
   assert.equal(typeof options.signal?.aborted,'boolean');
   assert.ok(!JSON.stringify(options).includes('authorization'));
   return response(payload());
  }
 });
 assert.equal(called,1);
 assert.deepEqual({...result},{verified:true,sha:SHA,runId:RUN,attempt:1});
});

test('stale Pages receipt retries and accepts only the current run',async()=>{
 let calls=0,waits=0;
 const valid=await verifyPagesDelivery({
  sha:SHA,runId:RUN,attempts:3,pauseMs:0,
  wait:async ms=>{assert.equal(ms,0);waits++;},
  fetchImpl:async()=>{
   calls++;
   return response(calls===1?expectedReceipt(SHA,'11111111'):payload());
  }
 });
 assert.equal(valid.attempt,2);
 assert.equal(calls,2);
 assert.equal(waits,1);
});

test('fails closed for missing Pages, redirects, wrong content and malformed bytes',async()=>{
 for(const bad of [
  async()=>response('not found',404),
  async()=>response('<html>not JSON</html>'),
  async()=>response(expectedReceipt(SHA,'123456')),
  async()=>response(new Uint8Array([0xc3,0x28])),
  async()=>response('redirect',302),
  async()=>{throw new Error('DNS unavailable');}
 ]){
  let calls=0;
  await assert.rejects(verifyPagesDelivery({
   sha:SHA,runId:RUN,attempts:2,pauseMs:0,wait:async()=>{},
   fetchImpl:async(...args)=>{calls++;return bad(...args);}
  }),/does not serve this exact commit/);
  assert.equal(calls,2);
 }
});

test('oversized streaming response is cancelled and cannot be verified',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({
  start(controller){
   controller.enqueue(new Uint8Array(200));
   controller.enqueue(new Uint8Array(200));
  },
  cancel(){cancelled=true;}
 });
 await assert.rejects(verifyPagesDelivery({sha:SHA,runId:RUN,attempts:1,
  fetchImpl:async()=>new Response(stream)
 }),/does not serve this exact commit/);
 assert.equal(cancelled,true);
});

test('too many empty stream chunks cannot starve release verification',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({
  start(controller){
   for(let i=0;i<36;i++)controller.enqueue(new Uint8Array(0));
  },
  cancel(){cancelled=true;}
 });
 await assert.rejects(verifyPagesDelivery({sha:SHA,runId:RUN,attempts:1,
  fetchImpl:async()=>new Response(stream)
 }),/does not serve this exact commit/);
 assert.equal(cancelled,true);
});

test('invalid verification arguments cause no network calls',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;return response(payload());};
 for(const options of [
  {sha:'main',runId:RUN},
  {sha:SHA,runId:'not-a-run'},
  {sha:SHA,runId:RUN,attempts:0},
  {sha:SHA,runId:RUN,attempts:999},
  {sha:SHA,runId:RUN,pauseMs:99999}
 ]){
  await assert.rejects(verifyPagesDelivery({...options,fetchImpl}),TypeError);
 }
 assert.equal(calls,0);
});

test('Pages deployment workflow verifies the exact successful deployment runner externally',()=>{
 const yaml=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 const deploy=yaml.indexOf('uses: actions/deploy-pages@v4');
 const verifier=yaml.indexOf('run: node scripts/verify-pages-delivery.mjs');
 assert.ok(deploy>0&&verifier>deploy,
  'CDN verification must happen after the GitHub Pages deploy action');
 assert.match(yaml,/EXPECTED_PAGES_SHA: \$\{\{ github\.sha \}\}/);
 assert.match(yaml,/EXPECTED_PAGES_RUN_ID: \$\{\{ github\.run_id \}\}/);
 assert.match(yaml,/node-version: '22'/);
 assert.match(yaml,/paths:[\s\S]*?site\/\*\*/);
});

test('five actual public route contracts are checked without user-controlled URLs',async()=>{
 const seen=[];
 const result=await verifyEssentialPublicPages({
  runId:RUN,attempts:1,
  fetchImpl:async(url,options)=>{
   seen.push(url);
   const route=ESSENTIAL_PUBLIC_ROUTES[seen.length-1];
   assert.equal(url,'https://24go.top'+route.path+'?pages_audit='+RUN);
   assert.equal(options.redirect,'error');
   assert.equal(options.cache,'no-store');
   assert.equal(options.method,'GET');
   assert.equal(typeof options.signal?.aborted,'boolean');
   assert.ok(!JSON.stringify(options).includes('authorization'));
   return response('static header '+route.marker+' static footer');
  }
 });
 assert.deepEqual({...result},{verified:true,checked:5});
 assert.equal(new Set(seen).size,5);
});

test('stale critical editor asset blocks public deployment confirmation',async()=>{
 let calls=0,waits=0;
 await assert.rejects(verifyEssentialPublicPages({
  runId:RUN,attempts:2,pauseMs:0,wait:async()=>{waits++;},
  fetchImpl:async url=>{
   calls++;
   const path=new URL(url).pathname;
   const route=ESSENTIAL_PUBLIC_ROUTES.find(item=>item.path===path);
   return response(path==='/draft-lab.js'?'stale old editor':route.marker);
  }
 }),/asset unavailable or outdated: \/draft-lab\.js/);
 assert.equal(calls,4,'homepage then two attempts at stale editor script');
 assert.equal(waits,1);
});

test('critical route verification fails closed on redirect, oversized and invalid UTF-8',async()=>{
 for(const mocked of [
  async()=>response('wrong',404),
  async()=>response('Moved',302),
  async()=>response(new Uint8Array([0xc3,0x28])),
  async()=>{throw new Error('offline');},
  async()=>{
   const stream=new ReadableStream({
    start(controller){controller.enqueue(new Uint8Array(32768));
      controller.enqueue(new Uint8Array(32769));}
   });
   return new Response(stream);
  }
 ]){
  await assert.rejects(verifyEssentialPublicPages({
   runId:RUN,attempts:1,fetchImpl:mocked
  }),/asset unavailable or outdated: \//);
 }
});

test('critical page body is not consumed beyond the strict byte limit',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({
  start(controller){controller.enqueue(new Uint8Array(50000));
   controller.enqueue(new Uint8Array(25000));},
  cancel(){cancelled=true;}
 });
 await assert.rejects(verifyEssentialPublicPages({
  runId:RUN,attempts:1,fetchImpl:async()=>new Response(stream)
 }),/asset unavailable or outdated/);
 assert.equal(cancelled,true);
});

test('critical route config fails before any network when run ID is invalid',async()=>{
 let fetches=0;
 const fetchImpl=async()=>{fetches++;throw Error('not allowed');};
 for(const args of [
  {runId:'1/../secret'},
  {runId:'0'},
  {runId:RUN,attempts:0},
  {runId:RUN,attempts:4},
  {runId:RUN,pauseMs:100000}
 ])
  await assert.rejects(verifyEssentialPublicPages({...args,fetchImpl}),TypeError);
 assert.equal(fetches,0);
});

test('all critical deployed markers exist in reviewed public static source',()=>{
 const files=new Map([
  ['/',readFileSync(new URL('../site/index.html',import.meta.url),'utf8')],
  ['/draft-lab.html',readFileSync(new URL('../site/draft-lab.html',import.meta.url),'utf8')],
  ['/draft-lab.js',readFileSync(new URL('../site/draft-lab.js',import.meta.url),'utf8')],
  ['/engineering/',readFileSync(new URL('../site/engineering/index.html',import.meta.url),'utf8')],
  ['/engineering/search.js',readFileSync(new URL('../site/engineering/search.js',import.meta.url),'utf8')]
 ]);
 for(const {path,marker} of ESSENTIAL_PUBLIC_ROUTES){
  assert.ok(files.get(path).includes(marker),
   'critical public marker must exist in the deployed static artifact: '+path);
 }
});
