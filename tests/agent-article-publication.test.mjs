import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {formatDraft} from '../site/draft-lab-logic.js';
import {validatedReaderMetadata} from '../site/engineering/article-reader.mjs';
import {createSignedAgentProposal} from '../packages/agents/editorial-proposal.mjs';
import {
 prepareAgentArticlePublication,submitGitHubArticlePublicationPR
} from '../packages/agents/article-publication.mjs';
import {
 createAgentArticlePublicationSession,createAgentArticlePublicationSessionFromEnv,
 handleAgentArticlePublicationMcpRequest
} from '../packages/mcp/publication-stdio.mjs';

const NOW=new Date('2026-11-17T15:35:00.000Z');
const PUBLICATION_TIME='2026-11-17T15:34:00Z';
const OWNER='team-owner',AGENT='writer-agent';
const SUMMARY='A practical, source-backed guide to moving a signed AI-assisted technical manuscript into a reviewed static article release without treating a draft or pull request as publication.';
function fixture(){
 const pair=generateKeyPairSync('ed25519');
 const publicKey=pair.publicKey.export({type:'spki',format:'pem'});
 const document=formatDraft({
  title:'A secure path from an AI draft to a public static article',
  body:'## Overview\n\nThis guide explains a bounded editorial workflow and why a human review gate still matters before an article is released.\n\n### Safe rendering\n\nThe literal payload <script>alert(1)</script> must remain text, never executable HTML. See [the reference](https://example.org/docs) for the source contract.',
  locale:'en',category:'guides',source:'https://example.org/docs'
 });
 const raw=JSON.stringify(createSignedAgentProposal({
  document,ownerId:OWNER,agentId:AGENT,privateKey:pair.privateKey,now:NOW
 }));
 return {pair,publicKey,raw,document,now:NOW,publicationTime:PUBLICATION_TIME,
  expectedOwnerId:OWNER,expectedAgentId:AGENT,summary:SUMMARY};
}
const makePublication=()=>prepareAgentArticlePublication(fixture());

function jsonResponse(payload,status=200){
 return new Response(JSON.stringify(payload),{
  status,headers:{'content-type':'application/json'}
 });
}
function githubMock({mainSha='a'.repeat(40),existing=false}={}){
 const calls=[];
 const fetchImpl=async(url,options={})=>{
  calls.push({url,options});
  if(url.endsWith('/git/ref/heads/main'))return jsonResponse({object:{sha:mainSha}});
  if(url.endsWith('/git/commits/'+mainSha))return jsonResponse({tree:{sha:'b'.repeat(40)}});
  if(url.includes('/git/ref/heads/agent-publish-')){
   if(existing)return jsonResponse({ref:'refs/heads/existing'});
   return new Response('',{status:404});
  }
  if(url.includes('/pulls?head=')){
   return jsonResponse(existing?[{
    head:{ref:url.match(/agent-publish-[a-z0-9-]+/)?.[0]},
    base:{ref:'main'},body:'approved digest '+makePublication().publicationSha256,
    html_url:'https://github.com/rf24kja/24GO.top/pull/321'
   }]:[]);
  }
  if(url.endsWith('/git/trees')){
   const body=JSON.parse(options.body);
   assert.ok(body.tree.some(item=>item.path.startsWith('site/engineering/ai-agent-')));
   assert.ok(body.tree.some(item=>item.path==='site/engineering/feed.xml'));
   assert.ok(body.tree.some(item=>item.path==='site/sitemap.xml'));
   return jsonResponse({sha:'c'.repeat(40)},201);
  }
  if(url.endsWith('/git/commits')){
   const body=JSON.parse(options.body);
   assert.equal(body.parents[0],mainSha);
   return jsonResponse({sha:'d'.repeat(40)},201);
  }
  if(url.endsWith('/git/refs')){
   const body=JSON.parse(options.body);
   assert.match(body.ref,/^refs\/heads\/agent-publish-/);
   return jsonResponse({ref:body.ref},201);
  }
  if(url.endsWith('/pulls')){
   const body=JSON.parse(options.body);
   assert.equal(body.base,'main');
   assert.equal(body.draft,true);
   assert.match(body.body,/Required human review/);
   assert.match(body.body,/not a hosted identity/);
   return jsonResponse({
    html_url:'https://github.com/rf24kja/24GO.top/pull/321',draft:true
   },201);
  }
  throw new Error('Unexpected network destination');
 };
 return {fetchImpl,calls};
}

test('signed agent article becomes a complete static publication package with all discovery assets',()=>{
 const p=makePublication();
 assert.equal(p.published,false);
 assert.equal(p.submitted,false);
 assert.match(p.canonicalUrl,/^https:\/\/24go\.top\/engineering\/ai-agent-/);
 assert.ok(p.filePaths.includes('site/engineering/feed.xml'));
 assert.ok(p.filePaths.includes('site/engineering/feed.json'));
 assert.ok(p.filePaths.includes('site/engineering/search-index.json'));
 assert.ok(p.filePaths.includes('site/engineering/index.html'));
 assert.ok(p.filePaths.includes('site/engineering/article-reader.mjs'));
 assert.ok(p.filePaths.includes('site/sitemap.xml'));
 assert.ok(p.filePaths.includes('site/'+p.canonicalUrl.split('/').at(-1).replace(/^/,'engineering/')));
 const page=p.files.get('site/engineering/'+p.slug+'.html');
 assert.match(page,/rel="canonical"/);
 assert.match(page,/application\/ld\+json/);
 assert.match(page,/AI-assisted article/);
 assert.match(page,/not a hosted 24GOTOP agent identity/);
 assert.match(page,/id="section-overview"/);
 assert.match(page,/id="section-safe-rendering"/);
 assert.match(page,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
 const ld=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.match(ld.datePublished,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
 assert.doesNotThrow(()=>validatedReaderMetadata(ld,p.canonicalUrl,p.title));
 assert.doesNotMatch(page,/<script>alert\(1\)<\/script>/);
 const feed=JSON.parse(p.files.get('site/engineering/feed.json'));
 assert.equal(feed.items[0].url,p.canonicalUrl);
 assert.equal(feed.items.length,13);
 assert.ok(p.files.get('site/engineering/search-index.json').toLowerCase().includes(p.title.toLowerCase()));
 assert.ok(p.files.get('site/engineering/article-reader.mjs').includes(p.slug+'.html'));
 assert.ok(p.files.get('site/sitemap.xml').includes(p.canonicalUrl));
 assert.match(page,/Related reading/i);
 assert.equal(p.filePaths.filter(path=>/^site\/engineering\/[^/]+\.html$/.test(path)).length,1);
 assert.ok(p.files.size>=8&&p.files.size<=16);
});

test('publication preflight rejects untrusted signatures, wrong identity, unsafe source, language and stale dates',()=>{
 const base=fixture();
 assert.throws(()=>prepareAgentArticlePublication({
  ...base,raw:base.raw.replace('writer-agent','other-agent')
 }),TypeError);
 assert.throws(()=>prepareAgentArticlePublication({
  ...base,expectedOwnerId:'another-owner'
 }),TypeError);
 const wrongKey=generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'});
 assert.throws(()=>prepareAgentArticlePublication({...base,publicKey:wrongKey}),TypeError);
 const badDoc=formatDraft({
  title:'A safe article with an unsafe source link',
  body:'## Overview\n\nA sufficiently detailed explanation of a safe publication workflow.',
  locale:'en',category:'guides',source:'http://example.org/docs'
 });
 const signed=createSignedAgentProposal({
  document:badDoc,ownerId:OWNER,agentId:AGENT,privateKey:base.pair.privateKey,now:NOW
 });
 assert.throws(()=>prepareAgentArticlePublication({...base,raw:JSON.stringify(signed)}),TypeError);
 const nonEnglish=formatDraft({
  title:'Un article technique en français',
  body:'## Présentation\n\nUn texte suffisamment long pour expliquer le flux de publication.',
  locale:'fr',category:'guides',source:'https://example.org/docs'
 });
 const signedFr=createSignedAgentProposal({
  document:nonEnglish,ownerId:OWNER,agentId:AGENT,privateKey:base.pair.privateKey,now:NOW
 });
 assert.throws(()=>prepareAgentArticlePublication({...base,raw:JSON.stringify(signedFr)}),TypeError);
 const emailDoc=formatDraft({
  title:'A technical article that leaks a personal email address',
  body:'## Overview\n\nContact the author at private.author@example.com for further information.',
  locale:'en',category:'guides',source:'https://example.org/docs'
 });
 const signedEmail=createSignedAgentProposal({
  document:emailDoc,ownerId:OWNER,agentId:AGENT,privateKey:base.pair.privateKey,now:NOW
 });
 assert.throws(()=>prepareAgentArticlePublication({...base,raw:JSON.stringify(signedEmail)}),TypeError);
 assert.throws(()=>prepareAgentArticlePublication({
  ...base,publicationTime:'2026-11-01T12:00:00Z'
 }),TypeError);
 assert.throws(()=>prepareAgentArticlePublication({
  ...base,summary:'@everyone this summary is too short and unsafe'
 }),TypeError);
});

test('a publication object cannot be forged or changed after the operator preview',async()=>{
 const p=makePublication();
 const {fetchImpl,calls}=githubMock();
 const token='github-placeholder-token';
 await assert.rejects(()=>submitGitHubArticlePublicationPR({
  publication:{...p},token,fetchImpl,localMainSha:'a'.repeat(40)
 }),TypeError);
 p.files.set('site/engineering/injected.html','<script>bad()</script>');
 await assert.rejects(()=>submitGitHubArticlePublicationPR({
  publication:p,token,fetchImpl,localMainSha:'a'.repeat(40)
 }),TypeError);
 assert.equal(calls.length,0);
});

test('one explicit opt-in creates one DRAFT article PR from a fresh exact main checkout',async()=>{
 const params=fixture(),publication=prepareAgentArticlePublication(params);
 const {fetchImpl,calls}=githubMock();
 const session=createAgentArticlePublicationSession({
  ...params,allowPublicPr:true,approvedPublicationSha256:publication.publicationSha256,
  token:'github-placeholder-token',fetchImpl,localMainShaProvider:()=> 'a'.repeat(40)
 });
 assert.equal(session.canSubmit,true);
 await assert.rejects(()=>session.submit('0'.repeat(64),true),TypeError);
 await assert.rejects(()=>session.submit(publication.publicationSha256,false),TypeError);
 assert.equal(calls.length,0);
 const result=await session.submit(publication.publicationSha256,true);
 assert.equal(result.url,'https://github.com/rf24kja/24GO.top/pull/321');
 assert.equal(result.created,true);
 assert.equal(result.published,false);
 assert.equal(result.state,'draft-awaiting-human-review');
 assert.equal(calls.length,7);
 assert.ok(calls.every(x=>x.options.headers.Authorization==='Bearer github-placeholder-token'));
 assert.ok(calls.every(x=>!String(x.options.body||'').includes('github-placeholder-token')));
 await assert.rejects(()=>session.submit(publication.publicationSha256,true),TypeError);
 assert.equal(calls.length,7);
});

test('preview-only MCP exposes metadata but never uploads a manuscript or enables writes',()=>{
 const params=fixture();let network=0;
 const session=createAgentArticlePublicationSession({
  ...params,fetchImpl:async()=>{network++;throw Error('network disabled');}
 });
 const listed=handleAgentArticlePublicationMcpRequest({
  jsonrpc:'2.0',method:'tools/list'
 },session);
 assert.deepEqual(listed.result.tools.map(x=>x.name),['preview_article_publication']);
 const preview=handleAgentArticlePublicationMcpRequest({
  jsonrpc:'2.0',id:1,method:'tools/call',
  params:{name:'preview_article_publication',arguments:{}}
 },session);
 const payload=JSON.parse(preview.result.content[0].text);
 assert.equal(payload.published,false);
 assert.equal(payload.submitted,false);
 assert.ok(payload.publicationSha256.length===64);
 assert.ok(payload.files.some(x=>x==='site/engineering/feed.xml'));
 assert.ok(!JSON.stringify(payload).includes(params.document));
 const denied=handleAgentArticlePublicationMcpRequest({
  jsonrpc:'2.0',id:2,method:'tools/call',
  params:{name:'submit_article_publication_pr',arguments:{
   publicationSha256:payload.publicationSha256,confirmPublic:true
  }}
 },session);
 assert.equal(denied.result.isError,true);
 assert.equal(network,0);
});

test('operator opt-in must pin the exact full publication digest and token before MCP write tool appears',()=>{
 const params=fixture(),p=prepareAgentArticlePublication(params);
 for(const options of [
  {allowPublicPr:true,approvedPublicationSha256:'0'.repeat(64),token:'github-placeholder-token'},
  {allowPublicPr:true,approvedPublicationSha256:p.publicationSha256,token:null},
  {allowPublicPr:true,approvedPublicationSha256:p.publicationSha256,token:'bad token'},
  {allowPublicPr:'true',approvedPublicationSha256:p.publicationSha256,token:'github-placeholder-token'}
 ]){
  assert.throws(()=>createAgentArticlePublicationSession({...params,...options}),TypeError);
 }
});

test('local MCP config reads protected files and refuses public write opt-in without digest/token',()=>{
 const params=fixture(),dir=mkdtempSync(join(tmpdir(),'24gotop-publication-mcp-'));
 try{
  const packagePath=join(dir,'signed-proposal.json');
  const keyPath=join(dir,'owner.public.pem');
  const summaryPath=join(dir,'public-summary.txt');
  writeFileSync(packagePath,params.raw,{mode:0o600});
  writeFileSync(keyPath,params.publicKey,{mode:0o600});
  writeFileSync(summaryPath,params.summary,{mode:0o600});
  const env={
   MCP_AGENT_PACKAGE:packagePath,MCP_AGENT_PUBLIC_KEY:keyPath,
   MCP_AGENT_PUBLIC_SUMMARY:summaryPath,MCP_AGENT_OWNER_ID:OWNER,
   MCP_AGENT_ID:AGENT,MCP_AGENT_PUBLICATION_TIME:PUBLICATION_TIME
  };
  const session=createAgentArticlePublicationSessionFromEnv({
   env,now:NOW,localMainShaProvider:()=> 'a'.repeat(40)
  });
  assert.equal(session.canSubmit,false);
  assert.throws(()=>createAgentArticlePublicationSessionFromEnv({
   env:{...env,MCP_AGENT_ALLOW_PUBLIC_PR:'1',GITHUB_TOKEN:'github-placeholder-token'},
   now:NOW,localMainShaProvider:()=> 'a'.repeat(40)
  }),TypeError);
  assert.throws(()=>createAgentArticlePublicationSessionFromEnv({
   env:{...env,MCP_AGENT_ALLOW_PUBLIC_PR:'maybe'},now:NOW
  }),TypeError);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('local MCP refuses manuscript, key and summary files inside the public checkout',()=>{
 const inside=fileURLToPath(new URL('../package.json',import.meta.url));
 assert.throws(()=>createAgentArticlePublicationSessionFromEnv({
  env:{
   MCP_AGENT_PACKAGE:inside,
   MCP_AGENT_PUBLIC_KEY:inside,
   MCP_AGENT_PUBLIC_SUMMARY:inside,
   MCP_AGENT_OWNER_ID:OWNER,MCP_AGENT_ID:AGENT,
   MCP_AGENT_PUBLICATION_TIME:PUBLICATION_TIME
  },now:NOW
 }),TypeError);
});

test('GitHub article PR refuses stale local main before any write',async()=>{
 const p=makePublication(),{fetchImpl,calls}=githubMock({mainSha:'b'.repeat(40)});
 await assert.rejects(()=>submitGitHubArticlePublicationPR({
  publication:p,token:'github-placeholder-token',fetchImpl,localMainSha:'a'.repeat(40)
 }),TypeError);
 assert.equal(calls.length,1);
});
