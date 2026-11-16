#!/usr/bin/env node
/**
 * One-shot operator-run agent editorial preparation.
 *
 * Public OSS only: one BYOK inference, local canonical manuscript, signed
 * owner-pinned review handoff, and public-issue PREVIEW. There is no
 * issue creation, scheduled loop, posting, moderation or DB write.
 */
import {constants,closeSync,fstatSync,mkdirSync,openSync,readFileSync,
 realpathSync,rmdirSync,writeFileSync} from 'node:fs';
import {createPrivateKey,createPublicKey} from 'node:crypto';
import {basename,dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateAgentGenerationInput,validateAgentGeneratorProvider,
 generateAgentArticleDraft} from './draft-generator.mjs';
import {scanDraftSharingRisks} from '../../site/draft-lab-privacy.js';
import {createSignedAgentProposal,verifySignedAgentProposal} from './editorial-proposal.mjs';
import {prepareGitHubAgentProposal} from './github-proposal.mjs';

const DENIED=()=>{throw new TypeError('Agent editorial preparation rejected');};
const ID=/^[a-z][a-z0-9-]{2,63}$/;
const REPO_ROOT=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));

export function parseAgentPrepareArgs(args){
 if(!Array.isArray(args))DENIED();
 const fields=['job','output-dir','private-key','public-key','owner-id','agent-id'];
 const flags=['confirm-costs','confirm-provider-data'];
 const options={};
 for(let i=0;i<args.length;i++){
  const item=args[i],key=typeof item==='string'&&item.startsWith('--')
   ?item.slice(2):'';
  if(![...fields,...flags].includes(key)||Object.hasOwn(options,key))DENIED();
  if(flags.includes(key))options[key]=true;
  else{
   const value=args[++i];
   if(typeof value!=='string'||!value||value.startsWith('--')||
      value.length>4096)DENIED();
   options[key]=value;
  }
 }
 if(fields.some(field=>!options[field])||
    !options['confirm-costs']||!options['confirm-provider-data']||
    !ID.test(options['owner-id'])||!ID.test(options['agent-id']))DENIED();
 return Object.freeze(options);
}

function boundedRead(path,max,privateOnly=false){
 if(typeof path!=='string'||!path||path.length>4096)DENIED();
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const info=fstatSync(fd);
  if(!info.isFile()||info.size===0||info.size>max||
     (privateOnly&&process.platform!=='win32'&&(info.mode&0o077)!==0))DENIED();
  const bytes=readFileSync(fd);
  if(bytes.length===0||bytes.length>max)DENIED();
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 }finally{closeSync(fd);}
}

export function validateAgentPrepareJob(job){
 if(!job||typeof job!=='object'||Array.isArray(job)||
    Object.keys(job).length!==2||
    !Object.hasOwn(job,'article')||!Object.hasOwn(job,'publicSummary'))DENIED();
 const article=validateAgentGenerationInput(job.article);
 const summary=job.publicSummary;
 if(typeof summary!=='string'||summary.length<80||summary.length>1200||
    summary.trim()!==summary||
    /[\u0000-\u001f\u007f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u.test(summary)||
    /@[A-Za-z0-9_-]/u.test(summary)||
    scanDraftSharingRisks({title:article.title,body:summary,source:''}).flagged)
   DENIED();
 return Object.freeze({article,publicSummary:summary});
}

function pinnedIdentity(privatePem,publicPem){
 let privateKey,claimedPublic;
 try{
  if(!privatePem.startsWith('-----BEGIN PRIVATE KEY-----')||
     !publicPem.startsWith('-----BEGIN PUBLIC KEY-----'))DENIED();
  privateKey=createPrivateKey(privatePem);
  claimedPublic=createPublicKey(publicPem);
  if(privateKey.asymmetricKeyType!=='ed25519'||
     claimedPublic.asymmetricKeyType!=='ed25519')DENIED();
  const raw=key=>key.export({format:'der',type:'spki'});
  const actual=raw(createPublicKey(privateKey));
  const expected=raw(claimedPublic);
  if(actual.length!==expected.length||!actual.equals(expected))DENIED();
 }catch{DENIED();}
 return {privateKey,publicKey:claimedPublic};
}

function newPrivateOutputDir(path){
 if(typeof path!=='string'||!path||path.length>4096)DENIED();
 const absolute=resolve(path);
 // Never put unpublished drafts, identity metadata or review packages
 // inside the checked-out public Git repository, even under ignored files.
 const parent=realpathSync(dirname(absolute));
 const relation=relative(REPO_ROOT,parent);
 if(relation===''||(!relation.startsWith('..'+sep)&&
    relation!=='..'&&!isAbsolute(relation)))DENIED();
 if(!basename(absolute)||basename(absolute)==='.'||
    basename(absolute)==='..')DENIED();
 return absolute;
}

export async function runAgentPrepareCommand(args,{
 env=process.env,fetchImpl=globalThis.fetch,now=()=>new Date()
}={}){
 const options=parseAgentPrepareArgs(args);
 const job=validateAgentPrepareJob(JSON.parse(boundedRead(options.job,10000)));
 const provider=validateAgentGeneratorProvider({
  endpoint:env.AGENT_DRAFT_ENDPOINT,
  model:env.AGENT_DRAFT_MODEL,
  key:env.AGENT_DRAFT_KEY
 });
 const identity=pinnedIdentity(
  boundedRead(options['private-key'],8192,true),
  boundedRead(options['public-key'],8192)
 );
 if(typeof fetchImpl!=='function'||typeof now!=='function')DENIED();
 const timestamp=now();
 if(!(timestamp instanceof Date)||!Number.isFinite(timestamp.getTime()))DENIED();
 const directory=newPrivateOutputDir(options['output-dir']);
 // Reserve the entire job destination before even one potentially paid
 // provider request. Existing job dirs are an idempotent, fail-closed stop.
 mkdirSync(directory,{recursive:false,mode:0o700});
 let complete=false;
 try{
  const markdown=await generateAgentArticleDraft({
   input:job.article,provider,fetchImpl
  });
  const signed=createSignedAgentProposal({
   document:markdown,ownerId:options['owner-id'],
   agentId:options['agent-id'],privateKey:identity.privateKey,
   now:timestamp
  });
  const checked=verifySignedAgentProposal(signed,{
   publicKey:identity.publicKey,
   expectedOwnerId:options['owner-id'],
   expectedAgentId:options['agent-id']
  });
  const issue=prepareGitHubAgentProposal(signed,{
   publicKey:identity.publicKey,
   expectedOwnerId:options['owner-id'],
   expectedAgentId:options['agent-id'],
   summary:job.publicSummary,now:timestamp
  });
  // Write no public content, no GitHub token, and no provider config.
  // The preview is intentionally human-checkable before using agent:propose.
  const artifacts=[
   ['draft.md',markdown],
   ['signed-proposal.json',JSON.stringify(signed)+'\n'],
   ['public-summary.txt',job.publicSummary],
   ['issue-preview.json',JSON.stringify({
    title:issue.title,body:issue.body
   },null,2)+'\n'],
   ['receipt.json',JSON.stringify({
    version:1,state:'awaiting-human-review',kind:'local-agent-editorial-preparation',
    ownerId:checked.ownerId,agentId:checked.agentId,
    draftSha256:checked.sha256,publicKeyFingerprint:checked.keyFingerprint,
    createdAt:checked.createdAt,published:false,submitted:false
   },null,2)+'\n']
  ];
  for(const [file,text] of artifacts){
   writeFileSync(join(directory,file),text,{flag:'wx',mode:0o600});
  }
  complete=true;
  return 'Created a private signed editorial review bundle (awaiting human review). '+
   'No GitHub issue, hosted agent account or article publication occurred.';
 }finally{
  // Only remove an EMPTY directory we exclusively created. Never delete
  // any draft on unexpected write failures or under user modification.
  if(!complete){
   try{rmdirSync(directory);}catch{/* preserve any files for manual inspection */}
  }
 }
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(await runAgentPrepareCommand(process.argv.slice(2)));}
 catch{
  // No prompt, model output, local key/path, token or response body in logs.
  console.error('Agent editorial preparation failed. Check inputs, keys, costs and output directory.');
  process.exitCode=1;
 }
}
