// Local BYOK authoring MCP for one-shot, owner-pinned AI article drafts.
// It performs one configured model request and saves a private signed review bundle.
// It never uploads a manuscript, creates a GitHub Issue/PR or publishes content.
import {
 constants,closeSync,fstatSync,lstatSync,mkdtempSync,openSync,readFileSync,
 realpathSync,writeFileSync,unlinkSync,rmdirSync
} from 'node:fs';
import {isAbsolute,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 runAgentPrepareCommand,validateAgentPrepareJob
} from '../agents/editorial-runner.mjs';
import {validateAgentGeneratorProvider} from '../agents/draft-generator.mjs';
import {
 prepareAgentArticlePublication,validateAgentArticlePublicationTime,getLocalMainCheckout
} from '../agents/article-publication.mjs';
import {runStdio} from './stdio.mjs';

const ROOT=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const ID=/^[a-z][a-z0-9-]{2,63}$/;
const reject=()=>{throw new TypeError('Agent authoring MCP configuration or request rejected');};
const response=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
const errorResponse=()=>({...response('Article authoring request denied'),isError:true});
const exact=(value,keys)=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&
 Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)));

function assertOutsideRepo(path){
 if(typeof path!=='string'||!isAbsolute(path)||path.length>4096)reject();
 const actual=realpathSync(path),rel=relative(ROOT,actual);
 if(rel===''||(rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel)))reject();
 return path;
}
function privateOutputRoot(path){
 if(typeof path!=='string'||!isAbsolute(path)||path.length>4096)reject();
 const info=lstatSync(path);
 if(info.isSymbolicLink()||!info.isDirectory()||
  (process.platform!=='win32'&&(info.mode&0o077)!==0))reject();
 return assertOutsideRepo(path);
}
function boundedLocalFile(path,max,privateOnly=false){
 assertOutsideRepo(path);
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const info=fstatSync(fd);
  if(!info.isFile()||info.size<1||info.size>max||
   (privateOnly&&process.platform!=='win32'&&(info.mode&0o077)!==0))reject();
  const bytes=readFileSync(fd);
  if(bytes.length<1||bytes.length>max)reject();
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 }finally{closeSync(fd);}
}

function validateRequest(input,now){
 if(!exact(input,['article','publicSummary','publicationTime','confirmCosts','confirmProviderData'])||
  input.confirmCosts!==true||input.confirmProviderData!==true)reject();
 const job=validateAgentPrepareJob({
  article:input.article,publicSummary:input.publicSummary
 });
 if(job.article.locale!=='en'||!job.article.source.startsWith('https:')||
  job.publicSummary.length<80||job.publicSummary.length>320)reject();
 const publicationTime=validateAgentArticlePublicationTime(input.publicationTime,now);
 return Object.freeze({job,publicationTime});
}

export function createAgentAuthoringSession({
 env=process.env,fetchImpl=globalThis.fetch,now=()=>new Date(),
 localMainShaProvider=getLocalMainCheckout
}={}){
 if(!env||typeof env!=='object'||typeof fetchImpl!=='function'||typeof now!=='function'||
  typeof localMainShaProvider!=='function')reject();
 const outputRoot=privateOutputRoot(env.MCP_AGENT_OUTPUT_ROOT);
 const privateKeyPath=assertOutsideRepo(env.MCP_AGENT_PRIVATE_KEY);
 const publicKeyPath=assertOutsideRepo(env.MCP_AGENT_PUBLIC_KEY);
 const ownerId=env.MCP_AGENT_OWNER_ID,agentId=env.MCP_AGENT_ID;
 if(typeof ownerId!=='string'||!ID.test(ownerId)||
  typeof agentId!=='string'||!ID.test(agentId))reject();
 validateAgentGeneratorProvider({
  endpoint:env.AGENT_DRAFT_ENDPOINT,model:env.AGENT_DRAFT_MODEL,key:env.AGENT_DRAFT_KEY
 });
 let attempted=false;
 return Object.freeze({
  async prepare(input){
   if(attempted)reject();
   const timestamp=now();
   if(!(timestamp instanceof Date)||!Number.isFinite(timestamp.getTime()))reject();
   const {job,publicationTime}=validateRequest(input,timestamp);
   const sourceMainSha=localMainShaProvider();
   if(!/^[a-f0-9]{40}$/.test(sourceMainSha||''))reject();
   // Consume the process before creating files or contacting a model. An
   // ambiguous timeout must never cause an automatic paid retry.
   attempted=true;
   const workspace=mkdtempSync(join(outputRoot,'24gotop-authoring-'));
   const jobPath=join(workspace,'job.json');
   const outputDir=join(workspace,'review');
   let complete=false;
   try{
    writeFileSync(jobPath,JSON.stringify(job),{flag:'wx',mode:0o600});
    await runAgentPrepareCommand([
     '--job',jobPath,'--output-dir',outputDir,
     '--private-key',privateKeyPath,'--public-key',publicKeyPath,
     '--owner-id',ownerId,'--agent-id',agentId,
     '--confirm-costs','--confirm-provider-data'
    ],{env,fetchImpl,now:()=>timestamp});
    const signedProposalPath=join(outputDir,'signed-proposal.json');
    const draftPath=join(outputDir,'draft.md');
    const publicSummaryPath=join(outputDir,'public-summary.txt');
    const receiptPath=join(outputDir,'receipt.json');
    const publication=prepareAgentArticlePublication({
     raw:boundedLocalFile(signedProposalPath,81920,true),
     publicKey:boundedLocalFile(publicKeyPath,8192),
     expectedOwnerId:ownerId,expectedAgentId:agentId,
     summary:boundedLocalFile(publicSummaryPath,2048,true),
     publicationTime,now:timestamp
    });
    if(localMainShaProvider()!==sourceMainSha)reject();
    unlinkSync(jobPath);
    complete=true;
    return Object.freeze({
     state:'private-draft-awaiting-human-review',
     title:publication.title,summary:publication.summary,
     canonicalUrl:publication.canonicalUrl,
     publicationTime:publication.publicationTime,sourceMainSha,
     manuscriptSha256:publication.manuscriptSha256,
     publicationSha256:publication.publicationSha256,
     keyFingerprint:publication.keyFingerprint,
     files:publication.filePaths,
     workspacePath:workspace,outputDir,draftPath,signedProposalPath,
     publicSummaryPath,receiptPath,
     published:false,submitted:false,
     note:'One BYOK model request completed. The full manuscript and signed package remain in the private local output directory. Inspect the files, verify claims and rights, then use the separate publication MCP only after explicit owner approval. No GitHub or public write occurred.'
    });
   }finally{
    if(!complete){
     try{unlinkSync(jobPath);}catch{/* preserve non-empty partial review output */}
     try{rmdirSync(workspace);}catch{/* preserve partial artifacts for inspection */}
    }
   }
  }
 });
}

const prepareTool={
 name:'prepare_article_draft',
 description:'Generate one English technical article using the owner-configured BYOK model, sign it with the owner-pinned local Ed25519 identity, and save a private review bundle. Requires explicit per-call cost and provider-data consent. No GitHub or public write.',
 inputSchema:{type:'object',properties:{
  article:{type:'object',properties:{
   title:{type:'string',minLength:1,maxLength:160},
   brief:{type:'string',minLength:40,maxLength:2000},
   locale:{type:'string',const:'en'},
   category:{type:'string',enum:['news','models','tools','guides']},
   source:{type:'string',minLength:12,maxLength:2048},
   evidence:{type:'string',minLength:50,maxLength:3500}
  },required:['title','brief','locale','category','source','evidence'],additionalProperties:false},
  publicSummary:{type:'string',minLength:80,maxLength:320},
  publicationTime:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$'},
  confirmCosts:{type:'boolean',const:true},
  confirmProviderData:{type:'boolean',const:true}
 },required:['article','publicSummary','publicationTime','confirmCosts','confirmProviderData'],additionalProperties:false}
};

export function handleAgentAuthoringMcpRequest(req,session){
 if(!req||req.jsonrpc!=='2.0'||typeof req.method!=='string')
  return {error:{code:-32600,message:'Invalid JSON-RPC request'}};
 switch(req.method){
 case 'initialize':
  return {result:{
   protocolVersion:req.params?.protocolVersion==='2025-11-25'?'2025-11-25':'2025-06-18',
   capabilities:{tools:{}},
   serverInfo:{name:'24gotop-local-agent-authoring',version:'1.0.0'},
   instructions:'One configured BYOK article-generation request per process. Private local files only; no GitHub or website publication. Review the complete local manuscript and rights before using the separate publication MCP.'
  }};
 case 'ping':return {result:{}};
 case 'tools/list':return {result:{tools:[prepareTool]}};
 case 'tools/call':{
  if(req.params?.name!=='prepare_article_draft')return {result:errorResponse()};
  return session.prepare(req.params?.arguments??{}).then(
   value=>({result:response(value)}),
   ()=>({result:errorResponse()})
  );
 }
 default:return {error:{code:-32601,message:'Method not found'}};
 }
}

export function runAgentAuthoringMcpStdio({
 env=process.env,fetchImpl=globalThis.fetch,now=()=>new Date(),
 input=process.stdin,output=process.stdout
}={}){
 const session=createAgentAuthoringSession({env,fetchImpl,now});
 return runStdio({input,output,articles:[],
  requestHandler:req=>handleAgentAuthoringMcpRequest(req,session)});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{runAgentAuthoringMcpStdio();}
 catch{
  process.stderr.write('Agent authoring MCP initialization rejected; check trusted local files and protected settings.\n');
  process.exitCode=1;
 }
}
