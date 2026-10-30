import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const base=fileURLToPath(new URL('../',import.meta.url));
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const root=read('README.md');
const locales=['ru','th','es','fr','de','pt','zh'];
const all=[['README.md',root],...locales.map(l=>['docs/i18n/README.'+l+'.md',read('docs/i18n/README.'+l+'.md')])];

test('README has genuine project images with descriptive alt text and a clear, honest pre-launch disclosure',()=>{
 assert.match(root,/docs\/assets\/24gotop-readme-hero\.svg/);
 assert.match(root,/docs\/assets\/24gotop-platform-map\.svg/);
 assert.match(root,/OPEN SOURCE|Open AI Knowledge Network/);
 assert.match(root,/NOT a launched publishing community/);
 assert.match(root,/Hosted accounts, user publishing, comments/);
 assert.match(root,/Founder and official project lead: \[@rf24kja\]/);
 assert.match(root,/\[MIT license\]\(LICENSE\)/);
 assert.match(root,/\bNode\.js\s*22\+/);
 assert.match(root,/npm run demo:read/);
 assert.match(root,/Current boundary|What still needs work/);
 assert.match(root,/Search \/ AI discovery plan/);
 assert.doesNotMatch(root,/100% secure|production[- ]ready community|already launched|\bDAU\b\s*:\s*\d+/i);
});

test('all eight languages have an actual self-contained translated project page, not a flags-only selector',()=>{
 assert.equal(all.length,8);
 for(const [file,body] of all){
  assert.ok(body.length>1800,file+' must contain substantial translated explanation');
  assert.ok(body.includes('https://24go.top/engineering/'),file+' links to public editorial articles');
  assert.ok(body.includes('docs/assets/')||body.includes('../assets/'),file+' links project infographic');
  assert.ok(body.includes('npm run check')&&body.includes('npm test')&&body.includes('npm run dev'),file+' runnable local developer example');
  assert.ok(body.includes('https://github.com/rf24kja/24GO.top/issues/8'),file+' translation feedback');
  assert.ok(body.includes('https://github.com/rf24kja/24GO.top/issues/29'),file+' volunteer testing');
  assert.ok(body.includes('https://github.com/rf24kja'),file+' source attribution');
  for(const label of ['English','Русский','ไทย','Español','Français','Deutsch','Português','中文']){
    assert.ok(body.includes(label),file+' locale navigation missing '+label);
  }
  for(const locale of locales){
   assert.ok(body.includes('README.'+locale+'.md'),file+' missing locale link '+locale);
  }
  assert.ok(body.includes('README.md'),file+' English fallback');
  assert.doesNotMatch(body,/PUBLISH_API_KEY\s*[:=]|sb_secret_|service_role|\bBearer\s+[A-Za-z0-9._-]+/);
 }
});

test('every relative Markdown link and asset in the README family resolves inside the public repository',()=>{
 const regex=/!?(?:\[[^\]]*\])\(([^\s)]+)(?:\s+"[^"]*")?\)/g;
 for(const [file,body] of all){
  const folder=dirname(resolve(base,file));
  for(const match of body.matchAll(regex)){
   const target=match[1].split('#')[0];
   if(!target||target.startsWith('https://')||target.startsWith('http://'))continue;
   const full=resolve(folder,decodeURIComponent(target));
   assert.ok(full.startsWith(base),file+' relative link escapes repository: '+target);
   assert.ok(existsSync(full),file+' has a dead relative link: '+target);
  }
 }
});

test('original GitHub README SVG graphics are self-contained, accessible and free of active external content',()=>{
 for(const file of ['24gotop-readme-hero.svg','24gotop-platform-map.svg']){
  const svg=read('docs/assets/'+file);
  assert.match(svg,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/<title id="title">/);
  assert.match(svg,/<desc id="desc">/);
  assert.match(svg,/role="img" aria-labelledby="title desc"/);
  assert.match(svg,file==='24gotop-readme-hero.svg' ? /viewBox="0 0 1400 560"/ : /viewBox="0 0 1200 565"/);
  assert.match(svg,/#(?:050E13|09221D|A6FFD6|0B1419|68CDA0|8CF7BF)/);
  assert.ok(svg.length<16000,'no bloated or binary graphics');
  assert.doesNotMatch(svg,/<script\b|<foreignObject\b|<image\b|<iframe\b|<style\b|@import|url\(https?:|javascript:|onload=|onclick=|<animate\b|<use\b/i);
 }
 assert.match(read('docs/assets/24gotop-platform-map.svg'),/PRIVATE · UNDER REVIEW|NOT launched/);
 assert.match(read('docs/assets/24gotop-readme-hero.svg'),/Hosted community publishing: pre-launch/);
});
