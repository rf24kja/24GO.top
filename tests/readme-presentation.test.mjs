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
 const used=['docs/assets/24gotop-readme-hero.svg','docs/assets/24gotop-platform-map.svg','docs/assets/24gotop-writer-journey.svg','docs/assets/24gotop-evidence-loop.svg','docs/assets/24gotop-contribute.svg'];
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
  for(const [path,markdown] of all.slice(1)){
    const locale=path.match(/README\.([a-z]{2})\.md$/)[1];
    assert.ok(markdown.includes('../assets/'+name.split('/').at(-1).replace('.svg','.'+locale+'.svg')),
   'translated README should provide same infographic: '+name);
  }
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

test('deep README gives usable instructions without implying hosted publication is live',()=>{
 for(const heading of [
  '## Contents','## The author workflow available now','## Repository map',
  '## Security, privacy and trust boundaries',
  '## Verified progress and upcoming release gates',
  '## Frequently asked questions'
 ])assert.ok(publicREADME.includes(heading),'missing README section: '+heading);
 for(const step of [
  '**Write locally.**','**Preview safely.**','**Download your work.**','**Continue later.**'
 ])assert.ok(publicREADME.includes(step),'missing practical author step '+step);
 assert.match(publicREADME,/interface language.*independently among English, Russian, Thai, Spanish, French, German, Portuguese and Chinese/);
 assert.match(publicREADME,/If you close the tab before exporting, unsaved changes may be lost/);
 assert.match(publicREADME,/A future author flow requires a verifiably authenticated account/);
 assert.match(publicREADME,/An accepted submission is not a published article/);
 assert.match(publicREADME,/12 canonical sitemap URLs/);
 for(const path of ['site/','public/','src/','packages/sdk/','openapi/','examples/','tests/','docs/'])
  assert.ok(publicREADME.includes(']( '+path+')')||publicREADME.includes(']('+path+')'),'source route: '+path);
 assert.doesNotMatch(publicREADME,/\bpublic community launched\b|\bproduction API ready\b|\bwe have 1000 users\b/i);
});

test('all eight languages include a plain-language local workflow and a separate gated publication boundary',()=>{
 for(const [name,markdown] of all){
  assert.match(markdown,/24gotop-writer-journey(?:\.[a-z]{2})?\.svg/,'missing author image: '+name);
  assert.match(markdown,/\.md/,'no local file contract: '+name);
  assert.match(markdown,/MIT/,'must preserve legitimate public code licensing: '+name);
  assert.match(markdown,/24go\.top\/engineering\//,'must show actual editorial content: '+name);
 }
 assert.match(read('docs/i18n/README.ru.md'),/Всё происходит локально в браузере/);
 assert.match(read('docs/i18n/README.th.md'),/ไม่มีการอัปโหลด/);
 assert.match(read('docs/i18n/README.zh.md'),/不自动保存/);
});

test('new workflow infographic separates shipped and unshipped steps without requiring scripts',()=>{
 const svg=read('docs/assets/24gotop-writer-journey.svg');
 for(const marker of ['THE WRITING JOURNEY','AVAILABLE','PLANNED / GATED','Write Markdown',
  'Preview safely','Download .md','Reopen locally','Verified author identity',
  'Moderation + security checks','Hosted public publication','Not launched'])
  assert.ok(svg.includes(marker),'unsubstantiated workflow step '+marker);
 assert.match(svg,/<desc id="desc">/);
 assert.match(svg,/stroke-dasharray/);
 assert.doesNotMatch(svg,/<script|<foreignObject|<image |<animate|onload|href="https?:/i);
});

test('all README locales display accessible eight-language navigation with flag or globe markers',()=>{
 const links=[
  ['🌐','English'],['🇷🇺','Русский'],['🇹🇭','ไทย'],['🇪🇸','Español'],
  ['🇫🇷','Français'],['🇩🇪','Deutsch'],['🇵🇹','Português'],['🇨🇳','中文']
 ];
 for(const [path,content] of all){
  for(const [symbol,label] of links){
   assert.ok(content.includes(symbol+' [')||content.includes('['+symbol+' '),
    path+': language symbol '+symbol+' for '+label);
   assert.ok(content.includes(label+'](')||content.includes(label+'**]('),
    path+' missing navigable '+label);
  }
  assert.ok(/24gotop-evidence-loop(?:\.[a-z]{2})?\.svg/.test(content),path+' missing editorial evidence diagram');
  assert.ok(/24gotop-contribute(?:\.[a-z]{2})?\.svg/.test(content),path+' missing contributor diagram');
 }
 assert.ok(publicREADME.indexOf('24gotop-evidence-loop.svg')<publicREADME.indexOf('## Original engineering articles'),
  'evidence graphic belongs to the product rationale, before the article index');
 assert.ok(publicREADME.indexOf('24gotop-contribute.svg')>publicREADME.indexOf('## Contribute and improve the product'),
  'contributor guide visual should be near real contribution links');
});

test('visuals accurately distinguish live components, future releases and evidence',()=>{
 const hero=read('docs/assets/24gotop-readme-hero.svg');
 const map=read('docs/assets/24gotop-platform-map.svg');
 const evidence=read('docs/assets/24gotop-evidence-loop.svg');
 const contributions=read('docs/assets/24gotop-contribute.svg');
 assert.match(hero,/Hosted community publishing: pre-launch/);
 for(const marker of ['Public OSS + website','Hosted Core','Community + agents',
   'AVAILABLE TODAY','PRIVATE · UNDER REVIEW','PLANNED · NOT LIVE',
   'NOT launched'])
  assert.ok(map.includes(marker),'architecture truthfulness: '+marker);
 for(const marker of ['PROBLEM','IMPLEMENT','VERIFY','PUBLISH',
   'Tests + sources','Canonical, RSS, links','unverified outcomes'])
  assert.ok(evidence.includes(marker),'editorial proof diagram: '+marker);
 for(const marker of ['Code &amp; security','Languages &amp; UX','Research &amp; docs',
   'Find an issue','Focused PR','Tests + CI','Review + feedback'])
  assert.ok(contributions.includes(marker),'contributor guide: '+marker);
 for(const text of [hero,map,evidence,contributions]){
  assert.doesNotMatch(text,/<script\b|<foreignObject\b|<image\b|<iframe\b|<animate\b|@import|data:/i);
  assert.doesNotMatch(text,/\bon\w+=|href="https?:/i);
 }
});

test('README visual landmarks link only to local revision-controlled SVGs',()=>{
 const top=publicREADME.indexOf('24gotop-readme-hero.svg');
 const evidence=publicREADME.indexOf('24gotop-evidence-loop.svg');
 const journey=publicREADME.indexOf('24gotop-writer-journey.svg');
 const map=publicREADME.indexOf('24gotop-platform-map.svg');
 const contribute=publicREADME.indexOf('24gotop-contribute.svg');
 assert.ok(top>=0&&top<evidence&&evidence<journey&&journey<map&&map<contribute,
  'editorial image order should match the narrative without crowding the first screen');
 assert.match(publicREADME,/<a href="https:\/\/24go\.top\/engineering\/"><img src="\.\/docs\/assets\/readme-icons\/article\.svg" alt="" width="18" height="18"> Read articles<\/a>/);
 assert.match(publicREADME,/<a href="https:\/\/24go\.top\/draft-lab\.html"><img src="\.\/docs\/assets\/readme-icons\/edit\.svg" alt="" width="18" height="18"> Try Draft Lab<\/a>/);
 assert.match(publicREADME,/<img src="\.\/docs\/assets\/readme-icons\/code\.svg" alt="" width="18" height="18"> \*\*Build against developer tools\*\*/);
});
