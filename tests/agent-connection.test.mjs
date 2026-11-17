import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildAgentMcpConfig} from '../site/agents/agent-connect.mjs';
import {FIXED_ROUTES,sourcePath} from '../scripts/verify-public-static.mjs';

const read=p=>readFileSync(new URL('../site/'+p,import.meta.url),'utf8');
const page=read('agents/index.html'),css=read('agents/agent-connect.css');
const script=read('agents/agent-connect.mjs');
const manifest=JSON.parse(read('agents.json'));

test('reader config is an executable local process and contains no credentials',()=>{
 const result=JSON.parse(buildAgentMcpConfig({
  mode:'reader',repoPath:'/home/dev/24GO.top'
 }));
 assert.deepEqual(result,{mcpServers:{
  '24gotop-public-articles':{command:'node',
   args:['/home/dev/24GO.top/packages/mcp/stdio.mjs']}
 }});
 assert.ok(!JSON.stringify(result).includes('GITHUB_TOKEN'));
 const win=JSON.parse(buildAgentMcpConfig({
  mode:'reader',repoPath:String.raw`C:\Users\dev\24GO.top`
 }));
 assert.equal(win.mcpServers['24gotop-public-articles'].args[0],
  String.raw`C:\Users\dev\24GO.top\packages\mcp\stdio.mjs`);
});

test('editorial preview pins local paths and agent owner without enabling public submission',()=>{
 const config=JSON.parse(buildAgentMcpConfig({
  mode:'editorial',repoPath:'/home/dev/24GO.top',
  packagePath:'/private/job/signed.json',
  publicKeyPath:'/trusted/writer.public.pem',
  summaryPath:'/private/job/summary.txt',
  ownerId:'team-owner',agentId:'writer-agent'
 }));
 const settings=config.mcpServers['24gotop-reviewed-editorial'];
 assert.equal(settings.args[0],'/home/dev/24GO.top/packages/mcp/editorial-stdio.mjs');
 assert.equal(settings.env.MCP_AGENT_PACKAGE,'/private/job/signed.json');
 assert.equal(settings.env.MCP_AGENT_OWNER_ID,'team-owner');
 assert.equal(settings.env.MCP_AGENT_ID,'writer-agent');
 assert.equal(settings.env.MCP_AGENT_PUBLIC_SUMMARY,'/private/job/summary.txt');
 assert.equal(settings.env.MCP_AGENT_ALLOW_PUBLIC_ISSUE,undefined);
 assert.equal(settings.env.GITHUB_TOKEN,undefined);
 assert.equal(settings.env.MCP_AGENT_APPROVED_SHA256,undefined);
});

test('article publication MCP config is local and preview-only with no write credential',()=>{
 const config=JSON.parse(buildAgentMcpConfig({
  mode:'publication',repoPath:'/home/dev/24GO.top',
  packagePath:'/private/job/signed.json',
  publicKeyPath:'/trusted/writer.public.pem',
  summaryPath:'/private/job/summary.txt',
  ownerId:'team-owner',agentId:'writer-agent',
  publicationTime:'2026-11-17T15:34:00Z'
 }));
 const settings=config.mcpServers['24gotop-static-article-publication'];
 assert.equal(settings.args[0],'/home/dev/24GO.top/packages/mcp/publication-stdio.mjs');
 assert.equal(settings.env.MCP_AGENT_PUBLICATION_TIME,'2026-11-17T15:34:00Z');
 assert.equal(settings.env.MCP_AGENT_ALLOW_PUBLIC_PR,'0');
 assert.equal(settings.env.GITHUB_TOKEN,undefined);
 assert.equal(settings.env.MCP_AGENT_APPROVED_PUBLICATION_SHA256,undefined);
 assert.throws(()=>buildAgentMcpConfig({
  mode:'publication',repoPath:'/home/dev/24GO.top',
  packagePath:'/private/job/signed.json',publicKeyPath:'/trusted/writer.public.pem',
  summaryPath:'/private/job/summary.txt',ownerId:'team-owner',agentId:'writer-agent',
  publicationTime:'tomorrow'
 }),TypeError);
});

test('configuration refuses relative paths, control chars and arbitrary IDs',()=>{
 const reader={mode:'reader',repoPath:'/home/dev/24GO.top'};
 for(const bad of ['relative/path','https://evil.example','../repo','/','/good\nsecret',' C:\\Users\\dev', '']){
  assert.throws(()=>buildAgentMcpConfig({...reader,repoPath:bad}),TypeError,bad);
 }
 assert.throws(()=>buildAgentMcpConfig({...reader,mode:'publish'}),TypeError);
 const editorial={mode:'editorial',repoPath:'/home/dev/24GO.top',
  packagePath:'/private/signed.json',publicKeyPath:'/trusted/owner.pem',
  summaryPath:'/private/summary.txt',ownerId:'team-owner',agentId:'writer-agent'};
 for(const ownerId of ['Other OWNER','x','team@everyone','']){
  assert.throws(()=>buildAgentMcpConfig({...editorial,ownerId}),TypeError);
 }
 for(const packagePath of ['../../secrets','/ok\nInjected=1']){
  assert.throws(()=>buildAgentMcpConfig({...editorial,packagePath}),TypeError);
 }
});

test('public agent onboarding is canonical, accessible and explicitly prelaunch',()=>{
 assert.match(page,/<html lang="en">/);
 assert.match(page,/<link rel="canonical" href="https:\/\/24go\.top\/agents\/">/);
 assert.match(page,/<h1>Connect your AI agent to 24GOTOP<\/h1>/);
 assert.match(page,/role="status" aria-live="polite"/);
 assert.match(page,/id="agent-config-output"[^>]*tabindex="0"/);
 assert.match(page,/<button type="button" id="agent-config-copy" disabled>/);
 assert.match(page,/no hosted agent registration/i);
 assert.match(page,/public DRAFT GitHub PR/);
 assert.match(page,/AGENT_ARTICLE_PUBLICATION_MCP\.md/);
 assert.match(page,/human must review and merge/i);
 assert.match(page,/MCP_AGENT/);
 assert.doesNotMatch(page,/<form\b|<input[^>]+type="password"|<script[^>]+src="https?:/i);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/:focus-visible/);
 assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|eval\s*\(/);
 assert.equal(manifest.localAgentTools.editorialMcp.command,'npm run mcp:editorial');
 assert.equal(manifest.localAgentTools.editorialMcp.hostedArticlePublicationAvailable,false);
 assert.equal(manifest.localAgentTools.articlePublication.command,'npm run mcp:publication');
 assert.equal(manifest.localAgentTools.articlePublication.publicDraftPullRequestOptInOnly,true);
 assert.equal(manifest.onboardingPage,'https://24go.top/agents/');
 for(const route of ['/agents/','/agents/agent-connect.mjs','/agents/agent-connect.css']){
  assert.ok(FIXED_ROUTES.includes(route));
  assert.ok(sourcePath(route).pathname.includes('/site/agents/'));
 }
});
