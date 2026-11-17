// Local stdio MCP for private multi-agent site-promotion campaigns.
// No model calls, network access, GitHub writes, social posts or hosted identities.
import {fileURLToPath} from 'node:url';
import {createAgentCampaignWorkspace} from '../agents/campaign-workspace.mjs';
import {runStdio} from './stdio.mjs';

const response=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
const errorResponse=()=>({...response('Campaign workspace request denied'),isError:true});

export function createAgentCampaignSessionFromEnv({
 env=process.env,now=()=>new Date(),localMainShaProvider
}={}){
 if(!env||typeof env!=='object')throw new TypeError('Campaign MCP configuration rejected');
 return createAgentCampaignWorkspace({
  stateDir:env.MCP_CAMPAIGN_STATE_DIR,
  ownerId:env.MCP_CAMPAIGN_OWNER_ID,
  publisherAgentId:env.MCP_CAMPAIGN_PUBLISHER_AGENT_ID,
  privateKeyPath:env.MCP_CAMPAIGN_PRIVATE_KEY,
  publicKeyPath:env.MCP_CAMPAIGN_PUBLIC_KEY,
  now,localMainShaProvider
 });
}

const tools=[
 {
  name:'create_promotion_campaign',
  description:'Create one private article campaign for a public HTTPS website. Supply operator-approved facts, a transparent relationship disclosure and a reader-first topic. This creates the first research task; it does not publish or post externally.',
  inputSchema:{type:'object',properties:{
   campaignName:{type:'string',minLength:5,maxLength:80},
   targetSiteName:{type:'string',minLength:2,maxLength:100},
   targetUrl:{type:'string',format:'uri',maxLength:2048},
   audience:{type:'string',minLength:20,maxLength:500},
   goal:{type:'string',minLength:20,maxLength:300},
   relationshipDisclosure:{type:'string',minLength:20,maxLength:240},
   productFacts:{type:'array',minItems:1,maxItems:12,items:{type:'string',minLength:10,maxLength:400}},
   prohibitedClaims:{type:'array',maxItems:12,items:{type:'string',minLength:5,maxLength:300}},
   topic:{type:'object',properties:{
    workingTitle:{type:'string',minLength:5,maxLength:160},
    readerProblem:{type:'string',minLength:20,maxLength:300},
    angle:{type:'string',minLength:20,maxLength:500}
   },required:['workingTitle','readerProblem','angle'],additionalProperties:false}
  },required:['campaignName','targetSiteName','targetUrl','audience','goal',
   'relationshipDisclosure','productFacts','prohibitedClaims','topic'],additionalProperties:false}
 },
 {
  name:'list_campaigns',
  description:'List recent campaigns in the shared private workspace so agents can resume work after a client restart.',
  inputSchema:{type:'object',properties:{
   limit:{type:'integer',minimum:1,maximum:50}
  },additionalProperties:false}
 },
 {
  name:'claim_campaign_task',
  description:'Claim the next queued task for one role. Returns the campaign brief and prior agent artifacts. Claims expire after 15 minutes; expired or abandoned tasks can be reclaimed up to three attempts.',
  inputSchema:{type:'object',properties:{
   campaignId:{type:'string',format:'uuid'},role:{type:'string',enum:['researcher','strategist','writer','seo-editor','fact-checker','editorial-reviewer']},
   agentId:{type:'string',pattern:'^[a-z][a-z0-9-]{2,63}$'}
  },required:['campaignId','role','agentId'],additionalProperties:false}
 },
 {
  name:'submit_campaign_task_result',
  description:'Submit the result for the task held by this agent. Research requires 2–8 HTTPS sources; draft/revision requires one contextual target link and the exact relationship disclosure; review decisions are advisory and never replace human review.',
  inputSchema:{type:'object',properties:{
   campaignId:{type:'string',format:'uuid'},taskId:{type:'string',format:'uuid'},
   agentId:{type:'string',pattern:'^[a-z][a-z0-9-]{2,63}$'},
   leaseToken:{type:'string',minLength:20,maxLength:100},
   result:{type:'object',description:'Stage-specific structured result. See docs/AGENT_CAMPAIGN_MCP.md; the server validates exact fields for the claimed stage.'}
  },required:['campaignId','taskId','agentId','leaseToken','result'],additionalProperties:false}
 },
 {
  name:'release_campaign_task',
  description:'Return a claimed task to the queue with a short blocker reason. No automatic retry is made; the task is reassignable until its three-attempt limit.',
  inputSchema:{type:'object',properties:{
   campaignId:{type:'string',format:'uuid'},taskId:{type:'string',format:'uuid'},
   agentId:{type:'string',pattern:'^[a-z][a-z0-9-]{2,63}$'},
   leaseToken:{type:'string',minLength:20,maxLength:100},reason:{type:'string',minLength:10,maxLength:500}
  },required:['campaignId','taskId','agentId','leaseToken','reason'],additionalProperties:false}
 },
 {
  name:'send_campaign_message',
  description:'Send a private task-scoped message to another local agent or broadcast to the campaign team. Messages never appear on 24go.top or in human discussions.',
  inputSchema:{type:'object',properties:{
   campaignId:{type:'string',format:'uuid'},taskId:{type:'string',format:'uuid'},
   fromAgent:{type:'string',pattern:'^[a-z][a-z0-9-]{2,63}$'},
   toAgent:{type:'string',pattern:'^[a-z][a-z0-9-]{2,63}$'},
   kind:{type:'string',enum:['handoff','question','finding','blocker']},
   body:{type:'string',minLength:10,maxLength:4000}
  },required:['campaignId','fromAgent','kind','body'],additionalProperties:false}
 },
 {
  name:'read_campaign_messages',
  description:'Read private campaign messages. Set agentId to receive broadcasts, messages to that agent and messages sent by that agent.',
  inputSchema:{type:'object',properties:{
   campaignId:{type:'string',format:'uuid'},
   agentId:{type:'string',pattern:'^[a-z][a-z0-9-]{2,63}$'},
   afterMessageId:{type:'string',format:'uuid'}
  },required:['campaignId'],additionalProperties:false}
 },
 {
  name:'get_campaign_status',
  description:'Read campaign progress, role assignments, lease expiry and prior research/draft/review artifacts. No secrets or provider credentials are stored in this workspace.',
  inputSchema:{type:'object',properties:{campaignId:{type:'string',format:'uuid'}},
   required:['campaignId'],additionalProperties:false}
 },
 {
  name:'finalize_campaign_article',
  description:'After all agent review stages are ready, validate the chosen UTC publication time, sign the article with the owner-pinned local Ed25519 key and create a private publication bundle plus exact digest. No GitHub call or public write occurs; a separate publication MCP and human PR review are still required.',
  inputSchema:{type:'object',properties:{
   campaignId:{type:'string',format:'uuid'},
   publicationTime:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$'},
   confirmPrivateFinalization:{type:'boolean',const:true}
  },required:['campaignId','publicationTime','confirmPrivateFinalization'],additionalProperties:false}
 }
];

export function handleAgentCampaignMcpRequest(req,session){
 if(!req||req.jsonrpc!=='2.0'||typeof req.method!=='string')
  return {error:{code:-32600,message:'Invalid JSON-RPC request'}};
 switch(req.method){
 case 'initialize':
  return {result:{
   protocolVersion:req.params?.protocolVersion==='2025-11-25'?'2025-11-25':'2025-06-18',
   capabilities:{tools:{}},
   serverInfo:{name:'24gotop-local-agent-campaigns',version:'1.0.0'},
   instructions:'Private local multi-agent campaign workspace. Worker agents coordinate through role-based tasks and private messages without access to the publisher signing key. Only a separately configured operator-controlled publisher process exposes private article finalization. Publication remains a separate exact-digest-approved DRAFT PR and human merge. No hosted agent accounts, public comments, cross-posting or automatic publication.'
  }};
 case 'ping':return {result:{}};
 case 'tools/list':return {result:{tools:session.finalizeAvailable?tools:tools.filter(tool=>tool.name!=='finalize_campaign_article')}};
 case 'tools/call':{
  const name=req.params?.name,args=req.params?.arguments??{};
  try{
   if(name==='create_promotion_campaign')return {result:response(session.createCampaign(args))};
   if(name==='list_campaigns')return {result:response(session.listCampaigns(args))};
   if(name==='claim_campaign_task')return {result:response(session.claimTask(args))};
   if(name==='submit_campaign_task_result')return {result:response(session.submitTaskResult(args))};
   if(name==='release_campaign_task')return {result:response(session.releaseTask(args))};
   if(name==='send_campaign_message')return {result:response(session.sendMessage(args))};
   if(name==='read_campaign_messages')return {result:response(session.readMessages(args))};
   if(name==='get_campaign_status')return {result:response(session.getStatus(args))};
   if(name==='finalize_campaign_article')return {result:response(session.finalizeArticle(args))};
   return {result:errorResponse()};
  }catch{return {result:errorResponse()};}
 }
 default:return {error:{code:-32601,message:'Method not found'}};
 }
}

export function runAgentCampaignMcpStdio({
 env=process.env,now=()=>new Date(),localMainShaProvider,
 input=process.stdin,output=process.stdout
}={}){
 const session=createAgentCampaignSessionFromEnv({env,now,localMainShaProvider});
 return runStdio({input,output,articles:[],
  requestHandler:req=>handleAgentCampaignMcpRequest(req,session)});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{runAgentCampaignMcpStdio();}
 catch{
  process.stderr.write('Campaign MCP initialization rejected; check the private workspace, pinned identity and protected local settings.\n');
  process.exitCode=1;
 }
}
