#!/usr/bin/env node
/** Public issue handoff: preview by default; upload metadata ONLY on explicit opt-in. */
import {constants,openSync,readFileSync,fstatSync,closeSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareGitHubAgentProposal,submitGitHubAgentProposal} from './github-proposal.mjs';
import {MAX_AGENT_PROPOSAL_BYTES} from './editorial-proposal.mjs';

const invalid=()=>{throw new TypeError('Invalid agent editorial proposal command');};
function readFile(path,max,privateOnly=false){
 if(typeof path!=='string'||!path||path.length>4096)invalid();
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const stat=fstatSync(fd);
  if(!stat.isFile()||stat.size===0||stat.size>max||
     (privateOnly&&process.platform!=='win32'&&(stat.mode&0o077)!==0))invalid();
  const bytes=readFileSync(fd);
  if(bytes.length>max)invalid();
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 }finally{closeSync(fd);}
}
export function readGitHubProposalOptions(args){
 const required=['package','public-key','owner-id','agent-id','summary-file'];
 const flags=['submit','confirm-public'];
 const result={};
 for(let i=0;i<args.length;i++){
  const arg=args[i],key=arg?.startsWith('--')?arg.slice(2):'';
  if(![...required,...flags].includes(key)||Object.hasOwn(result,key))invalid();
  if(flags.includes(key))result[key]=true;
  else{
   const value=args[++i];
   if(typeof value!=='string'||!value||value.startsWith('--'))invalid();
   result[key]=value;
  }
 }
 if(required.some(key=>!Object.hasOwn(result,key))||
    (result['confirm-public']&&!result.submit))invalid();
 return result;
}
export async function runGitHubProposalCommand(argv,{
 env=process.env,fetchImpl=globalThis.fetch
}={}){
 const opts=readGitHubProposalOptions(argv);
 // Reject an unattended network write without both explicit opt-in flags.
 if(opts.submit&&(!opts['confirm-public']||!env.GITHUB_TOKEN))invalid();
 const proposal=prepareGitHubAgentProposal(
  readFile(opts.package,MAX_AGENT_PROPOSAL_BYTES,true),{
   publicKey:readFile(opts['public-key'],8192),
   expectedOwnerId:opts['owner-id'],expectedAgentId:opts['agent-id'],
   summary:readFile(opts['summary-file'],1250)
  });
 if(!opts.submit)return 'LOCAL PUBLIC ISSUE PREVIEW (nothing uploaded):\n'+
  JSON.stringify({title:proposal.title,body:proposal.body},null,2);
 const result=await submitGitHubAgentProposal({
  proposal,token:env.GITHUB_TOKEN,fetchImpl
 });
 return (result.created?'Created':'Found existing')+
  ' PUBLIC GitHub editorial issue: '+result.url+
  '. No article was published or agent account registered.';
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(await runGitHubProposalCommand(process.argv.slice(2)));}
 catch{
  // Do not include GitHub error payloads, auth tokens or manuscript paths in logs.
  console.error('GitHub agent proposal rejected; check local inputs, consent and GitHub permissions.');
  process.exitCode=1;
 }
}
