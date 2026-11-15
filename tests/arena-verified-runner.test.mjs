import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtemp,writeFile,rm,readFile,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runVerifiedArenaSession} from '../packages/arena/verified-runner.mjs';
import {main as verifiedCli} from '../packages/arena/verified-cli.mjs';

const keys=()=>generateKeyPairSync('ed25519');
const pem=k=>k.privateKey.export({type:'pkcs8',format:'pem'});
const prompt='Explain how to isolate third-party static HTML/JS apps.';
function config(){
 const ka=keys(),kb=keys();
 return {
  agents:[
   {name:'Alice Agent',model:'model-one',endpoint:'https://example.net/v1/chat/completions',key:'secret-one'},
   {name:'Bob Agent',model:'model-two',endpoint:'https://example.net/v1/chat/completions',key:'secret-two'}
  ],
  identities:[
   {ownerId:'owner-alice',agentId:'alice-agent',privateKeyPem:pem(ka)},
   {ownerId:'owner-bob',agentId:'bob-agent',privateKeyPem:pem(kb)}
  ]
 };
}
test('real BYOK responses enter a dual signed authenticated match, compatible with browser Arena',async()=>{
 const base=config(),calls=[];
 const result=await runVerifiedArenaSession({
  ...base,prompt,rounds:2,fetcher:async(url,options)=>{
   const data=JSON.parse(options.body);
   calls.push({url,options,data});
   return new Response(JSON.stringify({
    choices:[{message:{content:data.model+' signed evaluation response '+calls.length}}]
   }),{status:200});
  }
 });
 assert.equal(result.source,'local-byok');
 assert.equal(result.rounds.length,2);
 assert.equal(result.rounds[1].responses.length,2);
 assert.deepEqual(result.agents.map(x=>x.name),['Alice Agent','Bob Agent']);
 assert.deepEqual(calls.map(x=>x.data.model),[
  'model-one','model-two','model-one','model-two'
 ]);
 assert.deepEqual(result.rounds.map(x=>x.responses.map(y=>y.agentId)),[['a','b'],['a','b']]);
 assert.ok(calls.every(x=>x.data.max_tokens===400));
 assert.ok(!JSON.stringify(result).includes('secret-one'));
 assert.ok(!JSON.stringify(result).includes('PRIVATE KEY'));
 assert.ok(!JSON.stringify(result).includes('owner-alice'));
 assert.ok(!JSON.stringify(result).includes('alice-agent'));
});
test('signed runner refuses duplicate agent names, duplicated identities and wrong key types before provider calls',async()=>{
 const base=config();let count=0;
 const spy=async()=>{count++;throw Error('no provider call expected')};
 for(const identities of [
  [base.identities[0],{...base.identities[1],agentId:'alice-agent'}],
  [base.identities[0],{...base.identities[1],ownerId:'!!!bad'}],
  [base.identities[0],{...base.identities[1],privateKeyPem:'not-a-private-key'}],
  [base.identities[0]]
 ]){
  await assert.rejects(runVerifiedArenaSession({
   prompt,agents:base.agents,identities,fetcher:spy
  }),TypeError);
 }
 assert.equal(count,0);
});
test('provider failure does not export incomplete match or expose provider response',async()=>{
 const base=config();
 await assert.rejects(runVerifiedArenaSession({
  ...base,prompt,fetcher:async()=>new Response('key secret-two leaked here',{status:401})
 }),error=>{
  assert.doesNotMatch(error.message,/secret-two|leaked|PRIVATE/);
  return true;
 });
});
test('verified CLI needs explicit billing opt-in, privately held valid owner key files and new-only output',async()=>{
 const base=config(),root=await mkdtemp(join(tmpdir(),'arena-verified-'));
 try{
  const file=join(root,'prompt.txt'),a=join(root,'agent-a.pem'),
   b=join(root,'agent-b.pem'),out=join(root,'match.json');
  await Promise.all([
   writeFile(file,prompt),writeFile(a,base.identities[0].privateKeyPem,{mode:0o600}),
   writeFile(b,base.identities[1].privateKeyPem,{mode:0o600})
  ]);
  const env={
   ARENA_A_NAME:'Alice Agent',ARENA_B_NAME:'Bob Agent',
   ARENA_A_ENDPOINT:base.agents[0].endpoint,
   ARENA_B_ENDPOINT:base.agents[1].endpoint,
   ARENA_A_MODEL:'model-one',ARENA_B_MODEL:'model-two',
   ARENA_A_KEY:'secret-one',ARENA_B_KEY:'secret-two',
   ARENA_A_OWNER_ID:'owner-alice',ARENA_B_OWNER_ID:'owner-bob',
   ARENA_A_AGENT_ID:'alice-agent',ARENA_B_AGENT_ID:'bob-agent',
   ARENA_A_SIGNING_KEY_FILE:a,ARENA_B_SIGNING_KEY_FILE:b
  };
  await assert.rejects(verifiedCli(['--prompt-file',file],env),/confirm-costs/);
  const original=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{
   calls++;
   return new Response(JSON.stringify({
    choices:[{message:{content:'real provider test result'}}]
   }),{status:200});
  };
  try{
   const args=['--prompt-file',file,'--rounds','1','--confirm-costs','--output',out];
   await verifiedCli(args,env);
   const transcript=JSON.parse(await readFile(out,'utf8'));
   assert.equal(transcript.rounds.length,1);
   assert.equal(calls,2);
   await assert.rejects(verifiedCli(args,env),/EEXIST/);
  }finally{globalThis.fetch=original;}
  if(process.platform!=='win32'){
   await chmod(a,0o644);
   await assert.rejects(verifiedCli(['--prompt-file',file,'--confirm-costs'],env),
    /mode 0600/);
  }
 }finally{await rm(root,{recursive:true,force:true});}
});
