import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../site/'+path,import.meta.url),'utf8');
const articles=[
 ['multilingual-markdown-editor-without-losing-drafts.html',81,'How to localize a Markdown editor without losing drafts'],
 ['verify-github-pages-deploy-not-just-ci.html',82,'How to verify a GitHub Pages deployment—not just a green CI badge'],
 ['safe-markdown-citation-links-without-xss.html',78,'How to render Markdown citation links without introducing XSS']
];
const archive=read('engineering/index.html');
const feed=read('engineering/feed.xml');
const sitemap=read('sitemap.xml');
const optional=read('llms.txt');
const home=read('index.html');
test('every new article has meaningful visible evidence and matching Google Article metadata',()=>{
 for(const [leaf,pr,h1] of articles){
  const page=read('engineering/'+leaf);
  const canonical='https://24go.top/engineering/'+leaf;
  assert.match(page,/<html lang="en">/);
  assert.match(page,/<meta name="description" content="[^"]{80,180}"/);
  assert.ok(page.includes('<h1>'+h1+'</h1>'),'specific human-readable question: '+leaf);
  assert.ok(page.includes('<link rel="canonical" href="'+canonical+'">'),'canonical: '+leaf);
  assert.ok(page.includes('<meta property="og:url" content="'+canonical+'">'),'OG URL: '+leaf);
  assert.ok(page.includes('https://github.com/rf24kja/24GO.top/pull/'+pr),'source-backed PR: '+leaf);
  assert.ok(page.includes('https://github.com/rf24kja/24GO.top/blob/main/'),'tested public code: '+leaf);
  assert.ok(page.includes('not')||page.includes('NOT'),'honest limitations: '+leaf);
  assert.doesNotMatch(page,/<iframe\b|<form\b|<script\s+(?!type="application\/ld\+json"|type="module" src="\.\/article-reader\.mjs")|sb_secret_|PUBLISH_API_KEY|service_role/i);
  assert.doesNotMatch(page,/<meta name="robots" content="noindex/i);
  const markup=page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)||[];
  assert.equal(markup.length,1,'one JSON-LD object: '+leaf);
  const structured=JSON.parse(markup[0].replace(/^<script type="application\/ld\+json">|<\/script>$/g,''));
  assert.equal(structured['@context'],'https://schema.org');
  assert.equal(structured['@type'],'Article');
  assert.ok(structured.headline.length>20);
  assert.equal(structured.author.name,'24GOTOP Engineering');
  assert.equal(structured.publisher.name,'24GOTOP');
  assert.equal(structured.mainEntityOfPage['@id'],canonical);
  assert.equal(structured.inLanguage,'en');
  assert.equal(structured.datePublished,structured.dateModified);
  assert.match(structured.datePublished,/^2026-10-30T\d\d:\d\d:\d\d\+07:00$/);
  assert.ok(page.includes('content="'+structured.datePublished+'"'),'structured date matches visible metadata');
  assert.ok(page.includes('<time datetime="2026-10-30">30 October 2026</time>'),'visible publishing date');
  const text=page.replace(/<script[^>]*>[\s\S]*?<\/script>/g,'').replace(/<[^>]*>/g,' ');
  assert.ok(text.split(/\s+/).length>450,'long-form practical guide, not doorway page: '+leaf);
  assert.ok(archive.includes('href="./'+leaf+'"'),'crawlable archive link: '+leaf);
  assert.ok(home.includes('href="./engineering/'+leaf+'"'),'homepage internal link: '+leaf);
  assert.ok(feed.includes('<link>'+canonical+'</link>'),'RSS item: '+leaf);
  assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'),'XML sitemap: '+leaf);
  assert.ok(optional.includes(canonical),'optional text index: '+leaf);
 }
});
test('original English content, not invented hreflang duplicates or indexing promises',()=>{
 const full=articles.map(([leaf])=>read('engineering/'+leaf)).join('\n');
 assert.doesNotMatch(full,/<link rel="alternate" hreflang=|100% guaranteed|#1 in Google|millions of users/i);
 assert.doesNotMatch(sitemap,/draft-lab\.html|auth\/|admin\//);
 assert.doesNotMatch(feed,/draft-lab\.html|<script\b|&(?!(?:amp|lt|gt|quot|apos);)/i);
 for(const [leaf] of articles)assert.equal((feed.split('https://24go.top/engineering/'+leaf).length-1),2,
  'one RSS link and one permanent GUID for '+leaf);
});
