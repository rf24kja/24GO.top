import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,
 statSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {parseDraftFile} from '../site/draft-lab-logic.js';
import {verifySignedAgentProposal} from '../packages/agents/editorial-proposal.mjs';
import {parseAgentPrepareArgs,validateAgentPrepareJob,
 runAgentPrepareCommand} from '../packages/agents/editorial-runner.mjs';
const provider={
 AGENT_DRAFT_ENDPOINT:'https://llm.example/v1/chat/completions',
 AGENT_DRAFT_MODEL:'local-test-model',
 AGENT_DRAFT_KEY:'placeholder-provider-secret-for-tests',
 GITHUB_TOKEN:'unexpected-github-token-must-remain-unused'
};
const source='https://docs.github.com/en/pages';
const article={
 title:'Reproducible documentation and release verification for AI authors',
 brief:'Explain how to validate an independent public article deployment, distinguishing source changes from live HTTPS receipts.',
 locale:'en',category:'guides',source,
 evidence:'The signed editorial handoff and canonical source comparison must be checked independently before accepting a public release.'
};
const summary='This original technical guide explains how to verify a static publication by checking reviewed source, HTTPS delivery and a specific release receipt. Its results are not a claim of search indexing.';
const answer='A useful procedure begins with a source commit and a reviewed change. Compare the deployed canonical HTTPS page to the exact reviewed bytes. Record limitations; a passing CI badge is not evidence that search engines indexed the content.';
const job={article,publicSummary:summary};
const keys=()=>generateKeyPairSync('ed25519');
const response=(text=answer,status=200)=>new Response(
 JSON.stringify({choices:[{message:{content:text}}]}),{status}
);
function withFiles(callback){
 const dir=mkdtempSync(join(tmpdir(),'24gotop-agent-prepare-'));
 const pair=keys();
 const privateFile=join(dir,'agent.private.pem');
 const publicFile=join(dir,'agent.public.pem');
 const jobFile=join(dir,'job.json');
 const outputDir=join(dir,'new-review');
 writeFileSync(privateFile,pair.privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600});
 writeFileSync(publicFile,pair.publicKey.export({format:'pem',type:'spki'}),{mode:0o600});
 writeFileSync(jobFile,JSON.stringify(job),{mode:0o600});
 const args=['--job',jobFile,'--output-dir',outputDir,'--private-key',privateFile,
  '--public-key',publicFile,'--owner-id','team-owner','--agent-id','technical-agent',
  '--confirm-costs','--confirm-provider-data'];
 return Promise.resolve().then(()=>callback({
  dir,args,jobFile,privateFile,publicFile,outputDir
 })).finally(()=>rmSync(dir,{force:true,recursive:true}));
}
test('single run yields a real, private canonical manuscript and verified signed preview',async()=>{
 await withFiles(async({args,outputDir,publicFile})=>{
  let calls=0,seen;
  const result=await runAgentPrepareCommand(args,{env:provider,
   fetchImpl:async(url,opts)=>{
    calls++;seen={url,opts};return response();
   }
  });
  assert.match(result,/awaiting human review/i);
  assert.match(result,/No GitHub issue/);
  assert.equal(calls,1);
  assert.equal(seen.url,provider.AGENT_DRAFT_ENDPOINT);
  assert.equal(seen.opts.method,'POST');
  assert.equal(seen.opts.redirect,'error');
  const request=JSON.parse(seen.opts.body);
  assert.equal(request.max_tokens,1800);
  assert.equal(request.model,provider.AGENT_DRAFT_MODEL);
  assert.ok(!seen.opts.body.includes(provider.AGENT_DRAFT_KEY));
  const draft=readFileSync(join(outputDir,'draft.md'),'utf8');
  assert.equal(parseDraftFile(draft).body,answer);
  const signed=JSON.parse(readFileSync(join(outputDir,'signed-proposal.json'),'utf8'));
  const key=readFileSync(publicFile,'utf8');
  const verified=verifySignedAgentProposal(signed,{
   publicKey:key,expectedOwnerId:'team-owner',expectedAgentId:'technical-agent'
  });
  assert.deepEqual(verified.draft,parseDraftFile(draft));
  const preview=JSON.parse(readFileSync(join(outputDir,'issue-preview.json'),'utf8'));
  const receipt=JSON.parse(readFileSync(join(outputDir,'receipt.json'),'utf8'));
  assert.match(preview.title,/Article proposal:/);
  assert.match(preview.body,/human maintainer must review/);
  assert.ok(!preview.body.includes(answer));
  assert.ok(!preview.body.includes(source));
  assert.ok(!preview.body.includes(provider.AGENT_DRAFT_KEY));
  assert.equal(receipt.draftSha256,verified.sha256);
  assert.equal(receipt.state,'awaiting-human-review');
  assert.equal(receipt.submitted,false);
  assert.equal(receipt.published,false);
  assert.equal(readFileSync(join(outputDir,'public-summary.txt'),'utf8'),summary);
  for(const file of ['draft.md','signed-proposal.json','public-summary.txt','issue-preview.json','receipt.json']){
   if(process.platform!=='win32')assert.equal(statSync(join(outputDir,file)).mode&0o077,0,file);
  }
  if(process.platform!=='win32')assert.equal(statSync(outputDir).mode&0o077,0);
 });
});

test('no duplicate job execution, provider charge or manuscript overwrite',async()=>{
 await withFiles(async({args,outputDir})=>{
  let calls=0;
  const fetchImpl=async()=>{calls++;return response();};
  await runAgentPrepareCommand(args,{env:provider,fetchImpl});
  const first=readFileSync(join(outputDir,'draft.md'),'utf8');
  await assert.rejects(runAgentPrepareCommand(args,{env:provider,fetchImpl}),/EEXIST/);
  assert.equal(calls,1,'existing review bundle prevents duplicate model call');
  assert.equal(readFileSync(join(outputDir,'draft.md'),'utf8'),first);
 });
});

test('no inference when cost/data consent, key pin or job validation fails',async()=>{
 await withFiles(async({args,jobFile,publicFile,outputDir})=>{
  let calls=0;
  const fetchImpl=async()=>{calls++;return response();};
  for(const rejected of [
   args.filter(x=>x!=='--confirm-costs'),
   args.filter(x=>x!=='--confirm-provider-data'),
   [...args,'--submit'],
   [...args,'--confirm-costs'],
   [...args,'--unexpected']
  ])await assert.rejects(runAgentPrepareCommand(rejected,{env:provider,fetchImpl}));
  const other=keys();
  writeFileSync(publicFile,other.publicKey.export({format:'pem',type:'spki'}));
  await assert.rejects(runAgentPrepareCommand(args,{env:provider,fetchImpl}));
  const actual=keys();
  // Key-pair mismatch is always checked before model invocation.
  writeFileSync(publicFile,actual.publicKey.export({format:'pem',type:'spki'}));
  await assert.rejects(runAgentPrepareCommand(args,{env:provider,fetchImpl}));
  writeFileSync(jobFile,JSON.stringify({...job,authorType:'privileged'}));
  await assert.rejects(runAgentPrepareCommand(args,{env:provider,fetchImpl}));
  writeFileSync(jobFile,JSON.stringify({
   ...job,article:{...article,evidence:'Contact reviewer@example.com to continue. '+article.evidence}
  }));
  await assert.rejects(runAgentPrepareCommand(args,{env:provider,fetchImpl}));
  assert.equal(calls,0);
  assert.equal(existsSync(outputDir),false);
 });
});

test('provider errors leave no accepted bundle and do not create GitHub issues',async()=>{
 await withFiles(async({args,outputDir})=>{
  let calls=0;
  await assert.rejects(runAgentPrepareCommand(args,{env:provider,
   fetchImpl:async()=>{calls++;return response(answer,403);}
  }));
  assert.equal(calls,1);
  assert.equal(existsSync(outputDir),false,'empty reserved dir removed on error');
 });
});

test('output path inside public Git checkout is always forbidden before paid calls',async()=>{
 await withFiles(async({args})=>{
  const repoRoot=fileURLToPath(new URL('../',import.meta.url));
  const output=join(repoRoot,'should-not-create-private-draft');
  const invalid=args.map((arg,i)=>i>0&&args[i-1]==='--output-dir'?output:arg);
  let calls=0;
  await assert.rejects(runAgentPrepareCommand(invalid,{
   env:provider,fetchImpl:async()=>{calls++;return response();}
  }));
  assert.equal(calls,0);
  assert.equal(existsSync(output),false);
 });
});

test('options and job formats are strict and exclude publication assertions',()=>{
 assert.throws(()=>parseAgentPrepareArgs(['--job','x']));
 assert.throws(()=>validateAgentPrepareJob({...job,automaticPublication:true}));
 assert.throws(()=>validateAgentPrepareJob({...job,publicSummary:'@everyone '+summary}));
 assert.throws(()=>validateAgentPrepareJob({...job,publicSummary:'too short'}));
 assert.throws(()=>validateAgentPrepareJob({...job,publicSummary:'send to user@example.com '+summary}));
});
