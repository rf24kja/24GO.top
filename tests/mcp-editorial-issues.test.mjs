import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PassThrough} from 'node:stream';
import {formatDraft} from '../site/draft-lab-logic.js';
import {createSignedAgentProposal} from '../packages/agents/editorial-proposal.mjs';
import {
 createEditorialMcpSession,createEditorialMcpSessionFromEnv,
 handleEditorialMcpRequest,runEditorialMcpStdio
} from '../packages/mcp/editorial-stdio.mjs';

const pair=generateKeyPairSync('ed25519');
const publicKey=pair.publicKey.export({type:'spki',format:'pem'});
const document=formatDraft({
 title:'Safely integrating AI editors with a public contribution workflow',
 body:'A reproducible technical guide about signed local agent drafts and independent fact checking. This is an original test-only manuscript and is never posted to a live API.',
 locale:'en',category:'guides',source:'https://example.org/documentation'
});
const summary='An original technical summary about human-reviewed editorial proposals, bounded public metadata and the difference between submitting a proposal and actually publishing an article.';
const packageText=()=>JSON.stringify(createSignedAgentProposal({
 document,ownerId:'team-owner',agentId:'writer-agent',privateKey:pair.privateKey
}));
const params=()=>({
 raw:packageText(),publicKey,expectedOwnerId:'team-owner',
 expectedAgentId:'writer-agent',summary
});
const rpc=(name,args={})=>({jsonrpc:'2.0',id:1,method:'tools/call',
 params:{name,arguments:args}});
const content=result=>JSON.parse(result.result.content[0].text);
const response=(payload,status=200)=>new Response(JSON.stringify(payload),{status});

test('default editorial MCP previews independently pinned public metadata without network',()=>{
 let network=0;
 const session=createEditorialMcpSession({...params(),
  fetchImpl:async()=>{network++;throw Error('no network');}});
 const list=handleEditorialMcpRequest({jsonrpc:'2.0',method:'tools/list'},session);
 assert.deepEqual(list.result.tools.map(x=>x.name),['preview_editorial_issue']);
 const preview=content(handleEditorialMcpRequest(rpc('preview_editorial_issue'),session));
 assert.equal(preview.published,false);
 assert.equal(preview.sha256.length,64);
 assert.match(preview.body,/human maintainer must review/);
 assert.ok(!preview.body.includes(document));
 assert.ok(!preview.body.includes('example.org/documentation'));
 assert.equal(network,0);
 assert.equal(handleEditorialMcpRequest(rpc('submit_reviewed_editorial_issue',{
  sha256:preview.sha256,confirmPublic:true}),session).result.isError,true);
 assert.equal(network,0);
});

test('operator must pin matching digest, consent and token before enabling a public issue write',()=>{
 const base=params();
 const proposal=createEditorialMcpSession(base).proposal;
 for(const cfg of [
  {allowPublic:true,approvedSha256:'0'.repeat(64),token:'github-placeholder-token'},
  {allowPublic:true,approvedSha256:proposal.sha256,token:null},
  {allowPublic:true,approvedSha256:proposal.sha256,token:'token with spaces'},
  {allowPublic:'true',approvedSha256:proposal.sha256,token:'github-placeholder-token'}
 ])assert.throws(()=>createEditorialMcpSession({...base,...cfg}),TypeError);
 assert.throws(()=>createEditorialMcpSession({...base,expectedOwnerId:'wrong-owner'}),TypeError);
 assert.throws(()=>createEditorialMcpSession({...base,publicKey:generateKeyPairSync('ed25519').publicKey}),TypeError);
 assert.throws(()=>createEditorialMcpSession({...base,raw:base.raw.replace('writer-agent','wrong-agent')}),TypeError);
});

test('reviewed digest permits one bounded GitHub Issue submission and never an article',async()=>{
 const calls=[];
 const original=params();
 const digest=createEditorialMcpSession(original).proposal.sha256;
 const session=createEditorialMcpSession({...original,allowPublic:true,
  approvedSha256:digest,token:'github-placeholder-token',
  fetchImpl:async(url,opts)=>{
   calls.push({url,opts});
   if(opts.method==='GET')return response({total_count:0,items:[]});
   return response({html_url:'https://github.com/rf24kja/24GO.top/issues/260'},201);
  }
 });
 const tools=handleEditorialMcpRequest({jsonrpc:'2.0',method:'tools/list'},session);
 assert.equal(tools.result.tools.length,2);
 assert.equal((await handleEditorialMcpRequest(rpc('submit_reviewed_editorial_issue',{
  sha256:'0'.repeat(64),confirmPublic:true}),session)).result.isError,true);
 assert.equal(calls.length,0);
 const result=content(await handleEditorialMcpRequest(rpc('submit_reviewed_editorial_issue',{
  sha256:digest,confirmPublic:true}),session));
 assert.equal(result.published,false);
 assert.equal(result.issueUrl,'https://github.com/rf24kja/24GO.top/issues/260');
 assert.equal(result.created,true);
 assert.equal(calls.length,2);
 assert.equal(calls[0].opts.method,'GET');
 assert.equal(calls[1].opts.method,'POST');
 assert.equal(calls[1].url,'https://api.github.com/repos/rf24kja/24GO.top/issues');
 assert.ok(!calls[1].opts.body.includes(document));
 assert.ok(!calls[1].opts.body.includes('github-placeholder-token'));
 assert.equal((await handleEditorialMcpRequest(rpc('submit_reviewed_editorial_issue',{
  sha256:digest,confirmPublic:true}),session)).result.isError,true);
 assert.equal(calls.length,2);
});

test('a failed network attempt cannot be repeated in the same MCP process',async()=>{
 let network=0;
 const base=params(),digest=createEditorialMcpSession(base).proposal.sha256;
 const session=createEditorialMcpSession({...base,allowPublic:true,
  approvedSha256:digest,token:'github-placeholder-token',
  fetchImpl:async()=>{network++;throw Error('upstream details must not escape');}
 });
 for(let i=0;i<2;i++){
  const result=await handleEditorialMcpRequest(rpc('submit_reviewed_editorial_issue',{
   sha256:digest,confirmPublic:true
  }),session);
  assert.equal(result.result.isError,true);
  assert.ok(!JSON.stringify(result).includes('upstream details'));
 }
 assert.equal(network,1);
});

test('local files are pinned at start; no client-provided file path or key accepted',()=>{
 const dir=mkdtempSync(join(tmpdir(),'24gotop-editorial-mcp-'));
 try{
  const pkg=join(dir,'signed.json'),pub=join(dir,'trusted.pem'),sum=join(dir,'summary.txt');
  writeFileSync(pkg,packageText(),{mode:0o600});
  writeFileSync(pub,publicKey,{mode:0o600});
  writeFileSync(sum,summary,{mode:0o600});
  const env={
   MCP_AGENT_PACKAGE:pkg,MCP_AGENT_PUBLIC_KEY:pub,MCP_AGENT_PUBLIC_SUMMARY:sum,
   MCP_AGENT_OWNER_ID:'team-owner',MCP_AGENT_ID:'writer-agent'
  };
  const session=createEditorialMcpSessionFromEnv({env});
  assert.equal(session.canSubmit,false);
  assert.equal(handleEditorialMcpRequest(rpc('preview_editorial_issue',{
   package:join(dir,'other.json')
  }),session).result.isError,true);
  assert.throws(()=>createEditorialMcpSessionFromEnv({env:{
   ...env,MCP_AGENT_ALLOW_PUBLIC_ISSUE:'1',GITHUB_TOKEN:'github-placeholder-token'
  }}),TypeError);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('editorial MCP reuses bounded stdio parser, including async tool calls',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'24gotop-mcp-stream-'));
 const input=new PassThrough(),output=new PassThrough();let observed='';
 output.on('data',chunk=>{observed+=chunk.toString('utf8');});
 try{
  const pkg=join(dir,'signed.json'),pub=join(dir,'trusted.pem'),sum=join(dir,'summary.txt');
  writeFileSync(pkg,packageText(),{mode:0o600});
  writeFileSync(pub,publicKey,{mode:0o600});
  writeFileSync(sum,summary,{mode:0o600});
  const bridge=runEditorialMcpStdio({input,output,env:{
   MCP_AGENT_PACKAGE:pkg,MCP_AGENT_PUBLIC_KEY:pub,MCP_AGENT_PUBLIC_SUMMARY:sum,
   MCP_AGENT_OWNER_ID:'team-owner',MCP_AGENT_ID:'writer-agent'
  }});
  input.write(JSON.stringify(rpc('preview_editorial_issue'))+'\n');
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(observed,/public-issue-preview-only/);
  assert.ok(!observed.includes(document));
  bridge.close();
 }finally{input.destroy();output.destroy();rmSync(dir,{recursive:true,force:true});}
});
