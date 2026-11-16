import test from 'node:test';
import {generateKeyPairSync} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseDraftFile} from '../site/draft-lab-logic.js';
import {generateAgentArticleDraft,validateAgentGenerationInput,
 validateAgentGeneratorProvider,AGENT_GENERATOR_MAX_TOKENS} from '../packages/agents/draft-generator.mjs';
import {runAgentDraftGeneratorCommand} from '../packages/agents/draft-generator-cli.mjs';
import {createSignedAgentProposal} from '../packages/agents/editorial-proposal.mjs';
import {prepareGitHubAgentProposal} from '../packages/agents/github-proposal.mjs';

const input={
 title:'How to verify a GitHub Pages article delivery with source hashes',
 brief:'Explain how to check the real deployed HTML response instead of trusting a green build badge.',
 locale:'en',category:'guides',
 source:'https://docs.github.com/en/pages',
 evidence:'The Pages workflow can compare the fetched canonical HTTPS bytes with the reviewed source file.'
};
const provider={endpoint:'https://provider.example/v1/chat/completions',
 model:'demo-model',key:'provider-test-key-placeholder'};
const output='Compare the checked-in article HTML with the independently fetched canonical page. Record the exact commit and Pages run. This is a verification technique, not evidence of search indexing.';
const success=()=>new Response(JSON.stringify({choices:[{message:{content:output}}]}),{
 status:200,headers:{'Content-Type':'application/json'}
});

test('real single provider response becomes canonical local Draft Lab manuscript',async()=>{
 const calls=[];
 const fetchImpl=async(url,opts)=>{calls.push({url,opts});return success();};
 const markdown=await generateAgentArticleDraft({input,provider,fetchImpl});
 assert.deepEqual(parseDraftFile(markdown),{
  title:input.title,body:output,locale:'en',category:'guides',source:input.source
 });
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,provider.endpoint);
 assert.equal(calls[0].opts.method,'POST');
 assert.equal(calls[0].opts.redirect,'error');
 assert.match(calls[0].opts.headers.Authorization,/^Bearer provider-test-key/);
 const request=JSON.parse(calls[0].opts.body);
 assert.equal(request.model,provider.model);
 assert.equal(request.max_tokens,AGENT_GENERATOR_MAX_TOKENS);
 assert.ok(request.messages.some(x=>x.role==='system'&&/do not fabricate tests/i.test(x.content)));
 assert.ok(request.messages.some(x=>x.role==='user'&&x.content.includes(input.evidence)));
 assert.ok(!calls[0].opts.body.includes(provider.key));
 assert.ok(!markdown.includes(provider.key));
});

test('single call refuses remote plaintext, URL credentials, misleading evidence and secrets',async()=>{
 const badProviders=[
  {...provider,endpoint:'http://provider.example/v1/chat/completions'},
  {...provider,endpoint:'https://user:pass@provider.example/v1/chat/completions'},
  {...provider,endpoint:'https://provider.example/v1/chat/completions?key=secret'},
  {...provider,endpoint:'https://provider.example/v1/../private'},
  {...provider,key:''}
 ];
 for(const bad of badProviders)assert.throws(()=>validateAgentGeneratorProvider(bad));
 assert.equal(validateAgentGeneratorProvider({
  endpoint:'http://127.0.0.1:11434/v1/chat/completions',
  model:'local-llm',key:''
 }).key,'');
 assert.throws(()=>validateAgentGenerationInput({...input,ownerId:'admin'}));
 assert.throws(()=>validateAgentGenerationInput({...input,evidence:'Connect to reviewer@example.com to get details.'}));
 assert.throws(()=>validateAgentGenerationInput({...input,source:'https://user:pass@example.com/'}));
 let calls=0;
 await assert.rejects(generateAgentArticleDraft({
  input:{...input,evidence:'API token: github_pat_'+ 'a'.repeat(25)},
  provider,fetchImpl:async()=>{calls++;return success();}
 }));
 assert.equal(calls,0,'invalid sensitive input never reaches model provider');
});

test('bounded response rejects HTTP error, invalid JSON, oversized replies and secret output',async()=>{
 const failures=[
  new Response('No',{status:429}),
  new Response('<html>bad</html>',{status:200}),
  new Response(JSON.stringify({choices:[{message:{content:'too short'}}]}),{status:200}),
  new Response(JSON.stringify({choices:[{message:{content:'Use sk-'+'a'.repeat(30)}}]}),{status:200}),
  new Response('x'.repeat(70000),{status:200})
 ];
 for(const candidate of failures){
  await assert.rejects(generateAgentArticleDraft({
   input,provider,fetchImpl:async()=>candidate
  }));
 }
});

test('streamed provider output stops at cumulative 64 KiB and cancels early',async()=>{
 let reads=0,cancelled=false,released=false;
 const chunks=[new Uint8Array(40000),new Uint8Array(27000)];
 const reader={
  async read(){return {done:false,value:chunks[reads++]};},
  async cancel(){cancelled=true;},
  releaseLock(){released=true;}
 };
 const fake={ok:true,redirected:false,body:{getReader:()=>reader}};
 await assert.rejects(generateAgentArticleDraft({
  input,provider,fetchImpl:async()=>fake
 }));
 assert.equal(reads,2,'do not consume extra streamed chunks');
 assert.equal(cancelled,true,'stop oversized provider download immediately');
 assert.equal(released,true);
});

test('local CLI refuses unconsented requests before network, then writes new protected draft only',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'24gotop-ai-draft-'));
 try{
  const source=join(dir,'input.json'),dest=join(dir,'output.md');
  writeFileSync(source,JSON.stringify(input),{mode:0o600});
  const args=['--input',source,'--output',dest];
  let network=0;
  const fetchImpl=async()=>{network++;return success();};
  const env={
   AGENT_DRAFT_ENDPOINT:provider.endpoint,
   AGENT_DRAFT_MODEL:provider.model,AGENT_DRAFT_KEY:provider.key
  };
  await assert.rejects(runAgentDraftGeneratorCommand(args,{env,fetchImpl}));
  await assert.rejects(runAgentDraftGeneratorCommand([...args,'--confirm-costs'],{env,fetchImpl}));
  await assert.rejects(runAgentDraftGeneratorCommand([...args,'--confirm-provider-data'],{env,fetchImpl}));
  assert.equal(network,0);
  assert.equal(existsSync(dest),false);
  const command=[...args,'--confirm-provider-data','--confirm-costs'];
  const result=await runAgentDraftGeneratorCommand(command,{env,fetchImpl});
  assert.match(result,/No GitHub issue, database write or publication/);
  assert.equal(network,1);
  assert.equal(parseDraftFile(readFileSync(dest,'utf8')).body,output);
  if(process.platform!=='win32')assert.equal(statSync(dest).mode&0o077,0);
  await assert.rejects(runAgentDraftGeneratorCommand(command,{env,fetchImpl}),
   /EEXIST/,'must never overwrite an author-owned output file');
  assert.equal(readFileSync(dest,'utf8').includes(provider.key),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test('generated manuscript plugs into signed offline handoff and public-only GitHub review',async()=>{
 const markdown=await generateAgentArticleDraft({
  input,provider,fetchImpl:async()=>success()
 });
 const pair=generateKeyPairSync('ed25519');
 const signed=createSignedAgentProposal({
  document:markdown,
  ownerId:'publisher-owner',agentId:'technical-writer',
  privateKey:pair.privateKey
 });
 const issue=prepareGitHubAgentProposal(signed,{
  publicKey:pair.publicKey,
  expectedOwnerId:'publisher-owner',expectedAgentId:'technical-writer',
  summary:'A reproducible explanation of post-deploy verification and source hashing for technical articles. It clarifies the difference between a passing build and a delivered public HTTPS page.'
 });
 assert.match(issue.title,/Article proposal:/);
 assert.equal(issue.body.includes(output),false);
 assert.equal(issue.body.includes(input.source),false);
 assert.match(issue.body,/human maintainer must review/);
});
