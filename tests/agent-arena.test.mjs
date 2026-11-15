import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync} from 'node:crypto';
import {validateArenaSession,parseArenaSession,MAX_ARENA_BYTES}
 from '../site/arena/arena-core.mjs';
import {runArenaSession,validateAgents,ARENA_MAX_TOKENS}
 from '../packages/arena/engine.mjs';
import {parseCli} from '../packages/arena/cli.mjs';
import {issueAgentChallenge,signAgentChallenge,verifyAgentProof}
 from '../packages/arena/agent-proof.mjs';

const agents=[
 {name:'Real Model A',model:'test-model-a',endpoint:'https://api.example.org/v1/chat/completions',key:'top-secret-a'},
 {name:'Real Model B',model:'test-model-b',endpoint:'http://127.0.0.1:9000/v1/chat/completions',key:'top-secret-b'}
];
const mock=()=>{
 const requests=[];
 const fetcher=async(url,options)=>{
  const body=JSON.parse(options.body);
  requests.push({url,options,body});
  return new Response(JSON.stringify({
   choices:[{message:{content:body.model+' response in round '+
    (body.messages[2].content.includes('<previous_self>')?'2':'1')}}]
  }),{status:200,headers:{'Content-Type':'application/json'}});
 };
 return {fetcher,requests};
};
test('Arena runs two actual provider calls per round, strictly budgeted with no credential export',async()=>{
 const {fetcher,requests}=mock();
 const session=await runArenaSession({
  prompt:'How should we keep public apps isolated?',agents,rounds:2,fetcher,
  now:()=>new Date('2026-11-15T09:15:00.000Z')
 });
 assert.equal(requests.length,4);
 assert.equal(ARENA_MAX_TOKENS,400);
 assert.deepEqual(requests.map(x=>x.body.max_tokens),[400,400,400,400]);
 assert.deepEqual(session.agents.map(x=>x.id),['a','b']);
 assert.equal(session.rounds.length,2);
 assert.deepEqual(session.rounds.map(x=>x.responses.map(a=>a.agentId)),
  [['a','b'],['a','b']]);
 assert.equal(session.rounds[0].responses[0].text,'test-model-a response in round 1');
 assert.equal(session.rounds[1].responses[1].text,'test-model-b response in round 2');
 assert.ok(!requests[0].body.messages[2].content.includes('<previous_self>'));
 assert.ok(requests[2].body.messages[2].content.includes('<previous_other>'));
 assert.ok(!requests[2].body.messages[2].content.includes('top-secret-a'));
 assert.ok(!JSON.stringify(session).includes('top-secret'));
 assert.ok(!JSON.stringify(session).includes('api.example.org'));
 assert.equal(session.source,'local-byok');
 assert.deepEqual(parseArenaSession(JSON.stringify(session)),session);
 for(const request of requests){
  assert.equal(request.options.redirect,'error');
  assert.ok(request.options.signal instanceof AbortSignal);
  assert.ok(request.options.headers.Authorization.startsWith('Bearer top-secret-'));
  assert.ok(request.body.messages[0].content.includes('untrusted'));
 }
});
test('Arena refuses unsafe endpoints, missing keys, unrelated schemas and high provider bills',async()=>{
 for(const endpoint of [
  'http://example.org/v1/chat/completions',
  'file:///etc/shadow',
  'javascript:alert(1)',
  'https://user:pass@api.example.org/v1/chat/completions',
  'https://api.example.org/v1/chat/completions?key=secret',
  'https://api.example.org/v1/chat/completions#credentials',
  'https://api.example.org/../../etc/passwd',
  'http://192.168.0.4/v1/chat/completions'
 ])assert.throws(()=>validateAgents([{...agents[0],endpoint},agents[1]]),TypeError,endpoint);
 for(const rounds of [-1,0,4,1.5,'2']){
  await assert.rejects(runArenaSession({
   prompt:'Can you explain key isolation?',agents,rounds,fetcher:async()=>{}
  }),TypeError);
 }
 await assert.rejects(runArenaSession({
  prompt:'ok',agents,fetcher:async()=>{}
 }),TypeError);
 assert.throws(()=>validateAgents([{...agents[0],key:''},agents[1]]),TypeError);
 assert.throws(()=>parseCli(['--prompt-file','demo.txt']),/confirm-costs/);
 assert.throws(()=>parseCli(['--confirm-costs','--prompt-file','demo.txt','--rounds','5']),/rounds/);
 assert.equal(parseCli(['--confirm-costs','--prompt-file','demo.txt','--rounds','3']).rounds,3);
});
test('Provider failures never echo secret keys, endpoint text or attacker error body',async()=>{
 const server=async()=>new Response('your-secret-key x <script>bad</script>',{status:401});
 await assert.rejects(runArenaSession({
  prompt:'Show your security analysis',agents,fetcher:server
 }),error=>{
  assert.match(error.message,/Provider HTTP 401/);
  assert.doesNotMatch(error.message,/secret|script|example.org|Authorization/);
  return true;
 });
 await assert.rejects(runArenaSession({
  prompt:'Show your security analysis',agents,
  fetcher:async()=>new Response('x'.repeat(150000),{status:200})
 }),/Provider call failed/);
});
test('Imported Arena JSON fails closed on forged verification, script-shaped keys and excess size',()=>{
 const base={
  version:1,source:'local-byok',createdAt:'2026-11-15T09:15:00.000Z',
  prompt:'<img src=x onerror=alert(1)>',
  agents:[{id:'a',name:'<script>literal</script>',model:'mA'},
   {id:'b',name:'Second model',model:'mB'}],
  rounds:[{number:1,responses:[
   {agentId:'a',text:'Untrusted <script>alert(1)</script>',durationMs:12},
   {agentId:'b',text:'Safe plain text',durationMs:13}
  ]}]
 };
 assert.deepEqual(validateArenaSession(base).agents.map(x=>x.id),['a','b']);
 assert.ok(MAX_ARENA_BYTES<=65536);
 for(const change of [
  {source:'hosted-verified'},
  {agents:base.agents.map((x,i)=>i?x:{...x,verified:true})},
  {agents:[base.agents[1],base.agents[0]]},
  {rounds:[{number:5,responses:base.rounds[0].responses}]},
  {rounds:[{number:1,responses:base.rounds[0].responses.map(x=>({...x,text:''}))}]},
  {prompt:'a'.repeat(2001)},
  {key:'secret'},
  {createdAt:'not-a-date'}
 ])assert.throws(()=>validateArenaSession({...base,...change}),TypeError);
 assert.throws(()=>parseArenaSession('x'.repeat(MAX_ARENA_BYTES+1)),TypeError);
 assert.throws(()=>parseArenaSession('not-json'),TypeError);
 const source=readFileSync(new URL('../site/arena/arena.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/innerHTML|fetch\(|localStorage|sessionStorage|sendBeacon|eval\(/);
 assert.match(source,/\.textContent=/);
});
test('Agent ownership proof verifies pinned Ed25519 key only once, not self-asserted identity',()=>{
 const a=generateKeyPairSync('ed25519'),b=generateKeyPairSync('ed25519');
 const issued=new Map(),trusted=new Map([['agent-alpha',a.publicKey]]);
 const now=1794739200000;
 const challenge=issueAgentChallenge({agentId:'agent-alpha',issued,now});
 const signed=signAgentChallenge(challenge,a.privateKey);
 assert.equal(verifyAgentProof(signed,{issued,publicKeys:trusted,now:now+1000}),true);
 assert.equal(verifyAgentProof(signed,{issued,publicKeys:trusted,now:now+1000}),false,'replay blocked');
 const challenge2=issueAgentChallenge({agentId:'agent-alpha',issued,now});
 const fake=signAgentChallenge(challenge2,b.privateKey);
 assert.equal(verifyAgentProof(fake,{issued,publicKeys:trusted,now:now+1000}),false);
 assert.equal(verifyAgentProof(signAgentChallenge(challenge2,a.privateKey),{
  issued,publicKeys:trusted,now:now+61000
 }),false,'expiry enforced');
 assert.equal(verifyAgentProof({challenge:{...challenge2,agentId:'agent-other'},
  signature:fake.signature},{issued,publicKeys:trusted,now}),false);
 assert.throws(()=>issueAgentChallenge({agentId:'agent-alpha',
  audience:'publish:posts',issued,now}),TypeError);
 assert.equal(trusted.has('agent-other'),false);
});
