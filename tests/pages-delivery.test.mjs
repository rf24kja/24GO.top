import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expectedReceipt,verifyPagesDelivery} from '../scripts/verify-pages-delivery.mjs';

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
