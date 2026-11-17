// Opt-in, operator-pinned editorial MCP bridge. PUBLIC GitHub Issues only.
// Never exposes the full signed manuscript to MCP tools or publishes articles.
import {constants,closeSync,fstatSync,openSync,readFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareGitHubAgentProposal,submitGitHubAgentProposal} from '../agents/github-proposal.mjs';
import {MAX_AGENT_PROPOSAL_BYTES} from '../agents/editorial-proposal.mjs';
import {runStdio} from './stdio.mjs';

const HASH=/^[a-f0-9]{64}$/;
const reject=()=>{throw new TypeError('Editorial MCP configuration rejected');};
const toolResponse=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
const toolError=()=>({...toolResponse('Editorial request denied'),isError:true});

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

/**
 * The operator pins all private inputs BEFORE starting MCP; clients cannot
 * select a path, key, identity, endpoint or GitHub repository.
 * A reviewed digest plus an explicit process opt-in gates at most one write.
 */
export function createEditorialMcpSession({
 raw,publicKey,expectedOwnerId,expectedAgentId,summary,now=new Date(),
 allowPublic=false,approvedSha256=null,token=null,fetchImpl=globalThis.fetch
}={}){
 const proposal=prepareGitHubAgentProposal(raw,{
  publicKey,expectedOwnerId,expectedAgentId,summary,now
 });
 if(allowPublic!==true&&allowPublic!==false)reject();
 if(allowPublic&&(!HASH.test(approvedSha256)||approvedSha256!==proposal.sha256||
    typeof token!=='string'||token.length<10||/\s/u.test(token)||
    typeof fetchImpl!=='function'))reject();
 let attempted=false;
 const canSubmit=allowPublic;
 return Object.freeze({
  proposal,canSubmit,
  async submit(digest,confirmation){
   if(!canSubmit||attempted||digest!==proposal.sha256||confirmation!==true)
    throw new TypeError('Editorial MCP submission not authorized');
   // Mark BEFORE the first network call; ambiguous timeout cannot be retried.
   attempted=true;
   return submitGitHubAgentProposal({proposal,token,fetchImpl});
  }
 });
}

export function createEditorialMcpSessionFromEnv({
 env=process.env,fetchImpl=globalThis.fetch,now=new Date()
}={}){
 if(!env||typeof env!=='object')reject();
 const allowPublic=env.MCP_AGENT_ALLOW_PUBLIC_ISSUE==='1';
 if(env.MCP_AGENT_ALLOW_PUBLIC_ISSUE!==undefined&&
    !['0','1'].includes(env.MCP_AGENT_ALLOW_PUBLIC_ISSUE))reject();
 return createEditorialMcpSession({
  raw:boundedLocalFile(env.MCP_AGENT_PACKAGE,MAX_AGENT_PROPOSAL_BYTES,true),
  publicKey:boundedLocalFile(env.MCP_AGENT_PUBLIC_KEY,8192),
  summary:boundedLocalFile(env.MCP_AGENT_PUBLIC_SUMMARY,1250),
  expectedOwnerId:env.MCP_AGENT_OWNER_ID,
  expectedAgentId:env.MCP_AGENT_ID,
  allowPublic,approvedSha256:env.MCP_AGENT_APPROVED_SHA256,
  token:env.GITHUB_TOKEN,fetchImpl,now
 });
}

const previewTool={
 name:'preview_editorial_issue',
 description:'Preview ONLY public GitHub Issue metadata for an independently pinned, signed local agent manuscript. No manuscript text, credentials, network calls, or publication.',
 inputSchema:{type:'object',properties:{},additionalProperties:false}
};
const submitTool={
 name:'submit_reviewed_editorial_issue',
 description:'Create or find ONE public GitHub editorial proposal Issue, never an article. Requires operator-enabled process, pinned reviewed SHA-256, scoped token and explicit consent.',
 inputSchema:{type:'object',properties:{
  sha256:{type:'string',pattern:'^[a-f0-9]{64}$'},
  confirmPublic:{type:'boolean',const:true}
 },required:['sha256','confirmPublic'],additionalProperties:false}
};

export function handleEditorialMcpRequest(req,session){
 if(!req||req.jsonrpc!=='2.0'||typeof req.method!=='string')
  return {error:{code:-32600,message:'Invalid JSON-RPC request'}};
 switch(req.method){
 case 'initialize':
  return {result:{
   protocolVersion:req.params?.protocolVersion==='2025-11-25'?'2025-11-25':'2025-06-18',
   capabilities:{tools:{}},serverInfo:{name:'24gotop-reviewed-editorial-issues',version:'1.0.0'}
  }};
 case 'ping':return {result:{}};
 case 'tools/list':
  return {result:{tools:session.canSubmit?[previewTool,submitTool]:[previewTool]}};
 case 'tools/call':{
  const name=req.params?.name,args=req.params?.arguments??{};
  if(!args||typeof args!=='object'||Array.isArray(args))
   return {result:toolError()};
  if(name==='preview_editorial_issue'){
   if(Object.keys(args).length)return {result:toolError()};
   const {title,body,sha256}=session.proposal;
   return {result:toolResponse({title,body,sha256,
    state:'public-issue-preview-only',published:false,
    note:'Review the exact public metadata before enabling a separate scoped write session.'})};
  }
  if(name==='submit_reviewed_editorial_issue'&&session.canSubmit){
   if(Object.keys(args).length!==2||!Object.hasOwn(args,'sha256')||
      !Object.hasOwn(args,'confirmPublic'))return {result:toolError()};
   return session.submit(args.sha256,args.confirmPublic).then(
    result=>({result:toolResponse({issueUrl:result.url,created:result.created,
     published:false,note:'An Issue is a proposal; a reviewed PR and verified Pages deployment are still required.'})}),
    ()=>({result:toolError()})
   );
  }
  return {result:toolError()};
 }
 default:return {error:{code:-32601,message:'Method not found'}};
 }
}

export function runEditorialMcpStdio({
 env=process.env,fetchImpl=globalThis.fetch,now=new Date(),
 input=process.stdin,output=process.stdout
}={}){
 const session=createEditorialMcpSessionFromEnv({env,fetchImpl,now});
 return runStdio({input,output,articles:[],
  requestHandler:req=>handleEditorialMcpRequest(req,session)});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{runEditorialMcpStdio();}
 catch{
  process.stderr.write('Editorial MCP initialization rejected; check trusted local configuration.\n');
  process.exitCode=1;
 }
}
