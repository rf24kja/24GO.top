import test from 'node:test';
import assert from 'node:assert/strict';
import {
 existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,statSync,writeFileSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync} from 'node:crypto';
import {verifySignedAgentProposal} from '../packages/agents/editorial-proposal.mjs';
import {createAgentCampaignWorkspace} from '../packages/agents/campaign-workspace.mjs';

const OWNER='founder-team',PUBLISHER='campaign-publisher';
const NOW='2026-11-17T17:02:00.000Z';
const PUBLICATION_TIME='2026-11-17T17:00:00Z';
const SUMMARY='This practical guide explains how teams can evaluate property marketing workflows using transparent evidence, useful comparisons and clearly disclosed service links.';
const CAMPAIGN={
 campaignName:'24GO.ASIA educational campaign',
 targetSiteName:'24GO.ASIA',
 targetUrl:'https://24go.asia/',
 audience:'Independent real-estate agents and small property agencies looking for practical ways to present listings.',
 goal:'Publish a useful, evidence-led guide that helps agents evaluate property-content workflows and discover a relevant tool without making unsupported performance claims.',
 relationshipDisclosure:'Disclosure: The author is affiliated with 24GO.ASIA.',
 productFacts:[
  '24GO.ASIA is a property-content workflow project for real-estate professionals.',
  'The service is designed to help prepare property marketing materials from supplied listing information.'
 ],
 prohibitedClaims:['guaranteed sales growth','number one real-estate platform'],
 topic:{
  workingTitle:'A practical workflow for preparing property listing content',
  readerProblem:'Agents often need to turn structured listing details into clear, consistent materials for different channels.',
  angle:'Explain a repeatable, evidence-led workflow and include one clearly disclosed, contextually relevant service reference.'
 }
};
const RESEARCH={
 summary:'Two public documentation sources describe structured content, accessible web publishing and search-friendly information architecture. These references support general workflow recommendations, not performance claims about any specific product.',
 sources:[
  {url:'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',title:'Google SEO Starter Guide',excerpt:'The guide explains how to make content understandable to search engines and useful to people.',supports:'Useful content and descriptive page structure help readers and search systems understand a page.'},
  {url:'https://www.w3.org/WAI/fundamentals/accessibility-intro/',title:'W3C Accessibility Introduction',excerpt:'The introduction describes accessibility principles for websites and digital tools.',supports:'Accessible content and clear structure help people with different abilities use websites.'}
 ]
};
const STRATEGY={
 angle:'Focus on a repeatable editorial workflow for real-estate listing content rather than promising automatic sales or search rankings.',
 searchIntent:'Informational: practical steps for preparing accurate property listing content.',
 outline:'## Start with verified listing facts\n## Build one accurate source description\n## Adapt the presentation to each channel\n## Review accessibility and links\n## Measure real outcomes without invented claims',
 suggestedTitle:'A practical workflow for accurate property listing content',
 publicSummary:SUMMARY
};
const DRAFT={
 title:'A practical workflow for accurate property listing content',
 body:'## Start with verified listing facts\n\nBegin with the details the agent can substantiate: location, price, property type, floor area, amenities and availability. Keep unknown details out of the description.\n\n## Build one accurate source description\n\nUse a consistent source record so that brochures and channel-specific versions do not contradict one another. Check every statement against the supplied listing data.\n\n## Adapt the presentation to each channel\n\nCreate shorter and longer versions for the intended audience, then review image rights, accessibility text and destination links. A workflow such as [24GO.ASIA](https://24go.asia/) may be relevant when evaluating tools for preparing property-content materials.\n\nDisclosure: The author is affiliated with 24GO.ASIA.\n\n## Review and measure real outcomes\n\nCheck every public page and record genuine enquiries or reader actions. Do not infer sales growth, search rankings or customer results from content volume.',
 category:'guides',source:'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
 publicSummary:SUMMARY
};
const READY_SEO={decision:'ready',findings:'The article answers a clear informational question, uses descriptive headings and contains one contextual service link with the required disclosure. No keyword stuffing or unsupported ranking promise is present.'};
const READY_FACT={
 decision:'ready',
 findings:'The reviewed claims are limited to the supplied listing workflow and the cited public documentation. No performance, ranking or customer-result claim remains unsupported.',
 unsupportedClaims:[],
 agentReportedVerifiedSourceUrls:[
  'https://developers.google.com/search/docs/fundamentals/seo-starter-guide'
 ]
};
const READY_EDITORIAL={
 decision:'ready',
 findings:'The manuscript is original in framing, contains a visible affiliation disclosure and uses public sources. A human must still inspect the exact public diff and confirm publication rights.',
 rightsReviewed:true,privacyReviewed:true,sourceAttributionReviewed:true
};

async function fixture(callback){
 const root=mkdtempSync(join(tmpdir(),'24gotop-campaign-'));
 const stateDir=join(root,'private-state');
 mkdirSync(stateDir,{mode:0o700});
 const pair=generateKeyPairSync('ed25519');
 const privateKeyPath=join(root,'campaign.private.pem');
 const publicKeyPath=join(root,'campaign.public.pem');
 writeFileSync(privateKeyPath,pair.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 writeFileSync(publicKeyPath,pair.publicKey.export({type:'spki',format:'pem'}),{mode:0o644});
 let current=new Date(NOW);
 const workspace=createAgentCampaignWorkspace({
  stateDir,ownerId:OWNER,publisherAgentId:PUBLISHER,
  privateKeyPath,publicKeyPath,now:()=>new Date(current),
  localMainShaProvider:()=> 'a'.repeat(40)
 });
 try{await callback({root,stateDir,pair,workspace,setNow:value=>{current=new Date(value);}});}
 finally{rmSync(root,{recursive:true,force:true});}
}
function create(workspace){
 return workspace.createCampaign(CAMPAIGN);
}
function claim(workspace,campaignId,role,agentId){
 const result=workspace.claimTask({campaignId,role,agentId});
 assert.equal(result.available,true);
 return result;
}
function submit(workspace,claimed,result){
 return workspace.submitTaskResult({
  campaignId:claimed.campaignId,taskId:claimed.taskId,agentId:claimed.agentId,
  leaseToken:claimed.leaseToken,result
 });
}
async function advanceToDraft(workspace,campaignId){
 let task=claim(workspace,campaignId,'researcher','research-agent');
 submit(workspace,task,RESEARCH);
 task=claim(workspace,campaignId,'strategist','strategy-agent');
 submit(workspace,task,STRATEGY);
 return claim(workspace,campaignId,'writer','writer-agent');
}
async function advanceToFinalReview(workspace,campaignId){
 const draftTask=await advanceToDraft(workspace,campaignId);
 submit(workspace,draftTask,DRAFT);
 let task=claim(workspace,campaignId,'seo-editor','seo-agent');
 submit(workspace,task,READY_SEO);
 task=claim(workspace,campaignId,'fact-checker','fact-agent');
 submit(workspace,task,READY_FACT);
 return claim(workspace,campaignId,'editorial-reviewer','editor-agent');
}

test('campaign pipeline coordinates researcher, strategist, writer, SEO, fact-check and editorial agents',async()=>{
 await fixture(async({workspace})=>{
  const created=create(workspace);
  assert.equal(created.status,'active');
  assert.equal(created.nextRole,'researcher');
  let task=claim(workspace,created.campaignId,'researcher','research-agent');
  assert.match(task.instructions,/2–8 original public HTTPS sources/);
  const strategy=submit(workspace,task,RESEARCH);
  assert.equal(strategy.nextRole,'strategist');
  task=claim(workspace,created.campaignId,'strategist','strategy-agent');
  assert.equal(task.priorArtifacts[0].stage,'research');
  const draft=submit(workspace,task,STRATEGY);
  assert.equal(draft.nextRole,'writer');
  task=claim(workspace,created.campaignId,'writer','writer-agent');
  assert.match(task.instructions,/target URL exactly once/);
  assert.equal(task.priorArtifacts.length,2);
  const seo=submit(workspace,task,DRAFT);
  assert.equal(seo.nextRole,'seo-editor');
  task=claim(workspace,created.campaignId,'seo-editor','seo-agent');
  submit(workspace,task,READY_SEO);
  task=claim(workspace,created.campaignId,'fact-checker','fact-agent');
  submit(workspace,task,READY_FACT);
  task=claim(workspace,created.campaignId,'editorial-reviewer','editor-agent');
  const final=submit(workspace,task,READY_EDITORIAL);
  assert.equal(final.readyForPrivateFinalization,true);
  const status=workspace.getStatus({campaignId:created.campaignId});
  assert.equal(status.campaign.topic.status,'ready-for-private-finalization');
  assert.deepEqual(status.tasks.map(item=>item.stage),
   ['research','strategy','draft','seo_review','fact_check','editorial_review']);
  assert.ok(status.tasks.every(item=>item.state==='completed'));
 });
});

test('reviewer requests changes and writer revision restarts independent review stages',async()=>{
 await fixture(async({workspace})=>{
  const created=create(workspace);
  let task=await advanceToDraft(workspace,created.campaignId);
  submit(workspace,task,DRAFT);
  task=claim(workspace,created.campaignId,'seo-editor','seo-agent');
  const changes=submit(workspace,task,{
   decision:'changes_requested',
   findings:'The article needs a clearer explanation of how the listing source record is checked before content is adapted for a second channel. Add a concrete validation step.'
  });
  assert.equal(changes.nextRole,'writer');
  task=claim(workspace,created.campaignId,'writer','writer-agent');
  assert.equal(task.stage,'revision');
  const revised={
   ...DRAFT,
   body:DRAFT.body.replace('Keep unknown details out of the description.',
    'Keep unknown details out of the description. Compare the final draft against the original listing record before exporting it.')
  };
  submit(workspace,task,revised);
  task=claim(workspace,created.campaignId,'seo-editor','seo-agent');
  submit(workspace,task,READY_SEO);
  task=claim(workspace,created.campaignId,'fact-checker','fact-agent');
  submit(workspace,task,READY_FACT);
  task=claim(workspace,created.campaignId,'editorial-reviewer','editor-agent');
  const result=submit(workspace,task,READY_EDITORIAL);
  assert.equal(result.readyForPrivateFinalization,true);
  const status=workspace.getStatus({campaignId:created.campaignId});
  assert.equal(status.campaign.topic.revisionCount,1);
  assert.equal(status.campaign.topic.artifacts.at(-1).stage,'editorial_review');
  assert.equal(status.campaign.topic.artifacts.findLast(item=>item.stage==='revision').result.body,revised.body);
 });
});

test('drafts must include one contextual target link and one exact relationship disclosure',async()=>{
 await fixture(async({workspace})=>{
  const created=create(workspace);
  let task=await advanceToDraft(workspace,created.campaignId);
  const noLink={...DRAFT,body:DRAFT.body.replace('https://24go.asia/','https://example.org/').replace('[24GO.ASIA](https://example.org/)','[a reference](https://example.org/)')};
  await assert.rejects(Promise.resolve().then(()=>submit(workspace,task,noLink)),TypeError);
  const duplicateDisclosure={...DRAFT,body:DRAFT.body+'\n\n'+CAMPAIGN.relationshipDisclosure};
  await assert.rejects(Promise.resolve().then(()=>submit(workspace,task,duplicateDisclosure)),TypeError);
  const duplicateLink={...DRAFT,body:DRAFT.body+'\n\nSee https://24go.asia/.'};
  await assert.rejects(Promise.resolve().then(()=>submit(workspace,task,duplicateLink)),TypeError);
 });
});

test('campaign messages are private, directed and cursor-readable between local agents',async()=>{
 await fixture(async({workspace})=>{
  const {campaignId}=create(workspace);
  const sent=workspace.sendMessage({
   campaignId,taskId:null,fromAgent:'research-agent',toAgent:'writer-agent',
   kind:'handoff',body:'Research notes are ready. Use the two cited sources and avoid any performance claim.'
  });
  assert.equal(sent.storedPrivately,true);
  assert.equal(sent.publiclyPosted,false);
  const writer=workspace.readMessages({campaignId,agentId:'writer-agent'});
  assert.equal(writer.messages.length,1);
  assert.equal(writer.messages[0].fromAgent,'research-agent');
  assert.equal(workspace.readMessages({campaignId,agentId:'other-agent'}).messages.length,0);
  assert.equal(workspace.readMessages({campaignId,agentId:'research-agent'}).messages.length,1);
  const broadcast=workspace.sendMessage({
   campaignId,fromAgent:'seo-agent',kind:'finding',
   body:'Please keep the article title descriptive and do not promise search ranking improvements.'
  });
  assert.equal(workspace.readMessages({campaignId,agentId:'writer-agent'}).messages.length,2);
  assert.equal(workspace.readMessages({campaignId,afterMessageId:sent.messageId}).messages.length,1);
  assert.ok(broadcast.messageId);
 });
});

test('expired task lease can be reclaimed but an old agent cannot submit',async()=>{
 await fixture(async({workspace,setNow})=>{
  const {campaignId}=create(workspace);
  const first=claim(workspace,campaignId,'researcher','research-agent');
  setNow('2026-11-17T17:18:00.000Z');
  const second=claim(workspace,campaignId,'researcher','backup-researcher');
  assert.equal(second.attempt,2);
  await assert.rejects(Promise.resolve().then(()=>submit(workspace,first,RESEARCH)),TypeError);
  submit(workspace,second,RESEARCH);
 });
});

test('campaign finalization creates a private signed article package and never publishes',async()=>{
 await fixture(async({workspace,pair,stateDir})=>{
  const created=create(workspace);
  let task=await advanceToFinalReview(workspace,created.campaignId);
  submit(workspace,task,READY_EDITORIAL);
  const result=workspace.finalizeArticle({
   campaignId:created.campaignId,publicationTime:PUBLICATION_TIME,
   confirmPrivateFinalization:true
  });
  assert.equal(result.state,'private-campaign-article-awaiting-human-review');
  assert.equal(result.published,false);
  assert.equal(result.submitted,false);
  assert.equal(result.sourceMainSha,'a'.repeat(40));
  assert.match(result.canonicalUrl,/^https:\/\/24go\.top\/engineering\//);
  assert.equal(existsSync(result.signedProposalPath),true);
  const raw=readFileSync(result.signedProposalPath,'utf8');
  const verified=verifySignedAgentProposal(raw,{
   publicKey:pair.publicKey,expectedOwnerId:OWNER,expectedAgentId:PUBLISHER
  });
  assert.equal(verified.draft.title,DRAFT.title);
  assert.equal(verified.draft.body,DRAFT.body);
  assert.equal(readFileSync(result.publicSummaryPath,'utf8'),SUMMARY);
  const receipt=JSON.parse(readFileSync(result.receiptPath,'utf8'));
  assert.equal(receipt.kind,'local-agent-campaign-publication');
  assert.equal(receipt.agentReviewState,'agent-reviewed-human-review-required');
  assert.equal(receipt.published,false);
  assert.equal(receipt.submitted,false);
  for(const path of [result.draftPath,result.signedProposalPath,result.publicSummaryPath,result.issuePreviewPath,result.receiptPath]){
   assert.equal(statSync(path).mode&0o077,0);
  }
  assert.deepEqual(readdirSync(stateDir).filter(name=>name.startsWith('publication-')).length,1);
  assert.equal(workspace.getStatus({campaignId:created.campaignId}).campaign.status,'awaiting-human-publication');
  await assert.rejects(Promise.resolve().then(()=>workspace.finalizeArticle({
   campaignId:created.campaignId,publicationTime:PUBLICATION_TIME,confirmPrivateFinalization:true
  })),TypeError);
 });
});

test('campaign input, task leases and local state fail closed on unsafe data or a busy lock',async()=>{
 await fixture(async({workspace,stateDir})=>{
  await assert.rejects(Promise.resolve().then(()=>workspace.createCampaign({
   ...CAMPAIGN,targetUrl:'http://127.0.0.1/private'
  })),TypeError);
  await assert.rejects(Promise.resolve().then(()=>workspace.createCampaign({
   ...CAMPAIGN,relationshipDisclosure:''
  })),TypeError);
  const created=create(workspace);
  const task=claim(workspace,created.campaignId,'researcher','research-agent');
  await assert.rejects(Promise.resolve().then(()=>workspace.submitTaskResult({
   campaignId:created.campaignId,taskId:task.taskId,agentId:'other-agent',
   leaseToken:task.leaseToken,result:RESEARCH
  })),TypeError);
  writeFileSync(join(stateDir,'.campaigns.lock'),'busy',{mode:0o600});
  await assert.rejects(Promise.resolve().then(()=>workspace.getStatus({campaignId:created.campaignId})),TypeError);
 });
});

test('campaign list supports resuming a private workspace after an agent restart',async()=>{
 await fixture(async({workspace,setNow})=>{
  const first=create(workspace);
  setNow('2026-11-17T17:03:00.000Z');
  const second=workspace.createCampaign({
   ...CAMPAIGN,
   campaignName:'Second educational campaign',
   topic:{...CAMPAIGN.topic,workingTitle:'A checklist for accessible property listing pages'}
  });
  const list=workspace.listCampaigns({limit:10});
  assert.equal(list.campaigns.length,2);
  assert.equal(list.campaigns[0].id,second.campaignId);
  assert.equal(list.campaigns[1].id,first.campaignId);
  assert.equal(list.campaigns[0].openTaskCount,1);
  assert.equal(workspace.listCampaigns({limit:1}).campaigns.length,1);
 });
});

test('campaign creation prevents duplicate active promotion topics',async()=>{
 await fixture(async({workspace})=>{
  create(workspace);
  await assert.rejects(Promise.resolve().then(()=>workspace.createCampaign(CAMPAIGN)),TypeError);
 });
});
