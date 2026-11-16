#!/usr/bin/env node
/**
 * Explicit local agent editorial commands. No network and no publishing path.
 * Every file output is opt-in, exclusive-create, owner readable only.
 */
import {constants,closeSync,fstatSync,openSync,readFileSync,
 writeFileSync,unlinkSync} from 'node:fs';
import {generateKeyPairSync} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {formatDraft,parseDraftFile,MAX_DRAFT_FILE_BYTES} from '../../site/draft-lab-logic.js';
import {scanDraftSharingRisks} from '../../site/draft-lab-privacy.js';
import {createSignedAgentProposal,verifySignedAgentProposal,
 MAX_AGENT_PROPOSAL_BYTES} from './editorial-proposal.mjs';

const wrong=()=>{throw new TypeError('Invalid local agent editorial command');};
const readLocal=(path,max,privateOnly=false)=>{
 if(typeof path!=='string'||!path||path.length>4096)wrong();
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const stat=fstatSync(fd);
  if(!stat.isFile()||stat.size>max||stat.size===0||
    (privateOnly&&process.platform!=='win32'&&(stat.mode&0o077)!==0))wrong();
  const bytes=readFileSync(fd);
  if(bytes.length>max||bytes.length===0)wrong();
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 }finally{closeSync(fd);}
};
const save=(path,text,mode=0o600)=>{
 if(typeof path!=='string'||!path||path.length>4096)wrong();
 writeFileSync(path,text,{flag:'wx',mode});
};
const strict=(o,fields)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===fields.length&&fields.every(f=>Object.hasOwn(o,f));

export function readOptions(argv,required,booleanFlags=[]){
 if(!Array.isArray(argv)||!Array.isArray(required)||!Array.isArray(booleanFlags))wrong();
 const result={};
 for(let i=0;i<argv.length;i++){
  const key=argv[i];
  if(!key?.startsWith('--')||!required.includes(key.slice(2))&&
    !booleanFlags.includes(key.slice(2))||Object.hasOwn(result,key.slice(2)))wrong();
  if(booleanFlags.includes(key.slice(2)))result[key.slice(2)]=true;
  else{
   const value=argv[++i];
   if(typeof value!=='string'||!value||value.startsWith('--'))wrong();
   result[key.slice(2)]=value;
  }
 }
 if(required.some(k=>!Object.hasOwn(result,k)))wrong();
 return result;
}

export function runLocalAgentCommand(command,argv){
 if(command==='keys'){
  const opts=readOptions(argv,['private-out','public-out']);
  if(opts['private-out']===opts['public-out'])wrong();
  const pair=generateKeyPairSync('ed25519');
  const privatePem=pair.privateKey.export({type:'pkcs8',format:'pem'});
  const publicPem=pair.publicKey.export({type:'spki',format:'pem'});
  save(opts['private-out'],privatePem,0o600);
  try{save(opts['public-out'],publicPem,0o644);}
  catch(error){unlinkSync(opts['private-out']);throw error;}
  return 'Created local Ed25519 private/public key files. Keep the private key off GitHub.';
 }
 if(command==='draft'){
  const opts=readOptions(argv,['input','output']);
  const input=JSON.parse(readLocal(opts.input,MAX_AGENT_PROPOSAL_BYTES));
  if(!strict(input,['title','body','locale','category','source']))wrong();
  const document=formatDraft(input);
  if(Buffer.byteLength(document,'utf8')>MAX_DRAFT_FILE_BYTES)wrong();
  save(opts.output,document);
  return 'Created a local unpublished Draft Lab manuscript. No upload or publication.';
 }
 if(command==='sign'){
  const opts=readOptions(argv,['draft','private-key','owner-id','agent-id','output'],
   ['acknowledge-sensitive']);
  const document=readLocal(opts.draft,MAX_DRAFT_FILE_BYTES);
  // Require exact canonical bytes and a single canonical output representation;
  // don't silently normalize an agent-controlled or truncated manuscript.
  const draft=parseDraftFile(document);
  if(formatDraft(draft)!==document)wrong();
  const risk=scanDraftSharingRisks(draft);
  if(risk.flagged&&!opts['acknowledge-sensitive'])wrong();
  const signed=createSignedAgentProposal({
   document,ownerId:opts['owner-id'],agentId:opts['agent-id'],
   privateKey:readLocal(opts['private-key'],8192,true)
  });
  save(opts.output,JSON.stringify(signed)+'\n');
  return 'Created a signed LOCAL human-review proposal. Nothing was submitted or published.';
 }
 if(command==='verify'){
  const opts=readOptions(argv,['package','public-key','owner-id','agent-id']);
  const checked=verifySignedAgentProposal(
   readLocal(opts.package,MAX_AGENT_PROPOSAL_BYTES),
   {publicKey:readLocal(opts['public-key'],8192),
    expectedOwnerId:opts['owner-id'],expectedAgentId:opts['agent-id']});
  return 'Verified owner-pinned local signature; SHA-256: '+checked.sha256+
   '; public-key fingerprint: '+checked.keyFingerprint+
   '. No account authentication, moderation or publication performed.';
 }
 wrong();
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(runLocalAgentCommand(process.argv[2],process.argv.slice(3)));}
 catch{
  // Never echo manuscript text, private key material, paths, or provider errors.
  console.error('Agent editorial command rejected: check the local file, permissions and arguments.');
  process.exitCode=1;
 }
}
