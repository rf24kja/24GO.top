import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIXED_ROUTES,sourcePath} from '../scripts/verify-public-static.mjs';

const content=readFileSync(new URL('../site/agents.json',import.meta.url),'utf8');
const manifest=JSON.parse(content);
const page=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const contribute=readFileSync(new URL('../site/contribute.html',import.meta.url),'utf8');
const llms=readFileSync(new URL('../site/llms.txt',import.meta.url),'utf8');
const agentPage=readFileSync(new URL('../site/agents/index.html',import.meta.url),'utf8');

test('agent manifest explicitly and truthfully refuses hosted registration, writes and synthetic replies',()=>{
 assert.equal(manifest.format,'24gotop-public-agent-capabilities-v1');
 assert.equal(manifest.version,1);
 assert.equal(manifest.project,'24GOTOP');
 assert.equal(manifest.canonicalUrl,'https://24go.top/agents.json');
 assert.equal(manifest.releaseState,'public-oss-prelaunch');
 assert.equal(manifest.agentIdentity.hostedRegistrationAvailable,false);
 assert.equal(manifest.agentIdentity.hostedVerificationAvailable,false);
 assert.equal(manifest.agentIdentity.localSignedEditorialProposals,true);
 assert.equal(manifest.agentIdentity.signaturePurpose,'human-review-only');
 assert.deepEqual(manifest.hostedCommunity,{
  humanAccountsAvailable:false,agentAccountsAvailable:false,
  articleWritesAvailable:false,commentsAvailable:false,
  agentsMayAutomaticallyReplyToHumanThreads:false,moderationAvailable:false
 });
 assert.equal(manifest.editorialProposals.hostedPostApiAvailable,false);
 assert.equal(manifest.editorialProposals.automaticPublicationAvailable,false);
 assert.equal(manifest.editorialProposals.humanReviewRequired,true);
 assert.equal(manifest.editorialProposals.publicGithubIssueSubmission.operatorConfirmationRequired,true);
 assert.equal(manifest.publicReading.localMcp.hostedEndpointAvailable,false);
 assert.equal(manifest.localAgentTools.arena.hostedMatchesAvailable,false);
 assert.equal(manifest.limits.discoveryDoesNotAuthorizePosting,true);
 assert.equal(manifest.editorialProposals.localMcpArticlePublication.exactPackageDigestRequired,true);
 assert.equal(manifest.editorialProposals.localMcpArticlePublication.automaticMergeAvailable,false);
 assert.equal(manifest.editorialProposals.localMcpArticleAuthoring.noGitHubOrPublicWrite,true);
 assert.equal(manifest.localAgentTools.articlePublication.command,'npm run mcp:publication');
 assert.equal(manifest.localAgentTools.articlePublication.publicDraftPullRequestOptInOnly,true);
 assert.equal(manifest.localAgentTools.authoringMcp.command,'npm run mcp:authoring');
 assert.equal(manifest.localAgentTools.authoringMcp.noGitHubOrPublicWrite,true);
 assert.equal(manifest.localAgentTools.authoringMcp.optionalSecondAgentReview,true);
 assert.equal(manifest.localAgentTools.authoringMcp.reviewIsAdvisoryOnly,true);
 assert.equal(manifest.localAgentTools.authoringMcp.oneWriterRequestPerProcess,true);
 assert.equal(manifest.localAgentTools.authoringMcp.optionalOneReviewerRequestPerProcess,true);
 assert.equal(manifest.localAgentTools.authoringMcp.noAutomaticRetries,true);
 assert.deepEqual(manifest.localAgentTools.authoringMcp.toolNames,['prepare_article_draft','review_article_draft','revise_article_draft']);
 assert.equal(manifest.localAgentTools.authoringMcp.supportsPrivateSignedRevision,true);
 assert.equal(manifest.localAgentTools.authoringMcp.maxPrivateRevisionsPerProcess,1);
 assert.equal(manifest.localAgentTools.authoringMcp.revisionDoesNotCallModel,true);
 assert.equal(manifest.localAgentTools.campaignWorkspace.command,'npm run mcp:campaign');
 assert.equal(manifest.localAgentTools.campaignWorkspace.privateTaskQueue,true);
 assert.equal(manifest.localAgentTools.campaignWorkspace.privateAgentMessages,true);
 assert.equal(manifest.localAgentTools.campaignWorkspace.publisherSigningKeyAvailableToWorkers,false);
 assert.equal(manifest.localAgentTools.campaignWorkspace.finalizationToolPublisherOnly,true);
 assert.deepEqual(manifest.localAgentTools.campaignWorkspace.workerTools,[
  'create_promotion_campaign','list_campaigns','claim_campaign_task','submit_campaign_task_result',
  'release_campaign_task','send_campaign_message','read_campaign_messages','get_campaign_status'
 ]);
 assert.equal(manifest.localAgentTools.campaignWorkspace.automaticPublicPublication,false);
 assert.equal(manifest.editorialProposals.localMcpCampaignWorkspace.privateSharedStateRequired,true);
 assert.equal(manifest.editorialProposals.localMcpCampaignWorkspace.publisherSigningKeyAvailableToWorkers,false);
 assert.equal(manifest.editorialProposals.localMcpArticleAuthoring.supportsPrivateSignedRevision,true);
 assert.equal(manifest.editorialProposals.localMcpArticleAuthoring.reviewIsAdvisoryOnly,true);
 assert.equal(manifest.editorialProposals.localMcpArticleAuthoring.optionalSecondAgentReview,true);
 assert.equal(manifest.localAgentTools.articlePublication.hostedArticlePublicationAvailable,false);
 assert.equal(manifest.limits.draftPullRequestsAreNotPublishedArticles,true);
});

test('external agents can discover only existing source-backed public feeds and local commands',()=>{
 assert.equal(manifest.publicReading.available,true);
 assert.equal(manifest.publicReading.html,'https://24go.top/engineering/');
 assert.equal(manifest.publicReading.rss,'https://24go.top/engineering/feed.xml');
 assert.equal(manifest.publicReading.jsonFeed,'https://24go.top/engineering/feed.json');
 assert.equal(manifest.publicReading.localMcp.command,'npm run mcp:articles');
 assert.equal(manifest.publicReading.localMcp.hostedEndpointAvailable,false);
 assert.equal(manifest.localAgentTools.author.command,'npm run agent:prepare');
 assert.equal(manifest.localAgentTools.peerReview.command,'npm run agent:peer-review');
 assert.equal(manifest.editorialProposals.publicGithubIssueSubmission.command,'npm run agent:propose');
 assert.equal(manifest.localAgentTools.arena.localOnly,true);
 assert.equal(manifest.localAgentTools.editorialMcp.command,'npm run mcp:editorial');
 assert.equal(manifest.localAgentTools.editorialMcp.publicIssueWriteOptInOnly,true);
 assert.equal(manifest.localAgentTools.editorialMcp.hostedArticlePublicationAvailable,false);
 assert.equal(manifest.editorialProposals.localMcpIssueBridge.oneWriteAttemptPerProcess,true);
 const paths=[
  '../docs/AGENT_EDITORIAL_RUNNER.md',
  '../docs/AGENT_PEER_REVIEW.md',
  '../docs/AGENT_POSTS_PUBLIC_PROTOCOL.md',
  '../docs/PUBLIC_ARTICLE_MCP.md',
  '../docs/AGENT_GITHUB_EDITORIAL.md',
  '../docs/AGENT_DISCOVERY.md',
  '../docs/AGENT_EDITORIAL_MCP.md',
  '../docs/AGENT_ARTICLE_PUBLICATION_MCP.md',
  '../docs/AGENT_AUTHORING_MCP.md',
  '../docs/AGENT_CAMPAIGN_MCP.md'
 ];
 for(const p of paths)assert.ok(readFileSync(new URL(p,import.meta.url),'utf8').length>100,p);
});

test('public capability manifest URL fields do not allow credentials or arbitrary third-party links',()=>{
 const urls=[];
 function inspect(node){
  if(typeof node==='string'){
   if(/^https?:\/\//.test(node))urls.push(node);
  }else if(Array.isArray(node)){
   for(const item of node)inspect(item);
  }else if(node&&typeof node==='object'){
   for(const value of Object.values(node))inspect(value);
  }
 }
 inspect(manifest);
 assert.ok(urls.length>=10);
 for(const raw of urls){
  const url=new URL(raw);
  assert.equal(url.protocol,'https:');
  assert.equal(url.username,'');
  assert.equal(url.password,'');
  assert.equal(url.hash,'');
  assert.equal(url.search,'');
  assert.ok(url.origin==='https://24go.top'||
   (url.origin==='https://github.com'&&(url.pathname==='/rf24kja/24GO.top'||url.pathname.startsWith('/rf24kja/24GO.top/'))),
   raw);
 }
 assert.doesNotMatch(content,/\b(?:sk-[A-Za-z0-9_-]{20,}|github_pat_[A-Za-z0-9_]{20,}|Bearer\s+[A-Za-z0-9_.-]{24,})\b/);
});

test('homepage, contribution guide and llms index advertise the exact static discovery URL',()=>{
 assert.match(page,/<link rel="alternate" type="application\/json" title="24GOTOP agent capabilities" href="\/agents\.json">/);
 assert.match(contribute,/href="\.\/agents\.json"/);
 assert.match(contribute,/not an account-registration or public posting API/);
 assert.match(llms,/https:\/\/24go\.top\/agents\.json/);
 assert.match(agentPage,/Static article publication PR/);
 assert.match(agentPage,/private BYOK article authoring/i);
 assert.match(agentPage,/Private multi-agent campaigns/);
 assert.match(agentPage,/AGENT_CAMPAIGN_MCP\.md/);
 assert.match(llms,/AGENT_AUTHORING_MCP\.md/);
 assert.match(agentPage,/complete manuscript.*public.*DRAFT GitHub PR/i);
 assert.match(agentPage,/AGENT_ARTICLE_PUBLICATION_MCP\.md/);
 assert.match(llms,/AGENT_ARTICLE_PUBLICATION_MCP\.md/);
 assert.ok(FIXED_ROUTES.includes('/agents.json'));
 assert.ok(FIXED_ROUTES.includes('/llms.txt'));
 assert.ok(sourcePath('/agents.json').pathname.endsWith('/site/agents.json'));
 assert.ok(sourcePath('/llms.txt').pathname.endsWith('/site/llms.txt'));
});
