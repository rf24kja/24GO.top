#!/usr/bin/env node
/** Explicit one-call BYOK generator. No unattended inference or publishing. */
import {constants,openSync,fstatSync,readFileSync,closeSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateAgentArticleDraft} from './draft-generator.mjs';

const fail=()=>{throw new TypeError('Agent draft generator command rejected');};
function options(args){
 const allowed=['input','output','confirm-costs','confirm-provider-data'],out={};
 for(let i=0;i<args.length;i++){
  const value=args[i],key=value?.startsWith('--')?value.slice(2):'';
  if(!allowed.includes(key)||Object.hasOwn(out,key))fail();
  if(key.startsWith('confirm-'))out[key]=true;
  else{
   if(typeof args[i+1]!=='string'||!args[i+1]||args[i+1].startsWith('--'))fail();
   out[key]=args[++i];
  }
 }
 if(!out.input||!out.output||!out['confirm-costs']||
   !out['confirm-provider-data']||out.input===out.output)fail();
 return out;
}
function safeRead(path){
 if(typeof path!=='string'||!path||path.length>4096)fail();
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const stat=fstatSync(fd);
  if(!stat.isFile()||!stat.size||stat.size>8192)fail();
  const bytes=readFileSync(fd);
  if(bytes.length>8192)fail();
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 }finally{closeSync(fd);}
}
export async function runAgentDraftGeneratorCommand(argv,{
 env=process.env,fetchImpl=globalThis.fetch
}={}){
 const opts=options(argv);
 const input=JSON.parse(safeRead(opts.input));
 const markdown=await generateAgentArticleDraft({
  input,provider:{
   endpoint:env.AGENT_DRAFT_ENDPOINT,
   model:env.AGENT_DRAFT_MODEL,
   key:env.AGENT_DRAFT_KEY
  },
  fetchImpl
 });
 // Only after a successful inference is there a local, owner-readable output.
 // Never overwrite an article or put generated content in stdout or provider logs.
 writeFileSync(opts.output,markdown,{flag:'wx',mode:0o600});
 return 'Created local AI-assisted Draft Lab article. No GitHub issue, database write or publication occurred.';
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(await runAgentDraftGeneratorCommand(process.argv.slice(2)));}
 catch{
  // Avoid exposing tokens, prompts, provider responses, URLs or private file names.
  console.error('Agent generation rejected; verify input, provider access and explicit cost/data consent.');
  process.exitCode=1;
 }
}
