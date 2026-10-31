import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root=fileURLToPath(new URL('../site/',import.meta.url));
const read=path=>readFileSync(join(root,path),'utf8');
const codes=['en','ru','th','es','fr','de','pt','zh'];
const localCodes=codes.slice(1);
const home=read('index.html');
const sitemap=read('sitemap.xml');
const css=read('localized.css');
const pages=Object.fromEntries(codes.map(code=>[
 code,read(code==='en'?'index.html':code+'/index.html')
]));
const base='https://24go.top/';
const canonical=code=>base+(code==='en'?'':code+'/');

test('all eight home versions are actual crawlable static Pages routes, not client-only translations',()=>{
 for(const code of codes){
  const html=pages[code],url=canonical(code);
  assert.match(html,new RegExp('<html lang="'+code+'">'));
  assert.ok(html.includes('<link rel="canonical" href="'+url+'">'),code+' canonical');
  assert.ok(html.includes('<h1'),'missing useful heading in '+code);
  assert.ok(html.includes('href="../draft-lab.html?ui='+code+'"')||
    (code==='en'&&html.includes('href="./draft-lab.html"')),code+' editor CTA');
  assert.match(html,/PRE-LAUNCH/);
  assert.ok(html.includes('rel="stylesheet" href="'+(code==='en'?'./':'../')+'localized.css"'));
  assert.ok(!/sb_secret_|service_role|PUBLISH_API_KEY|public signup is open/i.test(html));
  if(code!=='en'){
   assert.ok(existsSync(join(root,code,'index.html')),code+' needs a real file');
   assert.ok(html.includes('src="../visuals/knowledge-network.'+code+'.svg"'),code+' needs actual branded artwork');
   assert.ok(html.includes('src="../visuals/24gotop-showcase.'+code+'.svg"'),code+' needs published product art');
   assert.ok(html.includes('<main id="main-content" tabindex="-1">'),code+' focus landmark');
   assert.ok(html.includes('href="../engineering/" lang="en"'),code+' external English-only article labeling');
   assert.ok(!html.includes('24gotop-staging-auth.vercel.app'),code+' must not link a private staging login');
   assert.ok(sitemap.includes('<loc>'+url+'</loc>'),code+' missing sitemap');
  }
 }
});

test('all pages link eight real language choices and declare complete SEO alternates',()=>{
 for(const code of codes){
  const page=pages[code],prefix=code==='en'?'./':'../';
  const total=[...page.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)];
  assert.equal(total.length,9,code+' hreflang total');
  for(const target of codes){
   const tag='<link rel="alternate" hreflang="'+target+'" href="'+canonical(target)+'">';
   assert.ok(page.includes(tag),code+' missing '+target+' alternate');
  }
  assert.ok(page.includes('<link rel="alternate" hreflang="x-default" href="'+base+'">'));
  assert.ok(page.includes('class="language-switch"'));
  for(const target of codes){
   const href=target==='en'?prefix:(code==='en'?'./':'../')+target+'/';
   assert.ok(page.includes('href="'+href+'"'),code+' missing '+target+' language switch');
  }
  assert.equal((page.match(/aria-current="page"/g)||[]).length,1,code+' one active switch');
 }
});

test('translated home summaries preserve safe staging boundary and actually useful content',()=>{
 for(const code of localCodes){
  const page=pages[code];
  assert.ok(page.length>4200,code+' translated page unexpectedly sparse');
  assert.ok(page.includes('href="../progress.html"'),code+' progress link');
  assert.ok(page.includes('href="../engineering/"'),code+' public article link');
  assert.ok(page.includes('href="../draft-lab.html?ui='+code+'"'),code+' language-aware Draft Lab');
  assert.match(page,/<section class="section wrap" aria-labelledby="available-heading">/);
  assert.match(page,/<section class="section wrap localized-roadmap" aria-labelledby="planned-heading">/);
  assert.equal((page.match(/<article class="card">/g)||[]).length,3);
  // A reviewed, native same-origin GET-only editorial search is permitted;
  // no executable scripts or publication/upload forms are allowed.
  assert.equal((page.match(/<form\\b/gi)||[]).length,1,code+' one search form');
  assert.match(page,/<form class="hero-search" role="search" aria-label="[^"]+" method="get" action="\\.\\.\\/engineering\\/">/);
  assert.doesNotMatch(page,/<script\\b|<iframe\\b|<base\\b|onerror=|onclick=|enctype=|method="post"/i);
 }
 assert.match(pages.ru,/Знания/);
 assert.match(pages.th,/ความรู้/);
 assert.match(pages.es,/Conocimiento/);
 assert.match(pages.fr,/connaissances/);
 assert.match(pages.de,/Wissen/);
 assert.match(pages.pt,/Conhecimento/);
 assert.match(pages.zh,/知识/);
});

test('language switch is mobile safe and respects keyboard focus and reduced motion',()=>{
 assert.match(css,/\.language-switch\{display:flex;flex-wrap:wrap/);
 assert.match(css,/\.language-switch a\[aria-current="page"\]/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:400px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(prefers-contrast:more\)/);
 assert.doesNotMatch(css,/@import|url\(https?:\/\//);
});
