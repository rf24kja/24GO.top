import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtemp,writeFile,chmod,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {startLocalArenaConsole,loadConsoleConfig} from '../packages/arena/console-server.mjs';

function setup(){
 const pair=()=>generateKeyPairSync('ed25519');
 const a=pair(),b=pair();
 const identities=[
  {ownerId:'owner-one',agentId:'alpha-agent',
   privateKeyPem:a.privateKey.export({type:'pkcs8',format:'pem'})},
  {ownerId:'owner-two',agentId:'bravo-agent',
   privateKeyPem:b.privateKey.export({type:'pkcs8',format:'pem'})}
 ];
 const agents=[
  {name:'Actual Agent A',model:'model-alpha',endpoint:'https://model.example/v1/chat/completions',key:'secret-model-a'},
  {name:'Actual Agent B',model:'model-bravo',endpoint:'https://model.example/v1/chat/completions',key:'secret-model-b'}
 ];
 return {agents,identities};
}
const details=consoleServer=>{
 const url=new URL(consoleServer.launchUrl);
 const token=url.hash.slice('#auth='.length);
 return {url:url.origin,token,base:consoleServer.origin};
};
async function post(server,token,input,headers={}){
 return fetch(server.origin+'/api/run',{
  method:'POST',
  headers:{Origin:server.origin,Authorization:'Bearer '+token,
   'Content-Type':'application/json',...headers},
  body:JSON.stringify(input),redirect:'manual'
 });
}
const question='Explain how to run third-party apps without trusting their JavaScript.';
const request=(rounds=1)=>({prompt:question,rounds,confirmCosts:true});

test('real loopback HTTP enforces one-click signed dual-agent end to end, no keys in response',async()=>{
 const config=setup(),calls=[];
 const server=await startLocalArenaConsole({config,fetcher:async(url,options)=>{
  const data=JSON.parse(options.body);
  calls.push({url,options,data});
  return new Response(JSON.stringify({
   choices:[{message:{content:'Evidence from '+data.model+
    (data.messages[2].content.includes('<previous_other>')?' round two':' round one')}}]
  }),{status:200});
 }});
 try{
  const {url,token}=details(server);
  assert.equal(url,server.origin);
  assert.match(token,/^[A-Za-z0-9_-]{43}$/);
  const homepage=await fetch(server.origin+'/');
  assert.equal(homepage.status,200);
  assert.match(homepage.headers.get('content-security-policy'),/script-src 'self'/);
  assert.match(homepage.headers.get('content-security-policy'),/connect-src 'self'/);
  assert.equal(homepage.headers.get('x-frame-options'),'DENY');
  assert.equal(homepage.headers.get('cache-control'),'no-store, max-age=0');
  const source=await homepage.text();
  assert.match(source,/Start a signed match/);
  assert.doesNotMatch(source,/secret-model-|BEGIN PRIVATE KEY|Bearer/);
  const script=await fetch(server.origin+'/console.mjs');
  assert.equal(script.status,200);
  assert.ok((await script.text()).includes('credentialFromFragment'));
  assert.equal((await fetch(server.origin+'/arena-core.mjs')).status,200);
  const match=await post(server,token,request(2));
  assert.equal(match.status,200);
  const body=await match.json();
  assert.equal(body.remainingRuns,2);
  assert.equal(body.session.rounds.length,2);
  assert.equal(body.session.rounds[1].responses[0].text,'Evidence from model-alpha round two');
  assert.equal(calls.length,4);
  assert.deepEqual(calls.map(c=>c.data.model),[
   'model-alpha','model-bravo','model-alpha','model-bravo'
  ]);
  assert.ok(calls.every(c=>c.options.headers.Authorization.startsWith('Bearer secret-model-')));
  assert.ok(!JSON.stringify(body).includes('secret-model-'));
  assert.ok(!JSON.stringify(body).includes('owner-one'));
  assert.ok(!JSON.stringify(body).includes('BEGIN PRIVATE KEY'));
  assert.ok(!JSON.stringify(body).includes(token));
 }finally{await server.close();}
});
test('origin, host, missing bearer, content-type and cost consent reject without provider calls',async()=>{
 let calls=0;
 const server=await startLocalArenaConsole({config:setup(),fetcher:async()=>{
  calls++;throw Error('no real provider calls expected');
 }});
 try{
  const {token}=details(server);
  const wrongOrigin=await post(server,token,request(),{Origin:'https://evil.example'});
  assert.equal(wrongOrigin.status,403);
  const noOrigin=await post(server,token,request(),{Origin:''});
  assert.equal(noOrigin.status,403);
  const wrongToken=await post(server,token.slice(0,-1)+'_',request());
  assert.equal(wrongToken.status,401);
  const missingToken=await fetch(server.origin+'/api/run',{
   method:'POST',headers:{Origin:server.origin,'Content-Type':'application/json'},
   body:JSON.stringify(request())
  });
  assert.equal(missingToken.status,401);
  const badType=await post(server,token,request(),{'Content-Type':'text/plain'});
  assert.equal(badType.status,415);
  const badConsent=await post(server,token,{...request(),confirmCosts:false});
  assert.equal(badConsent.status,400);
  const fakeBody=await post(server,token,{...request(),providerKey:'unsafe'});
  assert.equal(fakeBody.status,400);
  const badRounds=await post(server,token,{...request(),rounds:6});
  assert.equal(badRounds.status,400);
  const badQuestion=await post(server,token,{...request(),prompt:'x'});
  assert.equal(badQuestion.status,400);
  const huge=await post(server,token,{...request(),prompt:'z'.repeat(25000)});
  assert.equal(huge.status,413);
  const forbiddenHost=await fetch(server.origin+'/',{headers:{Host:'evil.example'}});
  assert.equal(forbiddenHost.status,403);
  const missingPath=await fetch(server.origin+'/../../.env');
  assert.equal(missingPath.status,404);
  const method=await fetch(server.origin+'/api/run');
  assert.equal(method.status,404);
  assert.equal(calls,0);
  assert.equal(server.runs,0);
 }finally{await server.close();}
});
test('live console uses in-memory run cap and one active operation, including failed paid requests',async()=>{
 let start;
 const release=new Promise(resolve=>{start=resolve;});
 let entered;
 const launched=new Promise(resolve=>{entered=resolve;});
 let calls=0;
 const server=await startLocalArenaConsole({config:setup(),fetcher:async()=>{
  calls++;entered();await release;
  return new Response(JSON.stringify({choices:[{message:{content:'Real model response'}}]}),{status:200});
 }});
 try{
  const {token}=details(server);
  const inFlight=post(server,token,request(1));
  await launched;
  const concurrent=await post(server,token,request());
  assert.equal(concurrent.status,409);
  start();
  const first=await inFlight;
  assert.equal(first.status,200);
  assert.equal((await first.json()).remainingRuns,2);
  assert.equal((await post(server,token,request())).status,200);
  assert.equal((await post(server,token,request())).status,200);
  const limited=await post(server,token,request());
  assert.equal(limited.status,429);
  assert.equal(server.runs,3);
  assert.equal(calls,6);
 }finally{start();await server.close();}
});
test('provider errors return generic HTTP 502 and consume a bounded run without echoing secrets',async()=>{
 const server=await startLocalArenaConsole({config:setup(),fetcher:async()=>{
  return new Response('secret-model-a private-key material',{status:401});
 }});
 try{
  const {token}=details(server);
  const res=await post(server,token,request());
  assert.equal(res.status,502);
  const raw=await res.text();
  assert.match(raw,/Model or signed match failed/);
  assert.doesNotMatch(raw,/secret-model|private-key|401|Bearer/);
  assert.equal(server.runs,1);
 }finally{await server.close();}
});
test('local setup rejects insecure key files and validates real Ed25519 proof before binding',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'arena-console-'));
 try{
  const config=setup(),a=join(dir,'a.pem'),b=join(dir,'b.pem');
  await Promise.all([
   writeFile(a,config.identities[0].privateKeyPem,{mode:0o600}),
   writeFile(b,config.identities[1].privateKeyPem,{mode:0o600})
  ]);
  const env={
   ARENA_A_MODEL:config.agents[0].model,ARENA_B_MODEL:config.agents[1].model,
   ARENA_A_ENDPOINT:config.agents[0].endpoint,ARENA_B_ENDPOINT:config.agents[1].endpoint,
   ARENA_A_KEY:config.agents[0].key,ARENA_B_KEY:config.agents[1].key,
   ARENA_A_AGENT_ID:config.identities[0].agentId,
   ARENA_B_AGENT_ID:config.identities[1].agentId,
   ARENA_A_OWNER_ID:config.identities[0].ownerId,
   ARENA_B_OWNER_ID:config.identities[1].ownerId,
   ARENA_A_SIGNING_KEY_FILE:a,ARENA_B_SIGNING_KEY_FILE:b
  };
  const loaded=await loadConsoleConfig(env);
  assert.equal(loaded.identities.length,2);
  assert.equal(loaded.agents.length,2);
  const server=await startLocalArenaConsole({config:loaded});
  await server.close();
  if(process.platform!=='win32'){
   await chmod(a,0o644);
   await assert.rejects(loadConsoleConfig(env),TypeError);
  }
  await assert.rejects(startLocalArenaConsole({config:{
   ...config,identities:[config.identities[0],config.identities[0]]
  }}),TypeError);
  await assert.rejects(startLocalArenaConsole({config:{
   ...config,identities:[{...config.identities[0],privateKeyPem:'bad'},config.identities[1]]
  }}),TypeError);
 }finally{await rm(dir,{recursive:true,force:true});}
});
