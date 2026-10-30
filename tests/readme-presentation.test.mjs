import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const locales=['ru','th','es','fr','de','pt','zh'];
const read=path=>readFileSync(resolve(root,path),'utf8');
const publicREADME=read('README.md');
const all=[['README.md',publicREADME],...locales.map(l=>['docs/i18n/README.'+l+'.md',read('docs/i18n/README.'+l+'.md')])];

test('all eight README entry points link to real localized files and official user pathways',()=>{
 for(const [name,markdown] of all){
  assert.match(markdown,/24GOTOP/);
  assert.match(markdown,/https:\/\/24go\.top\//);
  assert.match(markdown,/https:\/\/24go\.top\/engineering\//);
  assert.match(markdown,/https:\/\/24go\.top\/draft-lab\.html/);
  assert.match(markdown,/https:\/\/24go\.top\/engineering\/feed\.xml/);
  for(const l of locales){
   const relative=name==='README.md'?'docs/i18n/README.'+l+'.md':'README.'+l+'.md';
   assert.ok(markdown.includes(']('+relative+')'),name+' missing language '+l);
  }
  assert.ok(markdown.includes('](../../README.md)')||name==='README.md',name+' English language home');
  // Markdown local links in the root and translations must not be broken.
  const mdlinks=[...markdown.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map(m=>m[1]);
  for(const href of mdlinks){
   if(/^(?:https?:|mailto:|#)/i.test(href))continue;
   const unescaped=decodeURIComponent(href.split('#')[0]);
   if(!unescaped)continue;
   const target=resolve(dirname(resolve(root,name)),unescaped);
   assert.ok(target.startsWith(root),'link escapes repository: '+name+' → '+href);
   assert.ok(existsSync(target),'broken README link: '+name+' → '+href);
  }
 }
});

test('showcase SVG diagrams are safe, accessible, lightweight and self-contained',()=>{
 const used=['docs/assets/24gotop-readme-hero.svg','docs/assets/24gotop-platform-map.svg'];
 for(const name of used){
  const svg=read(name);
  assert.ok(svg.length<40000,'keep README media lightweight: '+name);
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/viewBox="0 0 \d+ \d+"/);
  assert.match(svg,/role="img" aria-labelledby="title desc"/);
  assert.match(svg,/<title id="title">[^<]+<\/title>/);
  assert.match(svg,/<desc id="desc">[^<]+<\/desc>/);
  assert.doesNotMatch(svg,/<script\b|<foreignObject\b|<image\b|<iframe\b|<a\b|onload=|onclick=|javascript:|https?:\/\/[^"]+\.js|@import/i);
  assert.ok(publicREADME.includes(name),'primary README should display '+name);
  for(const [,markdown] of all.slice(1))assert.ok(markdown.includes('../assets/'+name.split('/').at(-1)),
   'translated README should provide same infographic: '+name);
 }
});

test('public README uses status-aware descriptions, credible calls to action, honest licensing',()=>{
 assert.match(publicREADME,/Founder and official project lead: \[@rf24kja\]/);
 assert.match(publicREADME,/MIT license/);
 assert.match(publicREADME,/forks and independent deployment/);
 assert.match(publicREADME,/NOT a launched publishing community/);
 assert.match(publicREADME,/Hosted public publishing is not live|Hosted accounts, user publishing,[^\n]+are not publicly available/);
 assert.match(publicREADME,/verified|Verified/);
 assert.match(publicREADME,/npm run demo:read/);
 assert.match(publicREADME,/npm test/);
 assert.match(publicREADME,/docs\/EDITORIAL_SEARCH_DISCOVERY_PLAN\.md/);
 assert.match(publicREADME,/docs\/PUBLIC_PRIVATE_BOUNDARY\.md/);
 assert.doesNotMatch(publicREADME,/100% uptime|#1 on Google|guaranteed ranking|thousands of users|official OpenAI partner/i);
 for(const url of [
  'https://24go.top/engineering/multilingual-markdown-editor-without-losing-drafts.html',
  'https://24go.top/engineering/verify-github-pages-deploy-not-just-ci.html',
  'https://24go.top/engineering/safe-markdown-citation-links-without-xss.html'
 ])assert.ok(publicREADME.includes(url),'source-backed engineering evidence '+url);
});
