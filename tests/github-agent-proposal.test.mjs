import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {formatDraft} from '../site/draft-lab-logic.js';
import {createSignedAgentProposal} from '../packages/agents/editorial-proposal.mjs';
import {prepareGitHubAgentProposal,submitGitHubAgentProposal} from '../packages/agents/github-proposal.mjs';
import {runGitHubProposalCommand} from '../packages/agents/github-proposal-cli.mjs';

const pair=generateKeyPairSync('ed25519');
const privateKey=pair.privateKey.export({type:'pkcs8',format:'pem'});
const publicKey=pair.publicKey.export({type:'spki',format:'pem'});
const source={
 title:'Reproducible AI-agent editorial integration without automatic publishing',
 body:'This original guide demonstrates safe agent-created draft handoffs, signature checks and the boundary between editorial proposals and live publication.',
 locale:'en',category:'guides',source:'https://example.org/nonpublic-review-source'
};
const summary='This guide covers the threat model and reproducible validation of a signed agent editorial handoff. Readers learn why signatures alone cannot grant publishing privileges.';
const makeSigned=(now=new Date())=>createSignedAgentProposal({
 document:formatDraft(source),ownerId:'team-owner',agentId:'writer-agent',privateKey,now
});
const build=(raw=makeSigned(),options={})=>prepareGitHubAgentProposal(raw,{
 publicKey,expectedOwnerId:'team-owner',expectedAgentId:'writer-agent',summary,...options
});
const response=(payload,status=200)=>new Response(JSON.stringify(payload),{status});
const issueUrl='https://github.com/rf24kja/24GO.top/issues/260';

test('signed agent handoff creates bounded public-only metadata, never the manuscript',()=>{
 const proposal=build();
 assert.equal(proposal.title,'Article proposal: '+source.title);
 assert.match(proposal.body,/human maintainer must review/);
 assert.match(proposal.body,/Original language: en/);
 assert.match(proposal.body,/24gotop-agent-proposal:[0-9a-f]{64}/);
 assert.ok(!proposal.body.includes(source.body));
 assert.ok(!proposal.body.includes(source.source));
 assert.ok(!proposal.body.includes(privateKey));
 assert.deepEqual(Object.keys(proposal).sort(),['body','sha256','title']);
});

test('wrong key, changed signature, stale package and sensitive public metadata are blocked',()=>{
 const signed=makeSigned();
 const other=generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'});
 assert.throws(()=>build(signed,{publicKey:other}));
 assert.throws(()=>build({...signed,document:signed.document+'modified'}));
 assert.throws(()=>build(makeSigned(new Date(Date.now()-8*86400000))));
 assert.throws(()=>build(makeSigned(new Date(Date.now()+600000))));
 assert.throws(()=>build(signed,{summary:'Contact reviewer@example.org. '+summary}));
 assert.throws(()=>build(signed,{summary:'Contact @everyone about this article. '+summary}));
 assert.throws(()=>build(signed,{summary:'A'.repeat(1201)}));
 assert.throws(()=>build(signed,{summary:'Too short'}));
 assert.throws(()=>build(signed,{expectedOwnerId:'different-owner'}));
});

test('GitHub issue submission searches once, creates only an editorial issue and never leaks draft',async()=>{
 const proposal=build();
 const calls=[];
 const fetchImpl=async(url,opts)=>{
  calls.push({url,opts});
  if(calls.length===1)return response({total_count:0,items:[]});
  return response({html_url:issueUrl},201);
 };
 const result=await submitGitHubAgentProposal({
  proposal,token:'github-test-token-placeholder',fetchImpl
 });
 assert.deepEqual(result,{url:issueUrl,created:true});
 assert.equal(calls.length,2);
 assert.match(calls[0].url,/^https:\/\/api\.github\.com\/search\/issues/);
 assert.equal(calls[0].opts.method,'GET');
 assert.equal(calls[1].url,'https://api.github.com/repos/rf24kja/24GO.top/issues');
 assert.equal(calls[1].opts.method,'POST');
 assert.equal(calls[1].opts.redirect,'error');
 const posted=JSON.parse(calls[1].opts.body);
 assert.equal(posted.title,proposal.title);
 assert.equal(posted.body,proposal.body);
 assert.ok(!posted.body.includes(source.body));
 assert.ok(!posted.body.includes(source.source));
 assert.ok(!posted.body.includes('github-test-token-placeholder'));
 assert.match(calls[1].opts.headers.Authorization,/^Bearer /);
});

test('existing proposal is deduplicated and no POST is made',async()=>{
 const proposal=build(),calls=[];
 const fetchImpl=async(url)=>{
  calls.push(url);
  return response({total_count:1,items:[{
   html_url:issueUrl,body:proposal.body
  }]});
 };
 const result=await submitGitHubAgentProposal({
  proposal,token:'github-test-token-placeholder',fetchImpl
 });
 assert.deepEqual(result,{url:issueUrl,created:false});
 assert.equal(calls.length,1);
});

test('API failure, untrusted issue URL and search pagination ambiguity fail closed',async()=>{
 const proposal=build();
 for(const failure of [
  ()=>response({message:'unauthorized'},401),
  ()=>response({total_count:30,items:[]}),
  ()=>response({total_count:1,items:[{body:proposal.body,html_url:'https://attacker.test/issues/1'}]})
 ]){
  let count=0;
  await assert.rejects(submitGitHubAgentProposal({
   proposal,token:'github-test-token-placeholder',
   fetchImpl:async()=>{count++;return failure();}
  }));
  assert.equal(count,1);
 }
 await assert.rejects(submitGitHubAgentProposal({
  proposal,token:'github-test-token-placeholder',
  fetchImpl:async(_,opts)=>opts.method==='GET'
   ?response({total_count:0,items:[]}):response({message:'forbidden'},403)
 }));
});

test('CLI preview has no network; live submission requires both explicit consent and token',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'24gotop-github-proposal-'));
 try{
  const signed=join(dir,'signed.json'),pub=join(dir,'owner-public.pem');
  const description=join(dir,'summary.txt');
  writeFileSync(signed,JSON.stringify(makeSigned()),{mode:0o600});
  writeFileSync(pub,publicKey,{mode:0o644});
  writeFileSync(description,summary,{mode:0o600});
  const args=['--package',signed,'--public-key',pub,'--owner-id','team-owner',
   '--agent-id','writer-agent','--summary-file',description];
  let network=0;
  const noFetch=async()=>{network++;throw new Error('should not fetch');};
  const preview=await runGitHubProposalCommand(args,{env:{},fetchImpl:noFetch});
  assert.match(preview,/LOCAL PUBLIC ISSUE PREVIEW/);
  assert.match(preview,/Article proposal:/);
  assert.ok(!preview.includes(source.body));
  assert.equal(network,0);
  await assert.rejects(runGitHubProposalCommand([...args,'--submit'],{
   env:{GITHUB_TOKEN:'github-test-token-placeholder'},fetchImpl:noFetch
  }));
  await assert.rejects(runGitHubProposalCommand([...args,'--submit','--confirm-public'],{
   env:{},fetchImpl:noFetch
  }));
  assert.equal(network,0);
  const result=await runGitHubProposalCommand([...args,'--submit','--confirm-public'],{
   env:{GITHUB_TOKEN:'github-test-token-placeholder'},
   fetchImpl:async(_,opts)=>opts.method==='GET'
    ?response({total_count:0,items:[]}):response({html_url:issueUrl},201)
  });
  assert.match(result,/Created PUBLIC GitHub editorial issue/);
  assert.match(result,/No article was published/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
