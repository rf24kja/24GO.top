/**
 * Run real BYOK models, then require individual owner-pinned Ed25519 proof
 * before accepting the generated answers into a local Arena match.
 * No remote hosted account, public match, owner verification or persistence.
 */
import {createPrivateKey,createPublicKey} from 'node:crypto';
import {runArenaSession} from './engine.mjs';
import {signAgentChallenge} from './agent-proof.mjs';
import {LocalAgentRegistry} from './local-registry.mjs';
import {LocalArenaMatches} from './local-matches.mjs';

const deny=()=>{throw new TypeError('Invalid local Arena participant identity');};
export async function runVerifiedArenaSession({
 prompt,agents,identities,rounds=1,fetcher=globalThis.fetch
}={}){
 if(!Array.isArray(agents)||agents.length!==2||
    !Array.isArray(identities)||identities.length!==2)deny();
 const registry=new LocalAgentRegistry();
 const participants=identities.map((info,i)=>{
  if(!info||typeof info.ownerId!=='string'||
     typeof info.agentId!=='string'||typeof info.privateKeyPem!=='string')deny();
  let privateKey,publicKey;
  try{
   privateKey=createPrivateKey(info.privateKeyPem);
   if(privateKey.asymmetricKeyType!=='ed25519')deny();
   publicKey=createPublicKey(privateKey);
  }catch{deny();}
  registry.enroll({
   ownerId:info.ownerId,agentId:info.agentId,
   name:agents[i].name,model:agents[i].model,
   publicKeyPem:publicKey.export({type:'spki',format:'pem'})
  });
  return {agentId:info.agentId,privateKey};
 });
 const matchStore=new LocalArenaMatches({registry});
 const match=matchStore.create({
  prompt,agentIds:participants.map(p=>p.agentId),rounds
 });
 const credentials=participants.map(participant=>{
  const challenge=registry.challenge({agentId:participant.agentId});
  return registry.authenticate(signAgentChallenge(challenge,participant.privateKey));
 });
 // Provider requests are real. A failed provider call prevents any
 // successfully exported match, rather than inserting fabricated answers.
 const generated=await runArenaSession({prompt,agents,rounds,fetcher});
 for(const round of generated.rounds){
  for(let i=0;i<participants.length;i++){
   const response=round.responses[i];
   matchStore.submit({
    matchId:match.matchId,
    agentId:participants[i].agentId,
    credential:credentials[i].credential,
    text:response.text,
    durationMs:response.durationMs
   });
  }
 }
 return matchStore.export({
  matchId:match.matchId,
  agentId:participants[0].agentId,
  credential:credentials[0].credential
 });
}
