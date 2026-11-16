/**
 * Signed LOCAL editorial handoff, never an authorization to publish.
 * A verifier must supply the owner-pinned Ed25519 public key AND expected
 * owner/agent identity from an independent trusted source.
 *
 * The signed domain and audience cannot be reused as Arena credentials,
 * HTTP JWTs, or a future posts:publish authorization.
 */
import {createHash,createPrivateKey,createPublicKey,randomBytes,sign,verify} from 'node:crypto';
import {parseDraftFile,formatDraft,MAX_DRAFT_FILE_BYTES} from '../../site/draft-lab-logic.js';

export const AGENT_PROPOSAL_KIND='24gotop-agent-editorial-proposal';
export const AGENT_PROPOSAL_AUDIENCE='editorial:human-review-only';
export const MAX_AGENT_PROPOSAL_BYTES=81920;
const DOMAIN='24gotop.agent.editorial-proposal.v1';
const ID=/^[a-z][a-z0-9-]{2,63}$/;
const HASH=/^[a-f0-9]{64}$/;
const NONCE=/^[A-Za-z0-9_-]{32}$/;
const SIGNATURE=/^[A-Za-z0-9_-]{86}$/;
const invalid=()=>{throw new TypeError('Invalid offline agent editorial proposal');};
const exact=(x,keys)=>Boolean(x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k)));
const textBytes=x=>Buffer.from(x,'utf8');
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');

function validateDocument(document){
 if(typeof document!=='string'||textBytes(document).length>MAX_DRAFT_FILE_BYTES)invalid();
 try{
  const draft=parseDraftFile(document);
  if(formatDraft(draft)!==document)invalid();
  return Object.freeze(draft);
 }catch{invalid();}
}

function payload(x){
 return {
  kind:AGENT_PROPOSAL_KIND,version:1,audience:AGENT_PROPOSAL_AUDIENCE,
  ownerId:x.ownerId,agentId:x.agentId,createdAt:x.createdAt,
  nonce:x.nonce,sha256:x.sha256,document:x.document
 };
}
function signedBytes(x){return textBytes(JSON.stringify([DOMAIN,payload(x)]));}
function dateValid(value){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value))return false;
 try{return new Date(value).toISOString()===value;}catch{return false;}
}
function validFields(x){
 if(!exact(x,['kind','version','audience','ownerId','agentId',
   'createdAt','nonce','sha256','document','signature'])||
  x.kind!==AGENT_PROPOSAL_KIND||x.version!==1||
  x.audience!==AGENT_PROPOSAL_AUDIENCE||
  typeof x.ownerId!=='string'||!ID.test(x.ownerId)||
  typeof x.agentId!=='string'||!ID.test(x.agentId)||
  !dateValid(x.createdAt)||typeof x.nonce!=='string'||!NONCE.test(x.nonce)||
  typeof x.sha256!=='string'||!HASH.test(x.sha256)||
  typeof x.signature!=='string'||!SIGNATURE.test(x.signature))invalid();
 const sig=Buffer.from(x.signature,'base64url');
 if(sig.length!==64||sig.toString('base64url')!==x.signature)invalid();
 validateDocument(x.document);
 if(sha(x.document)!==x.sha256)invalid();
 return sig;
}

export function createSignedAgentProposal({
 document,ownerId,agentId,privateKey,now=new Date()
}={}){
 if(typeof ownerId!=='string'||!ID.test(ownerId)||
  typeof agentId!=='string'||!ID.test(agentId)||
  !(now instanceof Date)||!Number.isFinite(now.getTime()))invalid();
 validateDocument(document);
 let key;
 try{key=createPrivateKey(privateKey);}catch{invalid();}
 if(key.asymmetricKeyType!=='ed25519')invalid();
 const nonce=randomBytes(24).toString('base64url');
 const base=payload({ownerId,agentId,createdAt:now.toISOString(),
  nonce,sha256:sha(document),document});
 const signature=sign(null,signedBytes(base),key).toString('base64url');
 const signed=Object.freeze({...base,signature});
 if(textBytes(JSON.stringify(signed)+'\n').length>MAX_AGENT_PROPOSAL_BYTES)invalid();
 return signed;
}

export function verifySignedAgentProposal(raw,{
 publicKey,expectedOwnerId,expectedAgentId
}={}){
 if(typeof expectedOwnerId!=='string'||!ID.test(expectedOwnerId)||
  typeof expectedAgentId!=='string'||!ID.test(expectedAgentId))invalid();
 let signed;
 if(typeof raw==='string'){
  if(textBytes(raw).length>MAX_AGENT_PROPOSAL_BYTES)invalid();
  try{signed=JSON.parse(raw);}catch{invalid();}
 }else signed=raw;
 const signature=validFields(signed);
 if(signed.ownerId!==expectedOwnerId||signed.agentId!==expectedAgentId)invalid();
 let key;
 try{key=createPublicKey(publicKey);}catch{invalid();}
 if(key.asymmetricKeyType!=='ed25519'||!verify(null,signedBytes(signed),key,signature))
  invalid();
 const rawKey=key.export({type:'spki',format:'der'});
 return Object.freeze({
  ownerId:signed.ownerId,agentId:signed.agentId,
  createdAt:signed.createdAt,nonce:signed.nonce,
  sha256:signed.sha256,
  keyFingerprint:createHash('sha256').update(rawKey).digest('hex'),
  draft:validateDocument(signed.document)
 });
}
