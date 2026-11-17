import test from 'node:test';
import assert from 'node:assert/strict';
import {
 existsSync,mkdirSync,mkdtempSync,readdirSync,readFileSync,rmSync,
 statSync,writeFileSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync} from 'node:crypto';
import {parseDraftFile} from '../site/draft-lab-logic.js';
import {verifySignedAgentProposal} from '../packages/agents/editorial-proposal.mjs';
import {prepareAgentArticlePublication} from '../packages/agents/article-publication.mjs';
import {
 createAgentAuthoringSession,handleAgentAuthoringMcpRequest
} from '../packages/mcp/authoring-stdio.mjs';

const NOW=new Date('2026-11-17T16:30:00Z');
const PUBLICATION_TIME='2026-11-17T16:25:00Z';
const OWNER='team-owner',AGENT='technical-writer';
const SUMMARY='This technical guide explains a reproducible method for checking a reviewed article against its canonical public HTTPS release and its exact deployment receipt.';
const ARTICLE={
 title:'A reproducible guide to verifying a public article release',
 brief:'Explain how to verify a reviewed article after a static website deployment. Describe the exact source, canonical URL and release receipt checks.',
 locale:'en',category:'guides',source:'https://docs.github.com/en/pages',
 evidence:'GitHub Pages deployment can be checked against the exact reviewed commit. A successful workflow alone does not prove indexing, readership or AI citations.'
};
const INPUT={
 article:ARTICLE,publicSummary:SUMMARY,publicationTime:PUBLICATION_TIME,
 confirmCosts:true,confirmProviderData:true
};
const ANSWER='## Overview\n\nA reliable release verification procedure begins with a reviewed source commit. Fetch the canonical HTTPS page after deployment and compare the delivered content with the expected source. Record the exact release identifier and explain what the check does not prove.\n\n## Safe verification\n\nCheck redirects, canonical metadata, essential assets and the final public response. Do not treat a green CI badge as proof of indexing or readership.';
const PROVIDER={
 AGENT_DRAFT_ENDPOINT:'https://llm.example/v1/chat/completions',
 AGENT_DRAFT_MODEL:'test-model',
 AGENT_DRAFT_KEY:'test-provider-secret-123456789'
};
const modelResponse=(body=ANSWER,status=200)=>new Response(
 JSON.stringify({choices:[{message:{content:body}}]}),
 {status,headers:{'Content-Type':'application/json'}}
);

async function withFixture(callback){
 const root=mkdtempSync(join(tmpdir(),'24gotop-authoring-mcp-'));
 const identity=generateKeyPairSync('ed25519');
 const privateKeyPath=join(root,'writer.private.pem');
 const publicKeyPath=join(root,'writer.public.pem');
 const outputRoot=join(root,'private-output');
 mkdirSync(outputRoot,{mode:0o700});
 writeFileSync(privateKeyPath,identity.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 writeFileSync(publicKeyPath,identity.publicKey.export({type:'spki',format:'pem'}),{mode:0o644});
 const env={
  ...PROVIDER,MCP_AGENT_OUTPUT_ROOT:outputRoot,
  MCP_AGENT_PRIVATE_KEY:privateKeyPath,MCP_AGENT_PUBLIC_KEY:publicKeyPath,
  MCP_AGENT_OWNER_ID:OWNER,MCP_AGENT_ID:AGENT
 };
 try{await callback({root,identity,privateKeyPath,publicKeyPath,outputRoot,env});}
 finally{rmSync(root,{recursive:true,force:true});}
}

test('connected MCP agent generates, signs and previews one complete private article bundle',async()=>{
 await withFixture(async({identity,outputRoot,env})=>{
  let calls=0,seen;
  const session=createAgentAuthoringSession({
   env,now:()=>new Date(NOW),localMainShaProvider:()=> 'a'.repeat(40),
   fetchImpl:async(url,options)=>{calls++;seen={url,options};return modelResponse();}
  });
  const result=await session.prepare(INPUT);
  assert.equal(calls,1);
  assert.equal(seen.url,PROVIDER.AGENT_DRAFT_ENDPOINT);
  assert.equal(seen.options.method,'POST');
  assert.equal(seen.options.redirect,'error');
  const request=JSON.parse(seen.options.body);
  assert.equal(request.model,PROVIDER.AGENT_DRAFT_MODEL);
  assert.equal(request.max_tokens,1800);
  assert.ok(!seen.options.body.includes(PROVIDER.AGENT_DRAFT_KEY));
  assert.equal(result.state,'private-draft-awaiting-human-review');
  assert.equal(result.sourceMainSha,'a'.repeat(40));
  assert.equal(result.published,false);
  assert.equal(result.submitted,false);
  assert.match(result.canonicalUrl,/^https:\/\/24go\.top\/engineering\/ai-agent-/);
  assert.equal(result.files.length,7);
  assert.equal(readdirSync(outputRoot).length,1);
  assert.ok(!JSON.stringify(result).includes(ANSWER));
  assert.ok(!JSON.stringify(result).includes(PROVIDER.AGENT_DRAFT_KEY));
  assert.ok(!JSON.stringify(result).includes(identity.privateKey.export({type:'pkcs8',format:'pem'}).toString()));
  assert.equal(existsSync(join(result.workspacePath,'job.json')),false);
  const draft=readFileSync(result.draftPath,'utf8');
  assert.equal(parseDraftFile(draft).body,ANSWER);
  const signed=readFileSync(result.signedProposalPath,'utf8');
  const verified=verifySignedAgentProposal(signed,{
   publicKey:identity.publicKey,expectedOwnerId:OWNER,expectedAgentId:AGENT
  });
  assert.equal(verified.draft.title,ARTICLE.title);
  assert.equal(verified.draft.body,ANSWER);
  const publication=prepareAgentArticlePublication({
   raw:signed,publicKey:identity.publicKey,expectedOwnerId:OWNER,
   expectedAgentId:AGENT,summary:SUMMARY,publicationTime:PUBLICATION_TIME,now:NOW
  });
  assert.equal(publication.publicationSha256,result.publicationSha256);
  assert.equal(publication.canonicalUrl,result.canonicalUrl);
  assert.equal(publication.manuscriptSha256,result.manuscriptSha256);
  const receipt=JSON.parse(readFileSync(result.receiptPath,'utf8'));
  assert.equal(receipt.state,'awaiting-human-review');
  assert.equal(receipt.published,false);
  assert.equal(receipt.submitted,false);
  for(const path of [result.draftPath,result.signedProposalPath,result.publicSummaryPath,result.receiptPath]){
   if(process.platform!=='win32')assert.equal(statSync(path).mode&0o077,0);
  }
  if(process.platform!=='win32')assert.equal(statSync(result.outputDir).mode&0o077,0);
 });
});

test('one MCP process permits one paid generation and never retries ambiguous model failures',async()=>{
 await withFixture(async({env})=>{
  let calls=0;
  const session=createAgentAuthoringSession({
   env,now:()=>new Date(NOW),localMainShaProvider:()=> 'a'.repeat(40),
   fetchImpl:async()=>{calls++;return modelResponse();}
  });
  await session.prepare(INPUT);
  await assert.rejects(session.prepare(INPUT),TypeError);
  assert.equal(calls,1);
 });
});

test('cost, provider-data consent, publication date, source and public summary are validated before inference',async()=>{
 await withFixture(async({env,outputRoot})=>{
  let calls=0;
  const session=createAgentAuthoringSession({
   env,now:()=>new Date(NOW),localMainShaProvider:()=> 'a'.repeat(40),
   fetchImpl:async()=>{calls++;return modelResponse();}
  });
  const invalid=[
   {...INPUT,confirmCosts:false},
   {...INPUT,confirmProviderData:false},
   {...INPUT,publicationTime:'2026-11-01T12:00:00Z'},
   {...INPUT,publicationTime:'tomorrow'},
   {...INPUT,publicSummary:'too short'},
   {...INPUT,article:{...ARTICLE,source:'http://docs.example.org'}},
   {...INPUT,article:{...ARTICLE,privateField:'not allowed'}}
  ];
  for(const request of invalid)await assert.rejects(session.prepare(request));
  assert.equal(calls,0);
  assert.equal(readdirSync(outputRoot).length,0);
 });
});

test('wrong pinned key pair is rejected before model request and leaves no bundle',async()=>{
 await withFixture(async({env,publicKeyPath,outputRoot})=>{
  const other=generateKeyPairSync('ed25519');
  writeFileSync(publicKeyPath,other.publicKey.export({type:'spki',format:'pem'}),{mode:0o600});
  let calls=0;
  const session=createAgentAuthoringSession({
   env,now:()=>new Date(NOW),localMainShaProvider:()=> 'a'.repeat(40),
   fetchImpl:async()=>{calls++;return modelResponse();}
  });
  await assert.rejects(session.prepare(INPUT));
  assert.equal(calls,0);
  assert.equal(readdirSync(outputRoot).length,0);
 });
});

test('authoring MCP rejects repository paths, insecure output roots and remote HTTP model endpoints',async()=>{
 await withFixture(async({env,root,outputRoot})=>{
  assert.throws(()=>createAgentAuthoringSession({
   env:{...env,MCP_AGENT_OUTPUT_ROOT:new URL('../',import.meta.url).pathname}
  }),TypeError);
  const link=join(root,'output-link');
  try{
   const {symlinkSync}=await import('node:fs');
   symlinkSync(outputRoot,link,'dir');
   assert.throws(()=>createAgentAuthoringSession({
    env:{...env,MCP_AGENT_OUTPUT_ROOT:link}
   }),TypeError);
  }catch(error){
   if(error?.code!=='EPERM'&&error?.code!=='EACCES'&&error?.code!=='ENOTSUP')throw error;
  }
  assert.throws(()=>createAgentAuthoringSession({
   env:{...env,AGENT_DRAFT_ENDPOINT:'http://remote.example/v1/chat/completions'}
  }),TypeError);
 });
});

test('authoring MCP rejects a moving local source snapshot after generation',async()=>{
 await withFixture(async({env,outputRoot})=>{
  let reads=0,calls=0;
  const session=createAgentAuthoringSession({
   env,now:()=>new Date(NOW),
   localMainShaProvider:()=>++reads===1?'a'.repeat(40):'b'.repeat(40),
   fetchImpl:async()=>{calls++;return modelResponse();}
  });
  await assert.rejects(session.prepare(INPUT),TypeError);
  assert.equal(reads,2);
  assert.equal(calls,1);
  assert.equal(readdirSync(outputRoot).length,1,'private artifacts remain for manual inspection');
 });
});

test('provider failure is one attempt and removes an empty private workspace',async()=>{
 await withFixture(async({env,outputRoot})=>{
  let calls=0;
  const session=createAgentAuthoringSession({
   env,now:()=>new Date(NOW),localMainShaProvider:()=> 'a'.repeat(40),
   fetchImpl:async()=>{calls++;return modelResponse('',503);}
  });
  await assert.rejects(session.prepare(INPUT));
  assert.equal(calls,1);
  assert.equal(readdirSync(outputRoot).length,0);
 });
});

test('MCP exposes only the bounded authoring tool and never an article or GitHub write tool',async()=>{
 await withFixture(async({env})=>{
  const session=createAgentAuthoringSession({
   env,now:()=>new Date(NOW),localMainShaProvider:()=> 'a'.repeat(40),fetchImpl:async()=>modelResponse()
  });
  const listed=handleAgentAuthoringMcpRequest({
   jsonrpc:'2.0',id:1,method:'tools/list'
  },session);
  assert.deepEqual(listed.result.tools.map(tool=>tool.name),['prepare_article_draft']);
  const definition=listed.result.tools[0];
  assert.equal(definition.inputSchema.additionalProperties,false);
  assert.equal(definition.inputSchema.properties.confirmCosts.const,true);
  assert.equal(definition.inputSchema.properties.confirmProviderData.const,true);
  const initialized=handleAgentAuthoringMcpRequest({
   jsonrpc:'2.0',id:2,method:'initialize',params:{protocolVersion:'2025-06-18'}
  },session);
  assert.equal(initialized.result.serverInfo.name,'24gotop-local-agent-authoring');
 });
});
