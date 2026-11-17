/**
 * Signed AI-agent static article publication for the PUBLIC OSS repository.
 * Creates a complete, human-reviewable DRAFT pull request; never merges it.
 * The final article becomes public only after an authorized human merge and
 * the normal GitHub Pages deployment/HTTPS release checks.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {safeSourceUrl} from '../../site/draft-lab-logic.js';
import {scanDraftSharingRisks} from '../../site/draft-lab-privacy.js';
import {renderEditorialBody,escapeReviewHtml} from '../../scripts/editorial-review-preview.mjs';
import {planEditorialSync} from '../../scripts/sync-editorial.mjs';
import {prepareGitHubAgentProposal} from './github-proposal.mjs';
import {verifySignedAgentProposal} from './editorial-proposal.mjs';

const REPO='rf24kja/24GO.top';
const ROOT=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const SITE=new URL('../../site/',import.meta.url);
const ID=/^[a-z][a-z0-9-]{2,63}$/;
const HASH=/^[a-f0-9]{64}$/;
const GIT_SHA=/^[a-f0-9]{40}$/;
const INVALID=()=>{throw new TypeError('Agent article publication rejected');};
const MAX_FILES=40;
const MAX_TOTAL_BYTES=2_000_000;
const TRUSTED_PUBLICATIONS=new WeakSet();
const SUBMITTED_PUBLICATIONS=new WeakSet();

function readSite(path){
 if(typeof path!=='string'||!(/^(?:index\.html|contribute\.html|progress\.html|sitemap\.xml|[a-z]{2}\/index\.html|(?:agents|arena)\/index\.html|library\/(?:index\.html|studio\/index\.html)|engineering\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:html|xml|json|mjs))$/.test(path)))
  throw new TypeError('Unsupported static publication source path: '+String(path));
 return readFileSync(new URL(path,SITE),'utf8');
}
function xmlEscape(value){
 return value.replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&apos;");
}
function markdownEscape(value){
 return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replace(/([\\*_{}\[\]()#+.!|>~-])/g,'\\$1')
  .replaceAll(String.fromCharCode(96),'\\'+String.fromCharCode(96));
}
function shortDescription(value){
 const text=value.trim();
 if(text.length<=160)return text;
 const cut=text.slice(0,157);
 const boundary=cut.lastIndexOf(' ');
 return (boundary>100?cut.slice(0,boundary):cut)+'…';
}
function slugFor(title,sha){
 const base=title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
  .slice(0,48).replace(/-+$/g,'')||'technical-article';
 return 'ai-agent-'+base+'-'+sha.slice(0,10);
}
function parsePublicationTime(value,now){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value))INVALID();
 const date=new Date(value);
 if(!Number.isFinite(date.getTime())||
   date.toISOString().replace('.000Z','Z')!==value||
   date.getTime()>now.getTime()+5*60_000||
   date.getTime()<now.getTime()-24*60*60_000)INVALID();
 return date;
}
export function validateAgentArticlePublicationTime(value,now=new Date()){
 const date=parsePublicationTime(value,now);
 const rss=readSite('engineering/feed.xml');
 const latest=rss.match(/<item>[\\s\\S]*?<pubDate>([^<]+)<\\/pubDate>[\\s\\S]*?<\\/item>/);
 const latestTime=latest?Date.parse(latest[1]):NaN;
 if(!Number.isFinite(latestTime)||date.getTime()<=latestTime)INVALID();
 return date.toISOString().replace('.000Z','Z');
}
function displayDate(date){
 return date.toLocaleDateString('en-GB',{
  day:'numeric',month:'long',year:'numeric',timeZone:'UTC'
 });
}
function buildArticleHtml({draft,summary,publicationTime,canonicalUrl,ownerId,agentId}){
 const title=escapeReviewHtml(draft.title.trim());
 const description=escapeReviewHtml(shortDescription(summary));
 const fullSummary=escapeReviewHtml(summary);
 const date=new Date(publicationTime);
 const dateIso=date.toISOString().replace('.000Z','Z');
 const dateLabel=displayDate(date);
 const source=safeSourceUrl(draft.source);
 if(!source||!source.startsWith('https:')||
  scanDraftSharingRisks({title:draft.title,body:draft.body,source}).flagged)INVALID();
 const sourceLine='<p class="details">Original source: <a href="'+escapeReviewHtml(source)+
  '" rel="noopener noreferrer ugc" target="_blank" referrerpolicy="no-referrer">'+
  escapeReviewHtml(source)+'</a></p>';
 const authorName='AI agent '+agentId+' (local signature claim; not hosted-verified)';
 const byline='AI-assisted article · agent claim: '+escapeReviewHtml(agentId)+
  ' · owner claim: '+escapeReviewHtml(ownerId)+
  ' · local signature verified against an independently pinned key; no hosted 24GOTOP identity';
 const ld={
  '@context':'https://schema.org','@type':'Article',
  headline:draft.title.trim(),description:summary,
  datePublished:dateIso,inLanguage:'en',
  author:{'@type':'Organization',name:authorName,url:'https://24go.top/agents/'},
  publisher:{'@type':'Organization',name:'24GOTOP',url:'https://24go.top/'},
  mainEntityOfPage:{'@type':'WebPage','@id':canonicalUrl},
  isAccessibleForFree:true
 };
 const safeLd=JSON.stringify(ld).replace(/</g,'\\u003c')
  .replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
 const body=renderEditorialBody(draft);
 if(!/<h[23] id="section-[a-z0-9-]+">/.test(body))INVALID();
 return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="theme-color" content="#0b1411">'+
  '<meta name="description" content="'+description+'">'+
  '<meta property="og:type" content="article"><meta property="og:title" content="'+title+'">'+
  '<meta property="og:description" content="'+description+'">'+
  '<meta property="og:url" content="'+canonicalUrl+'">'+
  '<meta property="article:published_time" content="'+dateIso+'">'+
  '<link rel="canonical" href="'+canonicalUrl+'">'+
  '<link rel="stylesheet" href="./notes.css"><link rel="stylesheet" href="../interior.css">'+
  '<link rel="alternate" type="application/rss+xml" title="24GOTOP engineering notes" href="./feed.xml">'+
  '<title>'+title+' — 24GOTOP engineering</title>'+
  '<script type="application/ld+json">'+safeLd+'</script>'+
  '<script type="module" src="./article-reader.mjs"></script>'+
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=portfolio3">'+
  '<link rel="icon" href="/favicon.ico?v=portfolio3" sizes="16x16 32x32 48x48">'+
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">'+
  '<link rel="stylesheet" href="/analytics.css"><script src="/analytics.js" defer></script>'+
  '</head><body><a class="skip" href="#main-content">Skip to article content</a>'+
  '<header class="interior-header"><nav class="wrap interior-nav" aria-label="Main navigation">'+
  '<a class="interior-brand" href="../" aria-label="24GOTOP home">24GO<span>TOP</span>'+
  '<span class="interior-brand__dot" aria-hidden="true"></span></a>'+
  '<div class="interior-links"><a href="../">Home</a><a href="./">Articles</a>'+
  '<a href="../draft-lab.html">Draft Lab</a><a href="../progress.html">Development</a>'+
  '<a href="https://github.com/rf24kja/24GO.top">GitHub ↗</a></div></nav></header>'+
  '<main class="wrap" id="main-content" tabindex="-1"><article class="article">'+
  '<span class="eyebrow">Engineering note · '+dateLabel+' · AI-assisted editorial</span>'+
  '<h1>'+title+'</h1><p class="lead">'+fullSummary+'</p>'+
  '<p class="details">'+byline+'</p>'+
  '<div class="note" role="note"><strong>Attribution:</strong> This article was prepared with an AI agent. '+
  'Its local Ed25519 signature was checked against an independently pinned public key at submission. '+
  'This is not a hosted 24GOTOP agent identity or a claim of model verification.</div>'+
  sourceLine+body+'</article></main>'+
  '<footer class="wrap article-footer"><a href="./">All engineering articles</a> · '+
  '<a href="../agents/">AI-agent publishing protocol</a> · '+
  '<a href="https://github.com/rf24kja/24GO.top">Source code</a></footer>'+
  '</body></html>\n';
}
function buildRssItem({title,summary,canonicalUrl,date}){
 return '<item><title>'+xmlEscape(title)+'</title><link>'+canonicalUrl+'</link>'+
  '<guid isPermaLink="true">'+canonicalUrl+'</guid><description>'+
  xmlEscape(summary)+'</description><pubDate>'+date.toUTCString()+'</pubDate></item>\n';
}
function insertRssItem(rss,item,date){
 const first=rss.indexOf('<item>');
 const latest=rss.match(/<item>[\s\S]*?<pubDate>([^<]+)<\/pubDate>[\s\S]*?<\/item>/);
 if(first<0||!latest)INVALID();
 const latestTime=Date.parse(latest[1]);
 if(!Number.isFinite(latestTime)||date.getTime()<=latestTime)INVALID();
 const url=item.match(/<guid[^>]*>([^<]+)<\/guid>/)?.[1];
 if(!url||rss.includes('<guid isPermaLink="true">'+url+'</guid>'))INVALID();
 return rss.slice(0,first)+item+rss.slice(first);
}
function buildArchiveCard({slug,title,summary,date,category}){
 const topic=({news:'discovery',models:'discovery',tools:'security',guides:'publishing'})[category];
 const label=({news:'News',models:'AI models',tools:'Tools',guides:'Guides'})[category];
 return '<article class="card" data-note-card data-note-topic="'+topic+
  '" data-note-file="'+slug+'.html"><span class="tag">'+displayDate(date)+
  ' · AI agent · '+label+'</span><h3><a href="./'+slug+'.html">'+
  escapeReviewHtml(title)+'</a></h3><p>'+escapeReviewHtml(summary)+'</p>'+
  '<a href="./'+slug+'.html">Read the original technical guide ↗</a></article>\n';
}
function insertArchiveCard(archive,card){
 const marker='<div class="cards" id="engineering-list">';
 if(archive.split(marker).length!==2)INVALID();
 return archive.replace(marker,marker+'\n'+card);
}
function digestFiles(files){
 const entries=[...files].sort(([a],[b])=>a.localeCompare(b))
  .map(([path,content])=>[path,createHash('sha256').update(content,'utf8').digest('hex')]);
 return createHash('sha256').update(JSON.stringify(entries),'utf8').digest('hex');
}
export function prepareAgentArticlePublication({
 raw,publicKey,expectedOwnerId,expectedAgentId,summary,publicationTime,
 now=new Date()
}={}){
 if(!(now instanceof Date)||!Number.isFinite(now.getTime())||
  typeof expectedOwnerId!=='string'||!ID.test(expectedOwnerId)||
  typeof expectedAgentId!=='string'||!ID.test(expectedAgentId)||
  typeof summary!=='string'||summary.length<80||summary.length>320||
  summary.trim()!==summary||
  /[\u0000-\u001f\u007f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u.test(summary)||
  /@[A-Za-z0-9_-]/u.test(summary))INVALID();
 const verified=verifySignedAgentProposal(raw,{
  publicKey,expectedOwnerId,expectedAgentId
 });
 const issue=prepareGitHubAgentProposal(raw,{
  publicKey,expectedOwnerId,expectedAgentId,summary,now
 });
 if(issue.sha256!==verified.sha256)INVALID();
 const draft=verified.draft;
 if(draft.locale!=='en')INVALID();
 const source=safeSourceUrl(draft.source);
 if(!source||!source.startsWith('https:'))INVALID();
 const date=new Date(validateAgentArticlePublicationTime(publicationTime,now));
 const slug=slugFor(draft.title,verified.sha256);
 const canonicalUrl='https://24go.top/engineering/'+slug+'.html';
 const articlePath='engineering/'+slug+'.html';
 try{readSite(articlePath);INVALID();}catch(error){
  if(error instanceof TypeError)throw error;
  if(error?.code!=='ENOENT')INVALID();
 }
 const articleHtml=buildArticleHtml({
  draft,summary,publicationTime:date.toISOString(),
  canonicalUrl,ownerId:verified.ownerId,agentId:verified.agentId
 });
 const rss=readSite('engineering/feed.xml');
 const archive=readSite('engineering/index.html');
 const rssUpdated=insertRssItem(rss,buildRssItem({
  title:draft.title.trim(),summary,canonicalUrl,date
 }),date);
 const archiveUpdated=insertArchiveCard(archive,buildArchiveCard({
  slug,title:draft.title.trim(),summary,date,category:draft.category
 }));
 const home=readSite('index.html');
 const readerSource=readSite('engineering/article-reader.mjs');
 const readPage=path=>path===articlePath?articleHtml:readSite(path);
 const derived=planEditorialSync({
  rss:rssUpdated,archive:archiveUpdated,home,readerSource,readPage
 });
 const files=new Map([
  ['site/'+articlePath,articleHtml],
  ['site/engineering/feed.xml',rssUpdated],
  ['site/engineering/index.html',archiveUpdated]
 ]);
 for(const [path,content] of derived){
  // Only the new page receives related links; avoid rewriting the whole archive on every submission.
  if(/^engineering\/[a-z0-9-]+\.html$/.test(path)&&path!==articlePath)continue;
  files.set('site/'+path,content);
 }
 let total=0;
 if(files.size>MAX_FILES)INVALID();
 for(const [path,content] of files){
  if(!/^(?:site\/engineering\/[a-z0-9-]+\.(?:html|xml|json|mjs)|site\/sitemap\.xml)$/.test(path)||
    typeof content!=='string')INVALID();
  total+=Buffer.byteLength(content,'utf8');
  if(total>MAX_TOTAL_BYTES)INVALID();
 }
 const publicationSha256=digestFiles(files);
 const publication=Object.freeze({
  title:draft.title.trim(),summary,slug,canonicalUrl,
  publicationTime:date.toISOString().replace('.000Z','Z'),publicationSha256,
  manuscriptSha256:verified.sha256,
  keyFingerprint:verified.keyFingerprint,
  ownerId:verified.ownerId,agentId:verified.agentId,
  files,filePaths:Object.freeze([...files.keys()].sort()),
  published:false,submitted:false
 });
 TRUSTED_PUBLICATIONS.add(publication);
 return publication;
}
function validatePublication(publication){
 if(!TRUSTED_PUBLICATIONS.has(publication))INVALID();
 if(!publication||typeof publication!=='object'||
  !HASH.test(publication.publicationSha256||'')||
  !HASH.test(publication.manuscriptSha256||'')||
  typeof publication.title!=='string'||publication.title.length>160||
  typeof publication.slug!=='string'||!/^ai-agent-[a-z0-9-]{1,80}$/.test(publication.slug)||
  typeof publication.canonicalUrl!=='string'||
  publication.canonicalUrl!=='https://24go.top/engineering/'+publication.slug+'.html'||
  !(publication.files instanceof Map)||publication.files.size<4||
  publication.files.size>MAX_FILES||digestFiles(publication.files)!==publication.publicationSha256)INVALID();
 let total=0;
 for(const [path,content] of publication.files){
  if(!/^(?:site\/engineering\/[a-z0-9-]+\.(?:html|xml|json|mjs)|site\/sitemap\.xml)$/.test(path)||
   typeof content!=='string')INVALID();
  total+=Buffer.byteLength(content,'utf8');
  if(total>MAX_TOTAL_BYTES)INVALID();
 }
 return true;
}
function githubHeaders(token){
 if(typeof token!=='string'||token.length<10||/\s/u.test(token))INVALID();
 return {'Accept':'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28',
  'Authorization':'Bearer '+token,
  'User-Agent':'24gotop-agent-article-publication'};
}
async function githubJson(fetchImpl,url,{method='GET',token,body,expectedStatus=200}={}){
 const headers=githubHeaders(token);
 const response=await fetchImpl(url,{
  method,headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),
  redirect:'error',signal:AbortSignal.timeout(12000)
 });
 if(!response||response.status!==expectedStatus||typeof response.text!=='function')INVALID();
 const raw=await response.text();
 if(typeof raw!=='string'||raw.length>262144)INVALID();
 try{return JSON.parse(raw);}catch{INVALID();}
}
function prBody(publication,branch){
 const lines=[
  '## AI-assisted article — draft publication request',
  '',
  'This draft PR contains the complete static article and the derived public discovery assets. '+
   'It is **not published** until an authorized human reviews and merges it and GitHub Pages delivery is verified.',
  '',
  '### Article',
  '- Title: '+markdownEscape(publication.title),
  '- Canonical URL after merge: '+publication.canonicalUrl,
  '- Intended publication time (UTC): '+publication.publicationTime,
  '- Summary: '+markdownEscape(publication.summary),
  '- Local agent claim: '+publication.agentId+' (not a hosted identity)',
  '- Owner claim: '+publication.ownerId+' (not independently authenticated by the hosted site)',
  '- Owner-pinned Ed25519 key fingerprint: '+publication.keyFingerprint,
  '- Manuscript SHA-256: '+publication.manuscriptSha256,
  '- Exact publication package SHA-256: '+publication.publicationSha256,
  '- Generated branch: '+branch,
  '',
  '### Required human review',
  '- [ ] Verify every factual claim and source link against the original source.',
  '- [ ] Review originality, copyright, attribution, confidential data and personal information.',
  '- [ ] Inspect the generated HTML and confirm all user content is escaped and no scripts/iframes were introduced.',
  '- [ ] Confirm the visible AI-agent attribution is accurate; the local signature is not a hosted identity.',
  '- [ ] Confirm the publication timestamp. If this PR is delayed more than 24 hours, regenerate it with the intended release time.',
  '- [ ] Confirm RSS, JSON Feed, archive, full-text search, reader allowlist, related links and sitemap changes.',
  '- [ ] Merge only after the public CI checks pass; then verify the canonical HTTPS article and exact Pages release.',
  '',
  'No database, hosted account, moderation bypass, comments, auto-replies, cross-posting or private Core writes are involved.'
 ];
 return lines.join('\n');
}
export function getLocalMainCheckout(){
 try{
  const branch=execFileSync('git',['branch','--show-current'],{
   cwd:ROOT,encoding:'utf8',timeout:4000,stdio:['ignore','pipe','ignore']
  }).trim();
  const head=execFileSync('git',['rev-parse','HEAD'],{
   cwd:ROOT,encoding:'utf8',timeout:4000,stdio:['ignore','pipe','ignore']
  }).trim();
  const dirty=execFileSync('git',['status','--porcelain'],{
   cwd:ROOT,encoding:'utf8',timeout:4000,stdio:['ignore','pipe','ignore']
  }).trim();
  if(branch!=='main'||!GIT_SHA.test(head)||dirty)INVALID();
  return head;
 }catch{INVALID();}
}
export async function submitGitHubArticlePublicationPR({
 publication,token,fetchImpl=globalThis.fetch,localMainSha
}={}){
 validatePublication(publication);
 if(typeof fetchImpl!=='function'||!GIT_SHA.test(localMainSha||''))INVALID();
 const headers=githubHeaders(token);
 if(SUBMITTED_PUBLICATIONS.has(publication))INVALID();
 // Consume the package before the first network request, including ambiguous failures.
 SUBMITTED_PUBLICATIONS.add(publication);
 const branch='agent-publish-'+publication.slug+'-'+publication.publicationSha256.slice(0,10);
 const base='https://api.github.com/repos/'+REPO;
 const ref=await githubJson(fetchImpl,base+'/git/ref/heads/main',{token});
 const mainSha=ref?.object?.sha;
 if(mainSha!==localMainSha)INVALID();
 const commit=await githubJson(fetchImpl,base+'/git/commits/'+mainSha,{token});
 const treeSha=commit?.tree?.sha;
 if(!GIT_SHA.test(treeSha||''))INVALID();
 const existing=await fetchImpl(base+'/git/ref/heads/'+branch,{
  method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(12000)
 });
 if(existing.status===200){
  const pulls=await githubJson(fetchImpl,base+'/pulls?head=rf24kja%3A'+branch+'&state=all&per_page=10',{token});
  if(!Array.isArray(pulls)||pulls.length>10)INVALID();
  const match=pulls.find(item=>item?.head?.ref===branch&&item?.base?.ref==='main'&&
   item?.state==='open'&&item?.draft===true&&typeof item.body==='string'&&
   item.body.includes(publication.publicationSha256));
  if(!match||typeof match.html_url!=='string'||
    !/^https:\/\/github\.com\/rf24kja\/24GO\.top\/pull\/[1-9][0-9]*$/.test(match.html_url))INVALID();
  return Object.freeze({url:match.html_url,created:false,branch,published:false,
   state:'draft-awaiting-human-review',publicationSha256:publication.publicationSha256});
 }
 if(existing.status!==404)INVALID();
 const entries=[...publication.files].sort(([a],[b])=>a.localeCompare(b))
  .map(([path,content])=>({path,mode:'100644',type:'blob',content}));
 const newTree=await githubJson(fetchImpl,base+'/git/trees',{
  method:'POST',token,expectedStatus:201,
  body:{base_tree:treeSha,tree:entries}
 });
 if(!GIT_SHA.test(newTree?.sha||''))INVALID();
 const newCommit=await githubJson(fetchImpl,base+'/git/commits',{
  method:'POST',token,expectedStatus:201,
  body:{message:'content(agent): prepare human-reviewed article publication',
   tree:newTree.sha,parents:[mainSha]}
 });
 if(!GIT_SHA.test(newCommit?.sha||''))INVALID();
 await githubJson(fetchImpl,base+'/git/refs',{
  method:'POST',token,expectedStatus:201,
  body:{ref:'refs/heads/'+branch,sha:newCommit.sha}
 });
 const pull=await githubJson(fetchImpl,base+'/pulls',{
  method:'POST',token,expectedStatus:201,
  body:{title:'AI-assisted article: '+publication.title,
   head:branch,base:'main',draft:true,body:prBody(publication,branch)}
 });
 const url=pull?.html_url;
 if(typeof url!=='string'||
  !/^https:\/\/github\.com\/rf24kja\/24GO\.top\/pull\/[1-9][0-9]*$/.test(url)||
  pull.draft!==true)INVALID();
 return Object.freeze({url,created:true,branch,published:false,
  state:'draft-awaiting-human-review',publicationSha256:publication.publicationSha256});
}
