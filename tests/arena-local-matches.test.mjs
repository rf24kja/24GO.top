import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {LocalAgentRegistry} from '../packages/arena/local-registry.mjs';
import {LocalArenaMatches} from '../packages/arena/local-matches.mjs';
import {signAgentChallenge} from '../packages/arena/agent-proof.mjs';
import {parseArenaSession} from '../site/arena/arena-core.mjs';

const keys=()=>generateKeyPairSync('ed25519');
const pem=pair=>pair.publicKey.export({format:'pem',type:'spki'});
function setup(){
 let now=1794740000000;
 const registry=new LocalAgentRegistry({clock:()=>now});
 const a=keys(),b=keys(),attacker=keys();
 registry.enroll({ownerId:'owner-one',agentId:'model-alpha',name:'Model Alpha',model:'model-a',publicKeyPem:pem(a)});
 registry.enroll({ownerId:'owner-two',agentId:'model-bravo',name:'Model Bravo',model:'model-b',publicKeyPem:pem(b)});
 const login=(id,pair)=>{
  const challenge=registry.challenge({agentId:id});
  return registry.authenticate(signAgentChallenge(challenge,pair.privateKey));
 };
 const aa=login('model-alpha',a),bb=login('model-bravo',b);
 const matches=new LocalArenaMatches({registry,clock:()=>now});
 return {registry,matches,a,b,attacker,aa,bb,login,
  tick:value=>{now+=value;},now:()=>now};
}
const prompt='What are the risks of running arbitrary untrusted JavaScript on the main domain?';
test('owner-pinned Ed25519 login gates exact participant, scope and 5-minute token TTL',()=>{
 const s=setup();
 assert.equal(s.registry.authorize({agentId:'model-alpha',credential:s.aa.credential}),true);
 assert.equal(s.registry.authorize({agentId:'model-bravo',credential:s.aa.credential}),false);
 assert.equal(s.registry.authorize({agentId:'model-alpha',credential:s.bb.credential}),false);
 assert.equal(s.registry.authorize({agentId:'model-alpha',credential:'bad'}),false);
 assert.equal(s.aa.scope,'arena:participate');
 assert.ok(!JSON.stringify(s.registry.audit()).includes('PRIVATE KEY'));
 assert.deepEqual(s.registry.audit().filter(x=>x.event==='authenticated').map(x=>x.agentId),
  ['model-alpha','model-bravo']);
 s.tick(300001);
 assert.equal(s.registry.authorize({agentId:'model-alpha',credential:s.aa.credential}),false);
});
test('impersonation, forged signed challenge, wrong owner, replay and revoked keys all fail',()=>{
 const s=setup();
 assert.throws(()=>s.registry.enroll({ownerId:'owner-three',agentId:'model-alpha',
  name:'Fake agent',model:'fake',publicKeyPem:pem(s.attacker)}),TypeError);
 const challenge=s.registry.challenge({agentId:'model-alpha'});
 assert.throws(()=>s.registry.authenticate(
  signAgentChallenge(challenge,s.attacker.privateKey)),TypeError);
 const actual=s.registry.authenticate(signAgentChallenge(challenge,s.a.privateKey));
 assert.equal(s.registry.authorize({agentId:'model-alpha',credential:actual.credential}),true);
 assert.throws(()=>s.registry.authenticate(signAgentChallenge(challenge,s.a.privateKey)),TypeError);
 assert.throws(()=>s.registry.rotate({ownerId:'owner-two',agentId:'model-alpha',
  publicKeyPem:pem(s.attacker)}),TypeError);
 assert.throws(()=>s.registry.revoke({ownerId:'owner-two',agentId:'model-alpha'}),TypeError);
 const old=s.aa.credential;
 s.registry.rotate({ownerId:'owner-one',agentId:'model-alpha',publicKeyPem:pem(s.attacker)});
 assert.equal(s.registry.authorize({agentId:'model-alpha',credential:old}),false);
 assert.equal(s.registry.authorize({agentId:'model-alpha',credential:actual.credential}),false);
 assert.throws(()=>s.login('model-alpha',s.a),TypeError,'old key cannot sign');
 const replacement=s.login('model-alpha',s.attacker);
 assert.equal(s.registry.authorize({agentId:'model-alpha',credential:replacement.credential}),true);
 s.registry.revoke({ownerId:'owner-one',agentId:'model-alpha'});
 assert.equal(s.registry.authorize({agentId:'model-alpha',credential:replacement.credential}),false);
 assert.throws(()=>s.registry.challenge({agentId:'model-alpha'}),TypeError);
 assert.equal(s.registry.describe('model-alpha'),null);
});
test('Arena match allows only two actual authenticated registered agents; round is withheld until both answer',()=>{
 const s=setup();
 const info=s.matches.create({prompt,agentIds:['model-alpha','model-bravo'],rounds:2});
 assert.equal(info.state,'open');
 assert.equal(s.matches.status(info.matchId).roundsCompleted,0);
 assert.throws(()=>s.matches.create({prompt,agentIds:['model-alpha','model-alpha']}),TypeError);
 assert.throws(()=>s.matches.create({prompt,agentIds:['model-alpha','outsider']}),TypeError);
 assert.throws(()=>s.matches.create({prompt,agentIds:['model-alpha','model-bravo'],rounds:4}),TypeError);
 assert.throws(()=>s.matches.submit({matchId:info.matchId,agentId:'model-alpha',
  credential:s.bb.credential,text:'stolen answer',durationMs:3}),TypeError);
 const first=s.matches.submit({matchId:info.matchId,agentId:'model-alpha',
  credential:s.aa.credential,text:'Own round one answer.',durationMs:11});
 assert.equal(first.roundsCompleted,0);
 assert.equal(first.pendingResponses,1);
 assert.throws(()=>s.matches.round({matchId:info.matchId,number:1,
  agentId:'model-alpha',credential:s.aa.credential}),TypeError,'first reply hidden');
 assert.throws(()=>s.matches.submit({matchId:info.matchId,agentId:'model-alpha',
  credential:s.aa.credential,text:'second write in same round',durationMs:1}),TypeError);
 const completed=s.matches.submit({matchId:info.matchId,agentId:'model-bravo',
  credential:s.bb.credential,text:'Independent round one answer.',durationMs:15});
 assert.equal(completed.roundsCompleted,1);
 assert.equal(completed.pendingResponses,0);
 assert.equal(s.matches.round({matchId:info.matchId,number:1,
  agentId:'model-alpha',credential:s.aa.credential}).responses[1].text,
  'Independent round one answer.');
 assert.throws(()=>s.matches.export({matchId:info.matchId,
  agentId:'model-alpha',credential:s.aa.credential}),TypeError,'unfinished match not exportable');
 s.matches.submit({matchId:info.matchId,agentId:'model-bravo',
  credential:s.bb.credential,text:'Rebuttal round two.',durationMs:17});
 const final=s.matches.submit({matchId:info.matchId,agentId:'model-alpha',
  credential:s.aa.credential,text:'Correction round two.',durationMs:19});
 assert.equal(final.state,'complete');
 const transcript=s.matches.export({matchId:info.matchId,agentId:'model-alpha',
  credential:s.aa.credential});
 assert.equal(transcript.rounds.length,2);
 assert.deepEqual(transcript.agents.map(x=>x.name),['Model Alpha','Model Bravo']);
 assert.deepEqual(parseArenaSession(JSON.stringify(transcript)),transcript);
 assert.ok(!JSON.stringify(transcript).includes(s.aa.credential));
 assert.ok(!JSON.stringify(transcript).includes(s.bb.credential));
 assert.throws(()=>s.matches.submit({matchId:info.matchId,agentId:'model-alpha',
  credential:s.aa.credential,text:'extra',durationMs:5}),TypeError);
});
test('malicious inputs, cross-match IDs and expired credentials cannot submit or reveal messages',()=>{
 const s=setup();
 const first=s.matches.create({prompt,agentIds:['model-alpha','model-bravo']});
 const second=s.matches.create({prompt,agentIds:['model-alpha','model-bravo']});
 const valid={matchId:first.matchId,agentId:'model-alpha',
  credential:s.aa.credential,text:'A legitimate technical observation.',durationMs:123};
 for(const entry of [
  {...valid,agentId:'model-bravo'}, {...valid,credential:s.bb.credential},
  {...valid,matchId:'made-up'}, {...valid,text:''},
  {...valid,text:'<script>'.repeat(1000)}, {...valid,text:'invalid\u0000payload'},
  {...valid,durationMs:-1}, {...valid,durationMs:120001},
  {...valid,durationMs:1.2}
 ])assert.throws(()=>s.matches.submit(entry),TypeError);
 assert.equal(s.matches.status(first.matchId).pendingResponses,0);
 s.matches.submit(valid);
 assert.equal(s.matches.status(second.matchId).pendingResponses,0,'match isolation');
 assert.throws(()=>s.matches.round({matchId:first.matchId,number:1,
  agentId:'model-bravo',credential:s.aa.credential}),TypeError);
 s.tick(300001);
 assert.throws(()=>s.matches.submit({...valid,matchId:second.matchId}),TypeError);
});
test('registry rejects non-Ed25519 keys and floods; exposes no raw tokens/keys in audit',()=>{
 const s=setup();
 const rsa=generateKeyPairSync('rsa',{modulusLength:2048});
 assert.throws(()=>s.registry.enroll({
  ownerId:'owner-one',agentId:'agent-rsa',name:'RSA',model:'model-rsa',
  publicKeyPem:pem(rsa)
 }),TypeError);
 for(let i=0;i<64;i++)s.registry.challenge({agentId:'model-bravo'});
 assert.throws(()=>s.registry.challenge({agentId:'model-bravo'}),TypeError);
 const log=JSON.stringify(s.registry.audit());
 assert.doesNotMatch(log,/BEGIN PUBLIC KEY|BEGIN PRIVATE KEY/);
 assert.ok(!log.includes(s.aa.credential));
 assert.ok(!log.includes(s.bb.credential));
});
