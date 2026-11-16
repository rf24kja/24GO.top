import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,
 statSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {formatDraft} from '../site/draft-lab-logic.js';
import {createSignedAgentProposal} from '../packages/agents/editorial-proposal.mjs';
import {reviewSignedAgentArticle,MAX_REVIEW_TOKENS} from '../packages/agents/editorial-reviewer.mjs';
import {runAgentPeerReviewCommand,parseAgentReviewOptions} from '../packages/agents/editorial-reviewer-cli.mjs';

const article={
 title:'Review a technical AI-generated article without silently publishing it',
 body:'The article explains independently pinned Ed25519 signatures, signed review bundles and why an operator must verify public HTTPS releases before making claims. It offers a reproducible example and distinguishes an editorial proposal from a hosted post.',
 source:'https://docs.github.com/en/pages',locale:'en',category:'guides'
};
const provider={endpoint:'https://reviewer.example/v1/chat/completions',
 model:'second-agent-model',key:'fake-test-provider-key-placeholder'};
const env={
 AGENT_REVIEW_ENDPOINT:provider.endpoint,
 AGENT_REVIEW_MODEL:provider.model,AGENT_REVIEW_KEY:provider.key,
 GITHUB_TOKEN:'must-never-be-used'
};
const findings='Findings: Explain the difference between cryptographic provenance and factual accuracy. Verification needed: independently inspect source links and verify the deployed HTTPS asset. Suggested changes: add limitations about identity and human moderation.';
const response=(answer=findings,status=200)=>new Response(
 JSON.stringify({choices:[{message:{content:answer}}]}),{status}
);
const keys=generateKeyPairSync('ed25519');
const privateKey=keys.privateKey.export({format:'pem',type:'pkcs8'});
const publicKey=keys.publicKey.export({format:'pem',type:'spki'});
const signed=(draft=article)=>createSignedAgentProposal({
 document:formatDraft(draft),ownerId:'publisher-owner',agentId:'writer-agent',privateKey
});
const request={proposal:signed(),publicKey,ownerId:'publisher-owner',
 agentId:'writer-agent',provider};

function fixture(){
 const directory=mkdtempSync(join(tmpdir(),'24gotop-agent-reviewer-'));
 const manuscript=join(directory,'signed.json'),pinned=join(directory,'public.pem');
 const output=join(directory,'second-review.json');
 writeFileSync(manuscript,JSON.stringify(signed()),{mode:0o600});
 writeFileSync(pinned,publicKey,{mode:0o600});
 return {directory,manuscript,pinned,output,args:[
  '--package',manuscript,'--public-key',pinned,
  '--owner-id','publisher-owner','--agent-id','writer-agent','--output',output,
  '--confirm-costs','--confirm-provider-data'
 ]};
}

test('second real agent API call yields a SHA-bound private advisory report, not approval',async()=>{
 const calls=[];
 const report=await reviewSignedAgentArticle({
  ...request,fetchImpl:async(url,opts)=>{calls.push({url,opts});return response();}
 });
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,provider.endpoint);
 assert.equal(calls[0].opts.redirect,'error');
 assert.equal(calls[0].opts.method,'POST');
 assert.equal(calls[0].opts.headers.Authorization,'Bearer '+provider.key);
 const payload=JSON.parse(calls[0].opts.body);
 assert.equal(payload.model,provider.model);
 assert.equal(payload.max_tokens,MAX_REVIEW_TOKENS);
 assert.match(payload.messages[0].content,/not an editor or publisher/i);
 assert.match(payload.messages[1].content,/untrusted_markdown/);
 assert.ok(payload.messages[1].content.includes(article.body));
 assert.ok(!calls[0].opts.body.includes(provider.key));
 assert.equal(report.kind,'24gotop-local-agent-peer-review');
 assert.equal(report.version,1);
 assert.equal(report.state,'advisory-only-human-editor-required');
 assert.equal(report.reviewerIdentity,'unverified-local-byok');
 assert.equal(report.findings,findings);
 assert.equal(report.manuscriptSha256,request.proposal.sha256);
 assert.equal(Object.hasOwn(report,'approved'),false);
 assert.equal(Object.hasOwn(report,'published'),false);
 assert.ok(!JSON.stringify(report).includes(article.body));
 assert.ok(!JSON.stringify(report).includes(provider.key));
});

test('invalid signature, wrong identity and unsafe manuscript prevent ANY provider contact',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;return response();};
 const wrong=generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'});
 for(const bad of [
  {...request,publicKey:wrong},
  {...request,ownerId:'other-owner'},
  {...request,proposal:{...request.proposal,document:request.proposal.document+'corrupted'}},
  {...request,proposal:signed({...article,body:article.body+'\nreviewer@example.com'})}
 ]){
  await assert.rejects(reviewSignedAgentArticle({...bad,fetchImpl}));
 }
 assert.equal(calls,0);
});

test('no redirect, oversized stream or provider error is accepted as a model review',async()=>{
 for(const bad of [
  response('HTTP error',401),
  new Response('<html>unexpected</html>'),
  response('too short'),
  response('Use sk-'+'x'.repeat(40)+' for the reviewer'),
  response('long '.repeat(1000))
 ]){
  await assert.rejects(reviewSignedAgentArticle({
   ...request,fetchImpl:async()=>bad
  }));
 }
 let reads=0,cancelled=false;
 const reader={
  async read(){return {done:false,value:new Uint8Array(++reads===1?45000:22000)};},
  async cancel(){cancelled=true;},
  releaseLock(){}
 };
 await assert.rejects(reviewSignedAgentArticle({
  ...request,fetchImpl:async()=>({
   ok:true,redirected:false,body:{getReader:()=>reader}
  })
 }));
 assert.equal(reads,2);
 assert.equal(cancelled,true);
});

test('CLI requires both consent flags, creates protected non-overwriting report after one call',async()=>{
 const f=fixture();
 try{
  let calls=0;
  const fetchImpl=async()=>{calls++;return response();};
  await assert.rejects(runAgentPeerReviewCommand(
   f.args.filter(x=>x!=='--confirm-costs'),{env,fetchImpl}
  ));
  await assert.rejects(runAgentPeerReviewCommand(
   f.args.filter(x=>x!=='--confirm-provider-data'),{env,fetchImpl}
  ));
  await assert.rejects(runAgentPeerReviewCommand([...f.args,'--submit'],{env,fetchImpl}));
  assert.equal(calls,0);
  const output=await runAgentPeerReviewCommand(f.args,{env,fetchImpl});
  assert.match(output,/advisory only/);
  assert.match(output,/human editor/);
  assert.equal(calls,1);
  const report=JSON.parse(readFileSync(f.output,'utf8'));
  assert.equal(report.state,'advisory-only-human-editor-required');
  if(process.platform!=='win32')assert.equal(statSync(f.output).mode&0o077,0);
  await assert.rejects(runAgentPeerReviewCommand(f.args,{env,fetchImpl}),/EEXIST/);
  assert.equal(calls,1,'same output never costs a second model call');
 }finally{rmSync(f.directory,{recursive:true,force:true});}
});

test('CLI provider failure leaves no empty review report and no network retry',async()=>{
 const f=fixture();
 try{
  let calls=0;
  await assert.rejects(runAgentPeerReviewCommand(f.args,{
   env,fetchImpl:async()=>{calls++;return response('Bad',500);}
  }));
  assert.equal(calls,1);
  assert.equal(existsSync(f.output),false);
 }finally{rmSync(f.directory,{recursive:true,force:true});}
});

test('writing review to public repo is refused and no model call is made',async()=>{
 const f=fixture();
 try{
  const inside=fileURLToPath(new URL('../unsaved-review.json',import.meta.url));
  const args=f.args.map((item,i)=>i>0&&f.args[i-1]==='--output'?inside:item);
  let calls=0;
  await assert.rejects(runAgentPeerReviewCommand(args,{
   env,fetchImpl:async()=>{calls++;return response();}
  }));
  assert.equal(calls,0);
  assert.equal(existsSync(inside),false);
 }finally{rmSync(f.directory,{recursive:true,force:true});}
});

test('arguments and environment must not request public writes or remote insecure HTTP',()=>{
 assert.throws(()=>parseAgentReviewOptions(['--submit']));
 assert.throws(()=>parseAgentReviewOptions(['--package','file']));
 assert.throws(()=>parseAgentReviewOptions(['--confirm-costs','--confirm-costs']));
});
