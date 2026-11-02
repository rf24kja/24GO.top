import test from 'node:test';
import assert from 'node:assert/strict';
import {
 validateReleaseReceipt,releaseEvidenceLinks,fetchReleaseReceipt,mountReleaseReceipt
} from '../site/release-status.js';

const SHA='bbf9c63bd7ddff932fe47dbec3177b92808b3a03';
const valid={commit:SHA,pages_run_id:'41387261485'};
const response=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'content-type':'application/json'}
});

test('public Pages provenance accepts only the fixed commit and workflow-run schema',()=>{
 const receipt=validateReleaseReceipt(valid);
 assert.deepEqual({...receipt},{commit:SHA,pagesRunId:'41387261485'});
 assert.deepEqual({...releaseEvidenceLinks(receipt)},{
  commit:'https://github.com/rf24kja/24GO.top/commit/'+SHA,
  workflow:'https://github.com/rf24kja/24GO.top/actions/runs/41387261485'
 });
 for(const broken of [
  null,[],{}, {...valid,commit:'main'}, {...valid,commit:SHA.toUpperCase()},
  {...valid,pages_run_id:0}, {...valid,pages_run_id:'0'},
  {...valid,pages_run_id:'123/../../settings'},
  {...valid,pages_run_id:'00123'}, {...valid,extra:'false-success'},
  {commit:'https://evil.example/'+SHA,pages_run_id:'123'}
 ])assert.throws(()=>validateReleaseReceipt(broken),/Invalid Pages release receipt/);
});

test('release request is same-origin, no credentials, no redirect and not served from cache',async()=>{
 let called=0;
 const result=await fetchReleaseReceipt(async (url,init)=>{
  called++;
  assert.equal(url,'./release.json');
  assert.equal(init.method,'GET');
  assert.equal(init.credentials,'omit');
  assert.equal(init.redirect,'error');
  assert.equal(init.cache,'no-store');
  assert.equal(init.headers.accept,'application/json');
  assert.equal(typeof init.signal?.aborted,'boolean');
  return response(valid);
 });
 assert.equal(called,1);
 assert.equal(result.commit,SHA);
});

test('non-JSON, oversized, erroneous and malformed receipts never appear verified',async()=>{
 const providers=[
  async()=>response(valid,503),
  async()=>new Response('<html>error</html>',{status:200}),
  async()=>response({...valid,commit:'invalid'}),
  async()=>new Response('x'.repeat(260),{status:200}),
  async()=>new Response('small',{status:200,headers:{'content-length':'9999'}}),
  async()=>{throw new Error('offline');}
 ];
 for(const provider of providers)
  await assert.rejects(fetchReleaseReceipt(provider));
});

function documentStub(){
 const values=new Map(['public-release-status','public-release-commit','public-release-workflow']
  .map(id=>[id,{id,textContent:'',hidden:false,href:''}]));
 return {getElementById:id=>values.get(id),values};
}

test('progress page renders evidence links only from a valid public deployment receipt',async()=>{
 const ok=documentStub();
 assert.equal(await mountReleaseReceipt(ok,async()=>response(valid)),true);
 assert.match(ok.values.get('public-release-status').textContent,/static build only/);
 assert.equal(ok.values.get('public-release-commit').hidden,false);
 assert.equal(ok.values.get('public-release-workflow').hidden,false);
 assert.equal(ok.values.get('public-release-commit').href,
  'https://github.com/rf24kja/24GO.top/commit/'+SHA);
 const failed=documentStub();
 assert.equal(await mountReleaseReceipt(failed,async()=>response({commit:'not a SHA'})),true);
 assert.match(failed.values.get('public-release-status').textContent,/cannot be verified/);
 assert.equal(failed.values.get('public-release-commit').hidden,true);
 assert.equal(failed.values.get('public-release-workflow').hidden,true);
});


test('receipt stops an oversized chunked response before full download',async()=>{
 let wasCancelled=false;
 const stream=new ReadableStream({
  start(controller){
   controller.enqueue(new Uint8Array(180));
   controller.enqueue(new Uint8Array(180));
  },
  cancel(){wasCancelled=true;}
 });
 const response=new Response(stream,{status:200,headers:{'content-type':'application/json'}});
 response.text=()=>{throw new Error('unbounded response.text must never run');};
 await assert.rejects(fetchReleaseReceipt(async()=>response),/safe stream limit/);
 assert.equal(wasCancelled,true,'cancel unread provider response once budget is exceeded');
});

test('too many empty stream chunks are rejected without a hanging read',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({
  start(controller){for(let i=0;i<40;i++)controller.enqueue(new Uint8Array(0));},
  cancel(){cancelled=true;}
 });
 await assert.rejects(fetchReleaseReceipt(async()=>new Response(stream)),/safe stream limit/);
 assert.equal(cancelled,true);
});

test('strict UTF-8 parsing rejects malformed bytes that JSON text() may replace',async()=>{
 const raw=Buffer.concat([
  Buffer.from('{"commit":"'),
  Buffer.from([0xc3,0x28]),
  Buffer.from('","pages_run_id":"41387261485"}')
 ]);
 await assert.rejects(fetchReleaseReceipt(async()=>new Response(raw)),
  /Invalid Pages release receipt/);
});

test('valid receipt JSON split into several byte chunks remains verifiable',async()=>{
 const raw=Buffer.from(JSON.stringify(valid));
 const stream=new ReadableStream({
  start(controller){
   controller.enqueue(raw.subarray(0,17));
   controller.enqueue(raw.subarray(17,39));
   controller.enqueue(raw.subarray(39));
   controller.close();
  }
 });
 const result=await fetchReleaseReceipt(async()=>new Response(stream));
 assert.equal(result.commit,SHA);
 assert.equal(result.pagesRunId,valid.pages_run_id);
});
