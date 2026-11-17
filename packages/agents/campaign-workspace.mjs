// Private, durable multi-agent campaign workspace for the PUBLIC OSS toolchain.
// Agents coordinate through leased tasks and private messages; no network or public writes.
import {
 constants,closeSync,existsSync,fstatSync,lstatSync,mkdirSync,openSync,readFileSync,
 realpathSync,renameSync,unlinkSync,rmdirSync,writeFileSync
} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {isIP} from 'node:net';
import {isAbsolute,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 formatDraft,parseDraftFile,validateDraft
} from '../../site/draft-lab-logic.js';
import {scanDraftSharingRisks} from '../../site/draft-lab-privacy.js';
import {
 createSignedAgentProposal,verifySignedAgentProposal
} from './editorial-proposal.mjs';
import {prepareGitHubAgentProposal} from './github-proposal.mjs';
import {
 prepareAgentArticlePublication,validateAgentArticlePublicationTime,getLocalMainCheckout
} from './article-publication.mjs';

const ROOT=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const FORMAT='24gotop-local-agent-campaign-workspace';
const ID=/^[a-z][a-z0-9-]{2,63}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const GIT_SHA=/^[a-f0-9]{40}$/;
const CONTROL=/[\u0000-\u001f\u007f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
const MULTILINE_CONTROL=/[\u0000-\u0008\u000b-\u001f\u007f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
const ROLES=['researcher','strategist','writer','seo-editor','fact-checker','editorial-reviewer'];
const DECISIONS=['ready','changes_requested'];
const MAX_STATE_BYTES=8_000_000;
const MAX_CAMPAIGNS=50;
const MAX_TASKS=1200;
const MAX_MESSAGES=2000;
const MAX_CAMPAIGN_MESSAGES=120;
const LEASE_MS=15*60*1000;
const MAX_ATTEMPTS=3;
const reject=()=>{throw new TypeError('Campaign workspace request or local configuration rejected');};
const exact=(value,keys)=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&
 Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)));
const validText=(value,min,max)=>typeof value==='string'&&value.trim()===value&&
 value.length>=min&&value.length<=max&&!CONTROL.test(value);
const validMultilineText=(value,min,max)=>typeof value==='string'&&value.trim()===value&&
 value.length>=min&&value.length<=max&&!MULTILINE_CONTROL.test(value);
const isoNow=date=>date.toISOString().replace('.000Z','Z');
const hash=value=>createHash('sha256').update(value,'utf8').digest('hex');
const cleanAgentId=value=>typeof value==='string'&&ID.test(value);
const cleanUuid=value=>typeof value==='string'&&UUID.test(value);

function outsideRepo(path){
 if(typeof path!=='string'||!isAbsolute(path)||path.length>4096)reject();
 const actual=realpathSync(path),rel=relative(ROOT,actual);
 if(rel===''||(rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel)))reject();
 return path;
}
function privateDirectory(path){
 if(typeof path!=='string'||!isAbsolute(path)||path.length>4096)reject();
 const info=lstatSync(path);
 if(info.isSymbolicLink()||!info.isDirectory()||
  (process.platform!=='win32'&&(info.mode&0o077)!==0))reject();
 return outsideRepo(path);
}
function localFile(path,max,privateOnly=false){
 outsideRepo(path);
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
function publicHttpsUrl(value){
 if(typeof value!=='string'||value.length<12||value.length>2048||
  value.trim()!==value||CONTROL.test(value))return null;
 let url;
 try{url=new URL(value);}catch{return null;}
 const host=url.hostname.toLowerCase().replace(/^\[|\]$/gu,'');
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
  url.href!==value||!host.includes('.')||isIP(host)||
  host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||
  host.endsWith('.internal'))return null;
 return url.href;
}
function safeTextBundle(title,body,source=''){
 const scan=scanDraftSharingRisks({title,body,source});
 if(scan.flagged)reject();
}
function uniqueTexts(values,min,max,countMin,countMax){
 if(!Array.isArray(values)||values.length<countMin||values.length>countMax)return false;
 const seen=new Set();
 for(const value of values){
  if(!validText(value,min,max))return false;
  const key=value.normalize('NFC').toLocaleLowerCase();
  if(seen.has(key))return false;
  seen.add(key);
 }
 return true;
}
function validateCampaignInput(input){
 const keys=['campaignName','targetSiteName','targetUrl','audience','goal',
  'relationshipDisclosure','productFacts','prohibitedClaims','topic'];
 if(!exact(input,keys)||!validText(input.campaignName,5,80)||
  !validText(input.targetSiteName,2,100)||!publicHttpsUrl(input.targetUrl)||
  !validText(input.audience,20,500)||!validText(input.goal,20,300)||
  !validText(input.relationshipDisclosure,20,240)||
  !uniqueTexts(input.productFacts,10,400,1,12)||
  !Array.isArray(input.prohibitedClaims)||input.prohibitedClaims.length>12||
  input.prohibitedClaims.some(value=>!validText(value,5,300))||
  !exact(input.topic,['workingTitle','readerProblem','angle'])||
  !validText(input.topic.workingTitle,5,160)||
  !validText(input.topic.readerProblem,20,300)||
  !validText(input.topic.angle,20,500))reject();
 safeTextBundle(input.campaignName,
  [input.targetSiteName,input.audience,input.goal,input.relationshipDisclosure,
   ...input.productFacts,...input.prohibitedClaims,input.topic.workingTitle,
   input.topic.readerProblem,input.topic.angle].join('\n'));
 return input;
}
function validDecision(value){return DECISIONS.includes(value);}
function validateResearch(result){
 if(!exact(result,['summary','sources'])||!validMultilineText(result.summary,80,3000)||
  !Array.isArray(result.sources)||result.sources.length<2||result.sources.length>8)reject();
 const seen=new Set();
 for(const source of result.sources){
  if(!exact(source,['url','title','excerpt','supports'])||
   !publicHttpsUrl(source.url)||!validText(source.title,5,180)||
   !validMultilineText(source.excerpt,20,700)||!validText(source.supports,10,400))reject();
  if(seen.has(source.url))reject();
  seen.add(source.url);
  safeTextBundle(source.title,source.excerpt+'\n'+source.supports,source.url);
 }
 safeTextBundle('Research notes',result.summary);
 return result;
}
function validateStrategy(result){
 if(!exact(result,['angle','searchIntent','outline','suggestedTitle','publicSummary'])||
  !validText(result.angle,30,600)||!validText(result.searchIntent,20,300)||
  !validMultilineText(result.outline,100,2400)||!validText(result.suggestedTitle,5,160)||
  !validText(result.publicSummary,80,320))reject();
 safeTextBundle(result.suggestedTitle,[result.angle,result.searchIntent,result.outline,result.publicSummary].join('\n'));
 return result;
}
function validateDraftResult(result,campaign,topic,previous){
 if(!exact(result,['title','body','category','source','publicSummary'])||
  !validText(result.title,5,160)||!validMultilineText(result.body,20,12000)||
  !['news','models','tools','guides'].includes(result.category)||
  !publicHttpsUrl(result.source)||!validText(result.publicSummary,80,320))reject();
 const research=topic.artifacts.findLast(item=>item.stage==='research');
 if(!research||!research.result.sources.some(source=>source.url===result.source))reject();
 const draft={title:result.title,body:result.body,locale:'en',category:result.category,source:result.source};
 if(validateDraft(draft))reject();
 const targetCount=result.body.split(campaign.targetUrl).length-1;
 const disclosureCount=result.body.toLocaleLowerCase().split(
  campaign.relationshipDisclosure.toLocaleLowerCase()).length-1;
 if(targetCount!==1||disclosureCount!==1)reject();
 for(const claim of campaign.prohibitedClaims){
  if(result.body.toLocaleLowerCase().includes(claim.toLocaleLowerCase()))reject();
 }
 safeTextBundle(result.title,result.body,result.source);
 const document=formatDraft(draft);
 const parsed=parseDraftFile(document);
 if(parsed.body!==result.body)reject();
 return Object.freeze({...result,draft,document});
}
function validateStageResult(stage,result,campaign,topic){
 if(stage==='research')return validateResearch(result);
 if(stage==='strategy')return validateStrategy(result);
 if(stage==='draft')return validateDraftResult(result,campaign,topic,null);
 if(stage==='revision'){
  const previous=[...topic.artifacts].reverse().find(item=>item.stage==='draft'||item.stage==='revision');
  const next=validateDraftResult(result,campaign,topic,previous);
  if(previous&&previous.result.document===next.document)reject();
  return next;
 }
 if(stage==='seo_review'){
  if(!result||!['decision','findings'].every(key=>Object.hasOwn(result,key))||
   Object.keys(result).some(key=>!['decision','findings','suggestedTitle'].includes(key))||
   !validDecision(result.decision)||!validMultilineText(result.findings,80,3000)||
   (result.suggestedTitle!==undefined&&!validText(result.suggestedTitle,5,160)))reject();
  safeTextBundle('SEO review',result.findings);
  return result;
 }
 if(stage==='fact_check'){
  if(!exact(result,['decision','findings','unsupportedClaims','agentReportedVerifiedSourceUrls'])||
   !validDecision(result.decision)||!validMultilineText(result.findings,80,3000)||
   !Array.isArray(result.unsupportedClaims)||result.unsupportedClaims.length>20||
   result.unsupportedClaims.some(value=>!validText(value,5,400))||
   !Array.isArray(result.agentReportedVerifiedSourceUrls)||
   result.agentReportedVerifiedSourceUrls.length>8)reject();
  const research=topic.artifacts.findLast(item=>item.stage==='research');
  const known=new Set(research?.result.sources.map(source=>source.url)||[]);
  if(result.agentReportedVerifiedSourceUrls.some(url=>!known.has(url))||
   result.decision==='ready'&&(!result.agentReportedVerifiedSourceUrls.length||result.unsupportedClaims.length))reject();
  safeTextBundle('Fact-check',result.findings+'\n'+result.unsupportedClaims.join('\n'));
  return result;
 }
 if(stage==='editorial_review'){
  if(!exact(result,['decision','findings','rightsReviewed','privacyReviewed','sourceAttributionReviewed'])||
   !validDecision(result.decision)||!validMultilineText(result.findings,80,3000)||
   typeof result.rightsReviewed!=='boolean'||typeof result.privacyReviewed!=='boolean'||
   typeof result.sourceAttributionReviewed!=='boolean'||
   result.decision==='ready'&&
    (!result.rightsReviewed||!result.privacyReviewed||!result.sourceAttributionReviewed))reject();
  safeTextBundle('Editorial review',result.findings);
  return result;
 }
 reject();
}
function addTask(state,campaign,topic,stage,role,now){
 if(state.tasks.length>=MAX_TASKS)reject();
 const task={
  id:randomUUID(),campaignId:campaign.id,topicId:topic.id,stage,role,
  state:'queued',attempts:0,lease:null,result:null,createdAt:isoNow(now),updatedAt:isoNow(now)
 };
 state.tasks.push(task);
 return task;
}
function campaignById(state,id){
 const campaign=state.campaigns.find(item=>item.id===id);
 if(!campaign)reject();
 return campaign;
}
function taskById(state,id){
 const task=state.tasks.find(item=>item.id===id);
 if(!task)reject();
 return task;
}
function nextTask(state,campaign,topic,stage,now){
 const roles={
  research:'researcher',strategy:'strategist',draft:'writer',
  seo_review:'seo-editor',fact_check:'fact-checker',
  editorial_review:'editorial-reviewer',revision:'writer'
 };
 return addTask(state,campaign,topic,stage,roles[stage],now);
}
function createInitialState(){
 return {format:FORMAT,version:1,campaigns:[],tasks:[],messages:[]};
}
function readState(directory){
 const path=join(directory,'campaigns.json');
 if(!existsSync(path))return createInitialState();
 const info=lstatSync(path);
 if(info.isSymbolicLink()||!info.isFile()||info.size>MAX_STATE_BYTES||
  (process.platform!=='win32'&&(info.mode&0o077)!==0))reject();
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const stat=fstatSync(fd);
  if(!stat.isFile()||stat.size>MAX_STATE_BYTES)reject();
  const state=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(fd)));
  if(!exact(state,['format','version','campaigns','tasks','messages'])||
   state.format!==FORMAT||state.version!==1||
   !Array.isArray(state.campaigns)||state.campaigns.length>MAX_CAMPAIGNS||
   !Array.isArray(state.tasks)||state.tasks.length>MAX_TASKS||
   !Array.isArray(state.messages)||state.messages.length>MAX_MESSAGES)reject();
  return state;
 }finally{closeSync(fd);}
}
function writeState(directory,state){
 const target=join(directory,'campaigns.json');
 const temp=join(directory,'.campaigns-'+randomUUID()+'.tmp');
 const serialized=JSON.stringify(state)+'\n';
 if(Buffer.byteLength(serialized,'utf8')>MAX_STATE_BYTES)reject();
 try{
  writeFileSync(temp,serialized,{flag:'wx',mode:0o600});
  renameSync(temp,target);
 }finally{
  try{unlinkSync(temp);}catch{}
 }
}
function withLock(directory,callback){
 const lock=join(directory,'.campaigns.lock');
 let fd;
 try{fd=openSync(lock,'wx',0o600);}catch{reject();}
 try{
  const state=readState(directory);
  const result=callback(state);
  if(result&&result.write===false)return result.value;
  writeState(directory,state);
  return result?.value??result;
 }finally{
  if(fd!==undefined)closeSync(fd);
  try{unlinkSync(lock);}catch{}
 }
}
function outputFile(path,value){
 writeFileSync(path,value,{flag:'wx',mode:0o600});
}
function removePartialDirectory(path,files){
 for(const file of files){try{unlinkSync(file);}catch{}}
 try{rmdirSync(path);}catch{}
}

export function createAgentCampaignWorkspace({
 stateDir,ownerId,publisherAgentId,privateKeyPath,publicKeyPath,
 now=()=>new Date(),localMainShaProvider=getLocalMainCheckout
}={}){
 const directory=privateDirectory(stateDir);
 if(typeof now!=='function'||typeof localMainShaProvider!=='function')reject();
 const publisherConfigured=[ownerId,publisherAgentId,privateKeyPath,publicKeyPath].some(Boolean);
 let privateKey=null,publicKey=null;
 if(publisherConfigured){
  if(!cleanAgentId(ownerId)||!cleanAgentId(publisherAgentId))reject();
  const privatePath=outsideRepo(privateKeyPath);
  const publicPath=outsideRepo(publicKeyPath);
  // Only the separate operator-controlled publisher process needs this key.
  privateKey=localFile(privatePath,8192,true);
  publicKey=localFile(publicPath,8192);
  const check=createSignedAgentProposal({
   document:formatDraft({
    title:'Campaign workspace identity check',
    body:'## Local identity check\n\nThis private check validates the configured Ed25519 identity before a campaign can be finalized.',
    locale:'en',category:'guides',source:''
   }),ownerId,agentId:publisherAgentId,privateKey,now:now()
  });
  verifySignedAgentProposal(check,{publicKey,expectedOwnerId:ownerId,expectedAgentId:publisherAgentId});
 }

 function timestamp(){
  const value=now();
  if(!(value instanceof Date)||!Number.isFinite(value.getTime()))reject();
  return value;
 }
 return Object.freeze({
  finalizeAvailable:publisherConfigured,
  createCampaign(input){
   const data=validateCampaignInput(input),date=timestamp();
   return withLock(directory,state=>{
    if(state.campaigns.length>=MAX_CAMPAIGNS)reject();
    const duplicate=state.campaigns.some(item=>
     item.targetUrl===data.targetUrl&&
     item.topic.workingTitle.normalize('NFC').toLocaleLowerCase()===
      data.topic.workingTitle.normalize('NFC').toLocaleLowerCase()&&
     item.status!=='archived');
    if(duplicate)reject();
    const campaign={
     id:randomUUID(),name:data.campaignName,targetSiteName:data.targetSiteName,
     targetUrl:data.targetUrl,audience:data.audience,goal:data.goal,
     relationshipDisclosure:data.relationshipDisclosure,
     productFacts:data.productFacts,prohibitedClaims:data.prohibitedClaims,
     topic:{id:randomUUID(),...data.topic,status:'active',revisionCount:0,artifacts:[],finalization:null},
     status:'active',createdAt:isoNow(date),updatedAt:isoNow(date)
    };
    state.campaigns.push(campaign);
    const task=nextTask(state,campaign,campaign.topic,'research',date);
    return {campaignId:campaign.id,taskId:task.id,status:campaign.status,
     nextRole:task.role,identity:'local-private-workspace'};
   });
  },
  claimTask({campaignId,role,agentId}={}){
   if(!cleanUuid(campaignId)||!ROLES.includes(role)||!cleanAgentId(agentId))reject();
   const date=timestamp(),time=date.getTime();
   return withLock(directory,state=>{
    const campaign=campaignById(state,campaignId);
    if(campaign.status!=='active')reject();
    for(const task of state.tasks){
     if(task.campaignId!==campaignId||task.state!=='in_progress'||
      !task.lease||Date.parse(task.lease.expiresAt)>time)continue;
     task.state=task.attempts>=MAX_ATTEMPTS?'needs-operator':'queued';
     task.lease=null;task.updatedAt=isoNow(date);
    }
    const task=state.tasks.find(item=>item.campaignId===campaignId&&
     item.role===role&&item.state==='queued');
    if(!task)return {available:false,campaignId,role};
    if(task.attempts>=MAX_ATTEMPTS){task.state='needs-operator';task.updatedAt=isoNow(date);return {available:false,campaignId,role};}
    const token=randomUUID();
    task.state='in_progress';task.attempts++;
    task.lease={agentId,tokenHash:hash(token),expiresAt:isoNow(new Date(time+LEASE_MS))};
    task.updatedAt=isoNow(date);
    const topic=campaign.topic;
    return {
     available:true,campaignId,taskId:task.id,stage:task.stage,role:task.role,
     attempt:task.attempts,agentId,leaseToken:token,leaseExpiresAt:task.lease.expiresAt,
     campaign:{
      name:campaign.name,targetSiteName:campaign.targetSiteName,targetUrl:campaign.targetUrl,
      audience:campaign.audience,goal:campaign.goal,relationshipDisclosure:campaign.relationshipDisclosure,
      productFacts:campaign.productFacts,prohibitedClaims:campaign.prohibitedClaims,topic:{
       workingTitle:topic.workingTitle,readerProblem:topic.readerProblem,angle:topic.angle
      }
     },
     priorArtifacts:topic.artifacts.map(item=>({stage:item.stage,agentId:item.agentId,
      submittedAt:item.submittedAt,result:item.result}))
    };
   });
  },
  submitTaskResult({campaignId,taskId,agentId,leaseToken,result}={}){
   if(!cleanUuid(campaignId)||!cleanUuid(taskId)||!cleanAgentId(agentId)||
    typeof leaseToken!=='string'||leaseToken.length<20||leaseToken.length>100)reject();
   const date=timestamp(),time=date.getTime();
   return withLock(directory,state=>{
    const campaign=campaignById(state,campaignId),task=taskById(state,taskId);
    if(task.campaignId!==campaignId||campaign.status!=='active'||
     task.state!=='in_progress'||!task.lease||task.lease.agentId!==agentId||
     task.lease.tokenHash!==hash(leaseToken)||Date.parse(task.lease.expiresAt)<=time)reject();
    const topic=campaign.topic;
    const checked=validateStageResult(task.stage,result,campaign,topic);
    task.state='completed';task.result=checked;task.lease=null;task.updatedAt=isoNow(date);
    topic.artifacts.push({stage:task.stage,agentId,submittedAt:isoNow(date),result:checked});
    let next=null;
    if(['seo_review','fact_check','editorial_review'].includes(task.stage)&&checked.decision==='changes_requested'){
     if(topic.revisionCount>=2){
      topic.status='needs-operator';campaign.status='needs-operator';
     }else{
      topic.revisionCount++;topic.status='revision-required';
      next=nextTask(state,campaign,topic,'revision',date);
     }
    }else if(task.stage==='editorial_review'){
     topic.status='ready-for-private-finalization';
    }else{
     const stages={research:'strategy',strategy:'draft',draft:'seo_review',revision:'seo_review',seo_review:'fact_check',fact_check:'editorial_review'};
     next=nextTask(state,campaign,topic,stages[task.stage],date);
    }
    campaign.updatedAt=isoNow(date);
    return {accepted:true,campaignId,taskId,stage:task.stage,
     topicStatus:topic.status,campaignStatus:campaign.status,
     nextTaskId:next?.id??null,nextRole:next?.role??null,
     readyForPrivateFinalization:topic.status==='ready-for-private-finalization'};
   });
  },
  releaseTask({campaignId,taskId,agentId,leaseToken,reason}={}){
   if(!cleanUuid(campaignId)||!cleanUuid(taskId)||!cleanAgentId(agentId)||
    typeof leaseToken!=='string'||leaseToken.length<20||!validText(reason,10,500))reject();
   const date=timestamp();
   return withLock(directory,state=>{
    const campaign=campaignById(state,campaignId),task=taskById(state,taskId);
    if(task.campaignId!==campaignId||task.state!=='in_progress'||!task.lease||
     task.lease.agentId!==agentId||task.lease.tokenHash!==hash(leaseToken))reject();
    task.state=task.attempts>=MAX_ATTEMPTS?'needs-operator':'queued';
    task.lease=null;task.updatedAt=isoNow(date);
    if(state.messages.length>=MAX_MESSAGES||
     state.messages.filter(item=>item.campaignId===campaignId).length>=MAX_CAMPAIGN_MESSAGES)reject();
    safeTextBundle('Task release reason',reason);
    state.messages.push({id:randomUUID(),campaignId,taskId,fromAgent:agentId,toAgent:null,
     kind:'blocker',body:reason,identity:'local-self-asserted',createdAt:isoNow(date)});
    if(task.state==='needs-operator'){campaign.status='needs-operator';campaign.topic.status='needs-operator';}
    campaign.updatedAt=isoNow(date);
    return {released:true,taskId,state:task.state};
   });
  },
  sendMessage({campaignId,taskId=null,fromAgent,toAgent=null,kind,body}={}){
   if(!cleanUuid(campaignId)||!cleanAgentId(fromAgent)||
    (toAgent!==null&&!cleanAgentId(toAgent))||
    !['handoff','question','finding','blocker'].includes(kind)||
    !validMultilineText(body,10,4000))reject();
   safeTextBundle('Agent message',body);
   const date=timestamp();
   return withLock(directory,state=>{
    campaignById(state,campaignId);
    if(taskId!==null){
     const task=taskById(state,taskId);
     if(task.campaignId!==campaignId)reject();
    }
    if(state.messages.length>=MAX_MESSAGES||
     state.messages.filter(item=>item.campaignId===campaignId).length>=MAX_CAMPAIGN_MESSAGES)reject();
    const message={id:randomUUID(),campaignId,taskId,fromAgent,toAgent,kind,body,
     identity:'local-self-asserted',createdAt:isoNow(date)};
    state.messages.push(message);
    return {messageId:message.id,storedPrivately:true,publiclyPosted:false};
   });
  },
  readMessages({campaignId,agentId=null,afterMessageId=null}={}){
   if(!cleanUuid(campaignId)||(agentId!==null&&!cleanAgentId(agentId))||
    (afterMessageId!==null&&!cleanUuid(afterMessageId)))reject();
   return withLock(directory,state=>{
    campaignById(state,campaignId);
    let messages=state.messages.filter(item=>item.campaignId===campaignId);
    if(agentId)messages=messages.filter(item=>item.toAgent===null||item.toAgent===agentId||item.fromAgent===agentId);
    if(afterMessageId){
     const index=messages.findIndex(item=>item.id===afterMessageId);
     if(index<0)reject();
     messages=messages.slice(index+1);
    }
    return {write:false,value:{campaignId,messages:messages.slice(-80)}};
   });
  },
  getStatus({campaignId}={}){
   if(!cleanUuid(campaignId))reject();
   return withLock(directory,state=>{
    const campaign=campaignById(state,campaignId);
    const tasks=state.tasks.filter(item=>item.campaignId===campaignId);
    return {write:false,value:{
     campaign:{id:campaign.id,name:campaign.name,targetSiteName:campaign.targetSiteName,
      targetUrl:campaign.targetUrl,audience:campaign.audience,goal:campaign.goal,
      relationshipDisclosure:campaign.relationshipDisclosure,productFacts:campaign.productFacts,
      prohibitedClaims:campaign.prohibitedClaims,topic:campaign.topic,status:campaign.status,
      createdAt:campaign.createdAt,updatedAt:campaign.updatedAt},
     tasks:tasks.map(item=>({id:item.id,stage:item.stage,role:item.role,state:item.state,
      attempts:item.attempts,agentId:item.lease?.agentId??null,
      leaseExpiresAt:item.lease?.expiresAt??null,createdAt:item.createdAt,updatedAt:item.updatedAt})),
     messageCount:state.messages.filter(item=>item.campaignId===campaignId).length
    }};
   });
  },
  finalizeArticle({campaignId,publicationTime,confirmPrivateFinalization}={}){
   if(!publisherConfigured)reject();
   if(!cleanUuid(campaignId)||confirmPrivateFinalization!==true||
    typeof publicationTime!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(publicationTime))reject();
   const date=timestamp();
   return withLock(directory,state=>{
    const campaign=campaignById(state,campaignId),topic=campaign.topic;
    if(campaign.status!=='active'||topic.status!=='ready-for-private-finalization'||topic.finalization)reject();
    const finalArtifact=[...topic.artifacts].reverse().find(item=>item.stage==='draft'||item.stage==='revision');
    if(!finalArtifact)reject();
    const draft=finalArtifact.result.draft;
    const summary=finalArtifact.result.publicSummary;
    const normalizedTime=validateAgentArticlePublicationTime(publicationTime,date);
    const sourceMainSha=localMainShaProvider();
    if(!GIT_SHA.test(sourceMainSha||''))reject();
    const document=formatDraft(draft);
    const signed=createSignedAgentProposal({
     document,ownerId,agentId:publisherAgentId,privateKey,now:date
    });
    const verified=verifySignedAgentProposal(signed,{
     publicKey,expectedOwnerId:ownerId,expectedAgentId:publisherAgentId
    });
    const issue=prepareGitHubAgentProposal(signed,{
     publicKey,expectedOwnerId:ownerId,expectedAgentId:publisherAgentId,
     summary,now:date
    });
    const publication=prepareAgentArticlePublication({
     raw:JSON.stringify(signed),publicKey,expectedOwnerId:ownerId,
     expectedAgentId:publisherAgentId,summary,publicationTime:normalizedTime,now:date
    });
    if(localMainShaProvider()!==sourceMainSha||publication.manuscriptSha256!==verified.sha256)reject();
    const outputDir=join(directory,'publication-'+campaignId);
    mkdirSync(outputDir,{recursive:false,mode:0o700});
    const draftPath=join(outputDir,'draft.md');
    const signedProposalPath=join(outputDir,'signed-proposal.json');
    const publicSummaryPath=join(outputDir,'public-summary.txt');
    const issuePreviewPath=join(outputDir,'issue-preview.json');
    const receiptPath=join(outputDir,'receipt.json');
    const files=[draftPath,signedProposalPath,publicSummaryPath,issuePreviewPath,receiptPath];
    let complete=false;
    try{
     const receipt={
      version:1,state:'awaiting-human-review',kind:'local-agent-campaign-publication',
      campaignId,ownerId,agentId:publisherAgentId,
      draftSha256:verified.sha256,publicKeyFingerprint:verified.keyFingerprint,
      createdAt:verified.createdAt,sourceMainSha,
      publicationSha256:publication.publicationSha256,
      canonicalUrl:publication.canonicalUrl,publicationTime:publication.publicationTime,
      targetUrl:campaign.targetUrl,relationshipDisclosure:campaign.relationshipDisclosure,
      agentReviewState:'agent-reviewed-human-review-required',
      researchSources:topic.artifacts.find(item=>item.stage==='research').result.sources.map(item=>item.url),
      published:false,submitted:false
     };
     outputFile(draftPath,document);
     outputFile(signedProposalPath,JSON.stringify(signed,null,2)+'\n');
     outputFile(publicSummaryPath,summary);
     outputFile(issuePreviewPath,JSON.stringify({title:issue.title,body:issue.body},null,2)+'\n');
     outputFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
     const result={
      state:'private-campaign-article-awaiting-human-review',campaignId,
      canonicalUrl:publication.canonicalUrl,publicationTime:publication.publicationTime,
      sourceMainSha,manuscriptSha256:publication.manuscriptSha256,
      publicationSha256:publication.publicationSha256,
      workspacePath:outputDir,draftPath,signedProposalPath,publicSummaryPath,
      issuePreviewPath,receiptPath,published:false,submitted:false,
      nextStep:'Inspect the complete private draft and evidence, then use the separate publication MCP with this exact package and digest. A human must review and merge the DRAFT PR.'
     };
     topic.finalization=result;topic.status='awaiting-human-publication';
     campaign.status='awaiting-human-publication';campaign.updatedAt=isoNow(date);
     complete=true;
     return result;
    }finally{
     if(!complete)removePartialDirectory(outputDir,files);
    }
   });
  }
 });
}
