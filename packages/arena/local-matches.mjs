/**
 * Authenticated, in-process Agent Arena match with two enrolled agents.
 * No persistence, public write endpoint, production auth or global ratings.
 */
import {randomBytes} from 'node:crypto';
import {validateArenaSession} from '../../site/arena/arena-core.mjs';

const invalid=()=>{throw new TypeError('Local Arena match transition rejected');};
const MAX_MATCHES=20;
const MAX_ROUNDS=3;
const MAX_MATCH_AGE_MS=30*60*1000;
const matchId=()=>randomBytes(16).toString('hex');
export class LocalArenaMatches{
 #registry;#matches=new Map();#clock;#audit=[];
 constructor({registry,clock=Date.now}={}){
  if(!registry||typeof registry.authorize!=='function'||
     typeof registry.describe!=='function'||typeof clock!=='function')invalid();
  this.#registry=registry;this.#clock=clock;
 }
 #now(){const n=this.#clock();if(!Number.isSafeInteger(n))invalid();return n;}
 #event(action,id,agentId){
  this.#audit.push(Object.freeze({action,matchId:id,agentId,at:this.#now()}));
  if(this.#audit.length>200)this.#audit.shift();
 }
 /** Match creation is a trusted local organizer action, NOT a public API. */
 create({prompt,agentIds,rounds=1}={}){
  if(typeof prompt!=='string'||prompt.trim().length<5||prompt.length>2000||
     /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(prompt)||
     !Array.isArray(agentIds)||agentIds.length!==2||
     agentIds[0]===agentIds[1]||
     !Number.isInteger(rounds)||rounds<1||rounds>MAX_ROUNDS||
     this.#matches.size>=MAX_MATCHES)invalid();
  const agents=agentIds.map(id=>this.#registry.describe(id));
  if(agents.some(x=>!x))invalid();
  const id=matchId();
  const now=this.#now();
  this.#matches.set(id,{
   id,prompt,agents,roundLimit:rounds,createdAt:now,
   expiresAt:now+MAX_MATCH_AGE_MS,
   state:'open',rounds:[],pending:new Map()
  });
  this.#event('created',id,null);
  return Object.freeze({matchId:id,rounds,agentIds:[...agentIds],state:'open'});
 }
 /** Agent may submit a response ONLY for itself, with its own valid token. */
 submit({matchId:id,agentId,credential,text,durationMs}={}){
  const m=this.#matches.get(id);
  if(!m||m.state!=='open'||this.#now()>m.expiresAt||
     !this.#registry.authorize({agentId,credential}))invalid();
  const seat=m.agents.findIndex(a=>a.agentId===agentId);
  if(seat<0||m.pending.has(agentId)||
     typeof text!=='string'||!text.trim()||text.length>4000||
     /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)||
     !Number.isInteger(durationMs)||durationMs<0||durationMs>120000)
   invalid();
  m.pending.set(agentId,{agentId,text,durationMs});
  this.#event('response-submitted',id,agentId);
  if(m.pending.size===2){
   const responses=m.agents.map(a=>m.pending.get(a.agentId));
   const round=Object.freeze({
    number:m.rounds.length+1,
    responses:Object.freeze(responses.map((v,i)=>Object.freeze({
     agentId:i===0?'a':'b',text:v.text,durationMs:v.durationMs
    })))
   });
   m.rounds.push(round);m.pending.clear();
   if(m.rounds.length===m.roundLimit)m.state='complete';
   this.#event('round-complete',id,null);
  }
  return Object.freeze({
   matchId:id,roundsCompleted:m.rounds.length,
   state:m.state,pendingResponses:m.pending.size
  });
 }
 /** No response is revealed while the opponent has not yet submitted. */
 round({matchId:id,number,agentId,credential}={}){
  const m=this.#matches.get(id);
  if(!m||!this.#registry.authorize({agentId,credential})||
     !m.agents.some(a=>a.agentId===agentId)||
     !Number.isInteger(number)||number<1||number>m.rounds.length)invalid();
  return m.rounds[number-1];
 }
 /** A transcript is available ONLY after both agents finish every round. */
 export({matchId:id,agentId,credential}={}){
  const m=this.#matches.get(id);
  if(!m||m.state!=='complete'||
     !this.#registry.authorize({agentId,credential})||
     !m.agents.some(a=>a.agentId===agentId))invalid();
  return validateArenaSession({
   version:1,source:'local-byok',
   createdAt:new Date(m.createdAt).toISOString(),
   prompt:m.prompt,
   agents:m.agents.map((a,i)=>({id:i===0?'a':'b',name:a.name,model:a.model})),
   rounds:m.rounds
  });
 }
 close({matchId:id}={}){
  const m=this.#matches.get(id);
  if(!m)invalid();
  m.state='closed';m.pending.clear();
  this.#event('closed',id,null);
  return true;
 }
 status(id){
  const m=this.#matches.get(id);
  if(!m)return null;
  return Object.freeze({matchId:id,state:m.state,roundsCompleted:m.rounds.length,
   roundsTotal:m.roundLimit,pendingResponses:m.pending.size});
 }
 audit(){return Object.freeze([...this.#audit]);}
}
