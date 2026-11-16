#!/usr/bin/env node
/**
 * Explicit second-model manuscript review. Saves a private advisory report,
 * NEVER a moderation approval, comment, agent score or published article.
 */
import {constants,closeSync,fstatSync,openSync,readFileSync,
 realpathSync,unlinkSync,writeFileSync} from 'node:fs';
import {dirname,isAbsolute,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {MAX_AGENT_PROPOSAL_BYTES,verifySignedAgentProposal} from './editorial-proposal.mjs';
import {validateAgentGeneratorProvider} from './draft-generator.mjs';
import {reviewSignedAgentArticle} from './editorial-reviewer.mjs';

const deny=()=>{throw new TypeError('Agent peer review command rejected');};
const ROOT=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
export function parseAgentReviewOptions(args){
 const required=['package','public-key','owner-id','agent-id','output'];
 const flags=['confirm-costs','confirm-provider-data'];
 const opts={};
 if(!Array.isArray(args))deny();
 for(let i=0;i<args.length;i++){
  const arg=args[i],key=arg?.startsWith('--')?arg.slice(2):'';
  if(![...required,...flags].includes(key)||Object.hasOwn(opts,key))deny();
  if(flags.includes(key))opts[key]=true;
  else{
   const value=args[++i];
   if(typeof value!=='string'||!value||value.startsWith('--')||
      value.length>4096)deny();
   opts[key]=value;
  }
 }
 if(required.some(k=>!opts[k])||
    !opts['confirm-costs']||!opts['confirm-provider-data'])deny();
 return Object.freeze(opts);
}

function safeRead(path,max,privateOnly=false){
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const info=fstatSync(fd);
  if(!info.isFile()||info.size===0||info.size>max||
    (privateOnly&&process.platform!=='win32'&&(info.mode&0o077)!==0))deny();
  const bytes=readFileSync(fd);
  if(bytes.length===0||bytes.length>max)deny();
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 }finally{closeSync(fd);}
}

function safeOutput(path){
 const absolute=resolve(path);
 const parent=realpathSync(dirname(absolute));
 const relation=relative(ROOT,parent);
 if(relation===''||(!relation.startsWith('..'+sep)&&
    relation!=='..'&&!isAbsolute(relation)))deny();
 return absolute;
}

export async function runAgentPeerReviewCommand(args,{
 env=process.env,fetchImpl=globalThis.fetch,now=()=>new Date()
}={}){
 const opts=parseAgentReviewOptions(args);
 const signed=safeRead(opts.package,MAX_AGENT_PROPOSAL_BYTES,true);
 const publicKey=safeRead(opts['public-key'],8192);
 const provider=validateAgentGeneratorProvider({
  endpoint:env.AGENT_REVIEW_ENDPOINT,
  model:env.AGENT_REVIEW_MODEL,
  key:env.AGENT_REVIEW_KEY
 });
 // Verify identity before touching a possibly billable provider.
 verifySignedAgentProposal(signed,{
  publicKey,expectedOwnerId:opts['owner-id'],expectedAgentId:opts['agent-id']
 });
 const destination=safeOutput(opts.output);
 // Exclusive reservation prevents duplicate model charges and overwrites.
 const fd=openSync(destination,
  constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|(constants.O_NOFOLLOW||0),0o600);
 let complete=false;
 try{
  const report=await reviewSignedAgentArticle({
   proposal:signed,publicKey,
   ownerId:opts['owner-id'],agentId:opts['agent-id'],
   provider,fetchImpl,now
  });
  writeFileSync(fd,JSON.stringify(report,null,2)+'\n','utf8');
  complete=true;
  return 'Private AI peer-review report created. Its findings are advisory only; '+
   'a human editor must still approve any publication.';
 }finally{
  let empty=false;
  try{empty=fstatSync(fd).size===0;}catch{/* fail closed */}
  closeSync(fd);
  // Only remove an empty file created exclusively by this invocation.
  if(!complete&&empty){
   try{unlinkSync(destination);}catch{/* preserve unexpected files */}
  }
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(await runAgentPeerReviewCommand(process.argv.slice(2)));}
 catch{
  // Never log content, model endpoints, keys, file paths or provider bodies.
  console.error('Agent peer review failed. Check signed input, provider consent and destination.');
  process.exitCode=1;
 }
}
