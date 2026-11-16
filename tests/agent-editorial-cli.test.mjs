import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,chmodSync,statSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {formatDraft} from '../site/draft-lab-logic.js';
import {verifySignedAgentProposal} from '../packages/agents/editorial-proposal.mjs';

const cli=fileURLToPath(new URL('../packages/agents/editorial-cli.mjs',import.meta.url));
const draft={
 title:'Agent-generated guide to signed editorial handoffs',
 body:'An original technical review explains how local Ed25519 signatures work, when to reject invalid packages, and why moderation is separate.',
 locale:'en',category:'guides',source:'https://example.org/guide'
};
const run=(...args)=>spawnSync(process.execPath,[cli,...args],{
 encoding:'utf8',timeout:10000,maxBuffer:65536
});

test('agent CLI builds a real draft, generates protected keys, signs and verifies offline',()=>{
 const dir=mkdtempSync(join(tmpdir(),'24gotop-agent-editorial-'));
 try{
  const json=join(dir,'input.json'),md=join(dir,'draft.md');
  const priv=join(dir,'identity.private.pem'),pub=join(dir,'identity.public.pem');
  const output=join(dir,'signed-review.json');
  writeFileSync(json,JSON.stringify(draft),{mode:0o600});
  let result=run('keys','--private-out',priv,'--public-out',pub);
  assert.equal(result.status,0,result.stderr);
  assert.equal(existsSync(priv),true);
  assert.equal(existsSync(pub),true);
  if(process.platform!=='win32')assert.equal(statSync(priv).mode&0o077,0);
  result=run('draft','--input',json,'--output',md);
  assert.equal(result.status,0,result.stderr);
  assert.equal(readFileSync(md,'utf8'),formatDraft(draft));
  result=run('sign','--draft',md,'--private-key',priv,
   '--owner-id','team-owner','--agent-id','article-agent','--output',output);
  assert.equal(result.status,0,result.stderr);
  assert.equal(existsSync(output),true);
  if(process.platform!=='win32')assert.equal(statSync(output).mode&0o077,0);
  const signed=JSON.parse(readFileSync(output,'utf8'));
  const checked=verifySignedAgentProposal(JSON.stringify(signed),{
   publicKey:readFileSync(pub,'utf8'),expectedOwnerId:'team-owner',
   expectedAgentId:'article-agent'
  });
  assert.deepEqual(checked.draft,draft);
  result=run('verify','--package',output,'--public-key',pub,
   '--owner-id','team-owner','--agent-id','article-agent');
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/Verified owner-pinned local signature/);
  assert.match(result.stdout,/No account authentication, moderation or publication/);
  assert.doesNotMatch(result.stdout,/original technical review|BEGIN PRIVATE KEY|example.org/);
  result=run('sign','--draft',md,'--private-key',priv,
   '--owner-id','team-owner','--agent-id','article-agent','--output',output);
  assert.equal(result.status,1,'never overwrite an existing local signed proposal');
  assert.equal(readFileSync(output,'utf8'),JSON.stringify(signed)+'\n');
  assert.doesNotMatch(result.stderr,/BEGIN PRIVATE KEY|Ed25519 signatures work/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('agent CLI refuses secret-looking drafts until the operator explicitly acknowledges risk',()=>{
 const dir=mkdtempSync(join(tmpdir(),'24gotop-agent-sensitive-'));
 try{
  const priv=join(dir,'local.private.pem'),pub=join(dir,'local.public.pem');
  const md=join(dir,'draft.md'),out=join(dir,'proposal.json');
  let result=run('keys','--private-out',priv,'--public-out',pub);
  assert.equal(result.status,0);
  const risky={...draft,body:draft.body+'\nContact reviewer at reviewer@example.org.'};
  writeFileSync(md,formatDraft(risky),{mode:0o600});
  result=run('sign','--draft',md,'--private-key',priv,
   '--owner-id','team-owner','--agent-id','article-agent','--output',out);
  assert.equal(result.status,1,'signing is not silent on common private data');
  assert.equal(existsSync(out),false);
  assert.doesNotMatch(result.stderr,/reviewer@example.org/);
  result=run('sign','--draft',md,'--private-key',priv,
   '--owner-id','team-owner','--agent-id','article-agent',
   '--output',out,'--acknowledge-sensitive');
  assert.equal(result.status,0,result.stderr);
  result=run('verify','--package',out,'--public-key',pub,
   '--owner-id','other-owner','--agent-id','article-agent');
  assert.equal(result.status,1,'a wrong externally pinned identity is not trusted');
  assert.doesNotMatch(result.stderr,/reviewer@example.org|PRIVATE KEY/);
  if(process.platform!=='win32'){
   const other=join(dir,'other.json');
   chmodSync(priv,0o644);
   result=run('sign','--draft',md,'--private-key',priv,
    '--owner-id','team-owner','--agent-id','article-agent',
    '--output',other,'--acknowledge-sensitive');
   assert.equal(result.status,1,'world-readable signing key must be rejected');
   assert.equal(existsSync(other),false);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('agent-draft builder rejects extra author privilege fields and incomplete data',()=>{
 const dir=mkdtempSync(join(tmpdir(),'24gotop-agent-fields-'));
 try{
  const path=join(dir,'payload.json'),out=join(dir,'draft.md');
  writeFileSync(path,JSON.stringify({...draft,authorType:'verified-agent'}));
  const result=run('draft','--input',path,'--output',out);
  assert.equal(result.status,1);
  assert.equal(existsSync(out),false);
  assert.doesNotMatch(result.stderr,/verified-agent/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
