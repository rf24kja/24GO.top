import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../site/',import.meta.url));
const read=path=>readFileSync(join(root,path),'utf8');
const canonicalHost='https://24go.top';
const sitemap=read('sitemap.xml');
const robots=read('robots.txt');
const articles=[
 'engineering/multilingual-markdown-editor-without-losing-drafts.html',
 'engineering/verify-github-pages-deploy-not-just-ci.html',
 'engineering/safe-markdown-citation-links-without-xss.html',
 'engineering/javascript-sdk-api-key-leak-prevention.html',
 'engineering/discoverable-technical-articles.html',
 'engineering/why-draft-lab-first.html',
 'engineering/markdown-preview-safety.html',
 'engineering/submit-is-not-publish.html',
 'engineering/postgres-insert-returning-least-privilege.html'
];
const pages=['index.html','progress.html','contribute.html','engineering/index.html',...['ru','th','es','fr','de','pt','zh'].map(code=>code+'/index.html'),...articles];
test('sitemap includes exactly the intended canonical, discoverable static pages',()=>{
 assert.match(sitemap,/^<\?xml version="1.0" encoding="UTF-8"\?>/);
 assert.match(sitemap,/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
 const locations=[...sitemap.matchAll(/<url><loc>([^<]+)<\/loc><\/url>/g)].map(m=>m[1]);
 assert.equal(locations.length,19);
 assert.equal(new Set(locations).size,locations.length);
 for(const link of locations){
  assert.ok(link.startsWith(canonicalHost+'/'),link);
  const url=new URL(link);
  assert.equal(url.origin,canonicalHost);
  assert.equal(url.search,'');
  assert.equal(url.hash,'');
  const path=url.pathname==='/'?'index.html':
   url.pathname.endsWith('/')?url.pathname.slice(1)+'index.html':url.pathname.slice(1);
  assert.ok(pages.includes(path),'unexpected page: '+path);
  assert.ok(existsSync(join(root,path)),'missing page: '+path);
 }
 assert.ok(!sitemap.includes('draft-lab.html'),'noindex prototype excluded');
 assert.ok(!sitemap.includes('<lastmod>'),'do not invent modification dates');
 assert.ok(!sitemap.includes('www.24go.top'),'single canonical host');
});
test('robots discovery is permissive and points at the real sitemap',()=>{
 assert.match(robots,/^User-agent: \*\nAllow: \/\n/m);
 assert.match(robots,/^Sitemap: https:\/\/24go\.top\/sitemap\.xml$/m);
 assert.ok(!/Disallow: \//.test(robots));
});
test('all indexed pages specify exactly their own canonical URLs',()=>{
 for(const path of pages){
  const html=read(path);
  const expected=canonicalHost+(path==='index.html'?'/':path.endsWith('/index.html')?'/'+path.slice(0,-'index.html'.length):'/'+path);
  const matches=[...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)];
  assert.equal(matches.length,1,'one canonical required: '+path);
  assert.equal(matches[0][1],expected,'canonical mismatch: '+path);
  assert.doesNotMatch(html,/<meta name="robots" content="noindex/i);
  assert.ok(html.includes('<h1'),'useful readable heading: '+path);
 }
 assert.match(read('draft-lab.html'),/<meta name="robots" content="noindex,follow">/);
});
test('engineering article directory, RSS and optional machine index agree',()=>{
 const index=read('engineering/index.html');
 const rss=read('engineering/feed.xml');
 const llms=read('llms.txt');
 assert.equal((rss.match(/<item>/g)||[]).length,9);
 for(const article of articles){
  const leaf=article.split('/').at(-1);
  const full=canonicalHost+'/'+article;
  assert.ok(index.includes('href="./'+leaf+'"'),'missing index link: '+leaf);
  assert.ok(rss.includes('<link>'+full+'</link>'),'missing RSS item: '+leaf);
  assert.ok(llms.includes(full),'missing documented link: '+leaf);
 }
 assert.ok(!rss.includes('www.24go.top'));
 assert.match(read('engineering/discoverable-technical-articles.html'),/Google Search Console/);
 assert.match(read('engineering/discoverable-technical-articles.html'),/OAI-SearchBot/);
 assert.doesNotMatch(read('engineering/discoverable-technical-articles.html'),/<script\b(?! type="application\/ld\+json">)|sb_secret_|PUBLISH_API_KEY|service_role/i);
});
