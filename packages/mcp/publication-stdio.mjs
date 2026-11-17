// Local stdio MCP for owner-approved static article publication PRs.
// This uploads the full manuscript to a public DRAFT GitHub PR only after
// explicit operator opt-in; it never merges, moderates or deploys.
import {constants,closeSync,fstatSync,openSync,readFileSync,realpathSync} from 'node:fs';
import {isAbsolute,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {MAX_AGENT_PROPOSAL_BYTES} from '../agents/editorial-proposal.mjs';
import {
 prepareAgentArticlePublication,submitGitHubArticlePublicationPR,
 getLocalMainCheckout
} from '../agents/article-publication.mjs';
import {runStdio} from './stdio.mjs';

const HASH=/^[a-f0-9]{64}$/;
const GIT_SHA=/^[a-f0-9]{40}$/;
const REPO_ROOT=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const reject=()=>{throw new TypeError('Article publication MCP configuration rejected');};
const response=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
const errorResponse=()=>({...response('Article publication request denied'),isError:true});

function assertOutsideRepo(path){
 if(typeof path!=='string'||!isAbsolute(path))reject();
 const actual=realpathSync(path),rel=relative(REPO_ROOT,actual);
 if(rel===''||(rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel)))reject();
 return path;
}

function boundedLocalFile(path,max,privateOnly=false){
 if(typeof path!=='string'||!isAbsolute(path)||path.length>4096)reject();
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const stat=fstatSync(fd);
  if(!stat.isFile()||stat.size<1||stat.size>max||
   (privateOnly&&process.platform!=='win32'&&(stat.mode&0o077)!==0))reject();
  const bytes=readFileSync(fd);
  if(bytes.length<1||bytes.length>max)reject();
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 }finally{closeSync(fd);}
}

export function createAgentArticlePublicationSession({
 raw,publicKey,expectedOwnerId,expectedAgentId,summary,publicationTime,
 now=new Date(),allowPublicPr=false,approvedPublicationSha256=null,
 token=null,fetchImpl=globalThis.fetch,localMainShaProvider=getLocalMainCheckout
}={}){
 if(allowPublicPr!==true&&allowPublicPr!==false)reject();
 if(typeof localMainShaProvider!=='function')reject();
 if(allowPublicPr&&(!HASH.test(approvedPublicationSha256||'')||
  typeof token!=='string'||token.length<10||/\s/u.test(token)||
  typeof fetchImpl!=='function'))reject();

 // Pin the clean main revision before reading any repository source. Recheck
 // after generation so a moving or dirty checkout cannot seed stale assets.
 const sourceMainSha=localMainShaProvider();
 if(!GIT_SHA.test(sourceMainSha||''))reject();
 const publication=prepareAgentArticlePublication({
  raw,publicKey,expectedOwnerId,expectedAgentId,summary,publicationTime,now
 });
 if(localMainShaProvider()!==sourceMainSha)reject();
 if(allowPublicPr&&approvedPublicationSha256!==publication.publicationSha256)reject();

 let attempted=false;
 return Object.freeze({
  publication,canSubmit:allowPublicPr,sourceMainSha,
  async submit(digest,confirmation){
   if(!allowPublicPr||attempted||digest!==publication.publicationSha256||
    confirmation!==true)reject();
   // Consume authorization before the first network or git operation.
   attempted=true;
   const currentLocalMainSha=localMainShaProvider();
   if(currentLocalMainSha!==sourceMainSha)reject();
   return submitGitHubArticlePublicationPR({
    publication,token,fetchImpl,localMainSha:sourceMainSha
   });
  }
 });
}

export function createAgentArticlePublicationSessionFromEnv({
 env=process.env,fetchImpl=globalThis.fetch,now=new Date(),
 localMainShaProvider=getLocalMainCheckout
}={}){
 if(!env||typeof env!=='object')reject();
 const flag=env.MCP_AGENT_ALLOW_PUBLIC_PR;
 if(flag!==undefined&&!['0','1'].includes(flag))reject();
 const allowPublicPr=flag==='1';
 const packagePath=assertOutsideRepo(env.MCP_AGENT_PACKAGE);
 const publicKeyPath=assertOutsideRepo(env.MCP_AGENT_PUBLIC_KEY);
 const summaryPath=assertOutsideRepo(env.MCP_AGENT_PUBLIC_SUMMARY);
 return createAgentArticlePublicationSession({
  raw:boundedLocalFile(packagePath,MAX_AGENT_PROPOSAL_BYTES,true),
  publicKey:boundedLocalFile(publicKeyPath,8192),
  summary:boundedLocalFile(summaryPath,2048,true),
  expectedOwnerId:env.MCP_AGENT_OWNER_ID,
  expectedAgentId:env.MCP_AGENT_ID,
  publicationTime:env.MCP_AGENT_PUBLICATION_TIME,
  allowPublicPr,
  approvedPublicationSha256:env.MCP_AGENT_APPROVED_PUBLICATION_SHA256,
  token:allowPublicPr?env.GITHUB_TOKEN:null,
  fetchImpl,now,localMainShaProvider
 });
}

const previewTool={
 name:'preview_article_publication',
 description:'Preview a complete static article publication package generated from a locally signed, owner-pinned manuscript. Returns exact file list and package digest. No network calls or uploads.',
 inputSchema:{type:'object',properties:{},additionalProperties:false}
};
const submitTool={
 name:'submit_article_publication_pr',
 description:'Upload the complete article and derived public feeds/search/sitemap as ONE DRAFT GitHub PR. Only available when the operator pre-authorized the exact publication package digest and supplied a repository-scoped Contents/Pull requests token. Never merges or deploys.',
 inputSchema:{type:'object',properties:{
  publicationSha256:{type:'string',pattern:'^[a-f0-9]{64}$'},
  confirmPublic:{type:'boolean',const:true}
 },required:['publicationSha256','confirmPublic'],additionalProperties:false}
};

export function handleAgentArticlePublicationMcpRequest(req,session){
 if(!req||req.jsonrpc!=='2.0'||typeof req.method!=='string')
  return {error:{code:-32600,message:'Invalid JSON-RPC request'}};
 switch(req.method){
 case 'initialize':
  return {result:{
   protocolVersion:req.params?.protocolVersion==='2025-11-25'?'2025-11-25':'2025-06-18',
   capabilities:{tools:{}},
   serverInfo:{name:'24gotop-static-article-publication',version:'1.0.0'}
  }};
 case 'ping':return {result:{}};
 case 'tools/list':
  return {result:{tools:session.canSubmit?[previewTool,submitTool]:[previewTool]}};
 case 'tools/call':{
  const name=req.params?.name,args=req.params?.arguments??{};
  if(!args||typeof args!=='object'||Array.isArray(args))return {result:errorResponse()};
  if(name==='preview_article_publication'){
   if(Object.keys(args).length)return {result:errorResponse()};
   const p=session.publication;
   return {result:response({
    title:p.title,summary:p.summary,canonicalUrl:p.canonicalUrl,
    publicationTime:p.publicationTime,sourceMainSha:session.sourceMainSha,
    ownerId:p.ownerId,agentId:p.agentId,
    keyFingerprint:p.keyFingerprint,manuscriptSha256:p.manuscriptSha256,
    publicationSha256:p.publicationSha256,files:p.filePaths,
    state:'draft-publication-preview-only',published:false,submitted:false,
    note:'The full manuscript is not returned by this tool. If explicitly submitted, it becomes public in a DRAFT GitHub PR; only human review, merge and verified Pages delivery publish the article.'
   })};
  }
  if(name==='submit_article_publication_pr'&&session.canSubmit){
   if(Object.keys(args).length!==2||!Object.hasOwn(args,'publicationSha256')||
    !Object.hasOwn(args,'confirmPublic'))return {result:errorResponse()};
   return session.submit(args.publicationSha256,args.confirmPublic).then(
    result=>({result:response({
     pullRequestUrl:result.url,created:result.created,draft:true,
     published:false,state:result.state,
     publicationSha256:result.publicationSha256,
     note:'The full article is public in this DRAFT PR, not on the 24GOTOP website. Human review, merge and verified GitHub Pages deployment are still required.'
    })}),
    ()=>({result:errorResponse()})
   );
  }
  return {result:errorResponse()};
 }
 default:return {error:{code:-32601,message:'Method not found'}};
 }
}

export function runAgentArticlePublicationMcpStdio({
 env=process.env,fetchImpl=globalThis.fetch,now=new Date(),
 localMainShaProvider=getLocalMainCheckout,input=process.stdin,output=process.stdout
}={}){
 const session=createAgentArticlePublicationSessionFromEnv({
  env,fetchImpl,now,localMainShaProvider
 });
 return runStdio({input,output,articles:[],
  requestHandler:req=>handleAgentArticlePublicationMcpRequest(req,session)});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{runAgentArticlePublicationMcpStdio();}
 catch{
  process.stderr.write('Article publication MCP initialization rejected; check trusted local files and settings.\n');
  process.exitCode=1;
 }
}
