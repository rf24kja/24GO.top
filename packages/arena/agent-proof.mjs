/**
 * Local reference for a future server-side registered-agent handshake.
 * Proof of private-key control is NOT account ownership / KYC / hosted auth.
 */
import {randomBytes,sign,verify} from 'node:crypto';
const ID=/^[a-z][a-z0-9-]{2,63}$/;
const DOMAIN='24gotop.agent.challenge.v1';
const maxAge=60000;
const invalid=()=>{throw new TypeError('Invalid agent identity challenge');};
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
const shape=(v,properties)=>v!==null&&typeof v==='object'&&
 !Array.isArray(v)&&Object.keys(v).length===properties.length&&
 properties.every(k=>own(v,k));
function canonical(challenge){
 return Buffer.from(JSON.stringify([
  DOMAIN,challenge.agentId,challenge.audience,challenge.nonce,
  challenge.issuedAt,challenge.expiresAt
 ]),'utf8');
}
export function issueAgentChallenge({
 agentId,audience='arena:participate',issued=new Map(),now=Date.now()
}={}){
 if(typeof agentId!=='string'||!ID.test(agentId)||audience!=='arena:participate'||
    !Number.isSafeInteger(now)||!(issued instanceof Map))invalid();
 const nonce=randomBytes(24).toString('base64url');
 const challenge=Object.freeze({
  agentId,audience,nonce,issuedAt:now,expiresAt:now+maxAge
 });
 issued.set(nonce,{agentId,audience,expiresAt:challenge.expiresAt});
 return challenge;
}
export function signAgentChallenge(challenge,privateKey){
 if(!shape(challenge,['agentId','audience','nonce','issuedAt','expiresAt']))
  invalid();
 const bytes=sign(null,canonical(challenge),privateKey);
 return {challenge,signature:bytes.toString('base64url')};
}
export function verifyAgentProof(proof,{
 issued,publicKeys,now=Date.now()
}={}){
 if(!proof||!shape(proof,['challenge','signature'])||
    !shape(proof.challenge,['agentId','audience','nonce','issuedAt','expiresAt'])||
    !(issued instanceof Map)||!(publicKeys instanceof Map)||
    !Number.isSafeInteger(now))return false;
 const c=proof.challenge;
 if(!ID.test(c.agentId)||c.audience!=='arena:participate'||
    !/^[A-Za-z0-9_-]{32}$/.test(c.nonce)||
    !Number.isSafeInteger(c.issuedAt)||!Number.isSafeInteger(c.expiresAt)||
    c.expiresAt-c.issuedAt!==maxAge||
    now<c.issuedAt-5000||now>c.expiresAt)return false;
 const pending=issued.get(c.nonce),key=publicKeys.get(c.agentId);
 if(!pending||pending.agentId!==c.agentId||
    pending.audience!==c.audience||
    pending.expiresAt!==c.expiresAt||!key||
    typeof proof.signature!=='string'||
    !/^[A-Za-z0-9_-]{86}$/.test(proof.signature))return false;
 let ok=false;
 try{
  const sig=Buffer.from(proof.signature,'base64url');
  if(sig.length===64)ok=verify(null,canonical(c),key,sig);
 }catch{return false;}
 if(!ok)return false;
 issued.delete(c.nonce); // single successful use, no replay
 return true;
}
