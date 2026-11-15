/**
 * In-process, owner-controlled reference for agent admission to local Arena.
 * NO HTTP routes, production account creation, JWT, database, or public match.
 * Caller must have authenticated the OWNER before calling enroll/rotate/revoke.
 */
import {createHash,randomBytes,createPublicKey} from 'node:crypto';
import {issueAgentChallenge,verifyAgentProof} from './agent-proof.mjs';

const ID=/^[a-z][a-z0-9-]{2,63}$/;
const TOKEN_TTL=300000;
const MAX_AGENTS=32;
const MAX_PENDING=64;
const MAX_TOKENS=64;
const reject=()=>{throw new TypeError('Local Arena authorization rejected');};
const hash=v=>createHash('sha256').update(v,'utf8').digest('hex');
const requireId=v=>typeof v==='string'&&ID.test(v)||reject();
function publicKey(input){
 try{
  const key=createPublicKey(input);
  if(key.asymmetricKeyType!=='ed25519')reject();
  const raw=key.export({type:'spki',format:'der'});
  return {key,fingerprint:hash(raw.toString('base64'))};
 }catch{reject();}
}
export class LocalAgentRegistry{
 #agents=new Map();#pending=new Map();#sessions=new Map();#audit=[];
 #clock;
 constructor({clock=Date.now}={}){
  if(typeof clock!=='function')reject();
  this.#clock=clock;
 }
 #now(){const v=this.#clock();if(!Number.isSafeInteger(v))reject();return v;}
 #event(event,agentId){
  this.#audit.push(Object.freeze({event,agentId,at:this.#now()}));
  if(this.#audit.length>200)this.#audit.shift();
 }
 #purge(){
  const now=this.#now();
  for(const [nonce,s] of this.#pending)if(s.expiresAt<now)this.#pending.delete(nonce);
  for(const [digest,s] of this.#sessions)if(s.expiresAt<now)this.#sessions.delete(digest);
 }
 /** TRUSTED owner-only API, not safe as an unauthenticated HTTP handler. */
 enroll({ownerId,agentId,name,model,publicKeyPem}={}){
  requireId(ownerId);requireId(agentId);
  if(typeof name!=='string'||name.trim().length<1||name.length>60||
     /[\u0000-\u001f\u007f]/u.test(name)||
     typeof model!=='string'||model.trim().length<1||model.length>100||
     /[\u0000-\u001f\u007f]/u.test(model)||this.#agents.has(agentId)||
     this.#agents.size>=MAX_AGENTS)reject();
  const parsed=publicKey(publicKeyPem);
  this.#agents.set(agentId,{
   ownerId,name,model,key:parsed.key,fingerprint:parsed.fingerprint,version:1
  });
  this.#event('enrolled',agentId);
  return Object.freeze({agentId,name,model,keyFingerprint:parsed.fingerprint,ownerId});
 }
 #invalidate(agentId){
  for(const [nonce,s] of this.#pending)if(s.agentId===agentId)this.#pending.delete(nonce);
  for(const [digest,s] of this.#sessions)if(s.agentId===agentId)this.#sessions.delete(digest);
 }
 /** TRUSTED owner-only API, requiring the original agent's ownerId. */
 rotate({ownerId,agentId,publicKeyPem}={}){
  requireId(ownerId);requireId(agentId);
  const agent=this.#agents.get(agentId);
  if(!agent||agent.ownerId!==ownerId)reject();
  const parsed=publicKey(publicKeyPem);
  if(parsed.fingerprint===agent.fingerprint)reject();
  this.#invalidate(agentId);
  this.#agents.set(agentId,{...agent,key:parsed.key,fingerprint:parsed.fingerprint,
   version:agent.version+1});
  this.#event('rotated',agentId);
  return Object.freeze({agentId,keyFingerprint:parsed.fingerprint});
 }
 revoke({ownerId,agentId}={}){
  requireId(ownerId);requireId(agentId);
  const agent=this.#agents.get(agentId);
  if(!agent||agent.ownerId!==ownerId)reject();
  this.#invalidate(agentId);
  this.#agents.delete(agentId);
  this.#event('revoked',agentId);
  return true;
 }
 /** An untrusted agent can request a nonce only for an enrolled ID. */
 challenge({agentId}={}){
  requireId(agentId);this.#purge();
  if(!this.#agents.has(agentId)||this.#pending.size>=MAX_PENDING)reject();
  const issued=issueAgentChallenge({
   agentId,audience:'arena:participate',issued:this.#pending,now:this.#now()
  });
  this.#event('challenge-issued',agentId);
  return issued;
 }
 /** Returns an opaque limited-lived credential, never the private key. */
 authenticate(proof){
  this.#purge();
  if(this.#sessions.size>=MAX_TOKENS)reject();
  const agentId=proof?.challenge?.agentId;
  if(typeof agentId!=='string')reject();
  const agent=this.#agents.get(agentId);
  if(!agent)reject();
  const publicKeys=new Map([[agentId,agent.key]]);
  if(!verifyAgentProof(proof,{
   issued:this.#pending,publicKeys,now:this.#now()
  }))reject();
  const credential=randomBytes(32).toString('base64url');
  const expiresAt=this.#now()+TOKEN_TTL;
  this.#sessions.set(hash(credential),{
   agentId,version:agent.version,expiresAt,scope:'arena:participate'
  });
  this.#event('authenticated',agentId);
  return Object.freeze({credential,agentId,scope:'arena:participate',expiresAt});
 }
 authorize({agentId,credential}={}){
  if(typeof agentId!=='string'||!ID.test(agentId)||
     typeof credential!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(credential))
   return false;
  this.#purge();
  const agent=this.#agents.get(agentId);
  const s=this.#sessions.get(hash(credential));
  return Boolean(agent&&s&&s.agentId===agentId&&s.version===agent.version&&
   s.scope==='arena:participate'&&this.#now()<=s.expiresAt);
 }
 describe(agentId){
  requireId(agentId);
  const x=this.#agents.get(agentId);
  return x?Object.freeze({agentId,name:x.name,model:x.model,
   keyFingerprint:x.fingerprint}):null;
 }
 audit(){
  return Object.freeze([...this.#audit]);
 }
}
