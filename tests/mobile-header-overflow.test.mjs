import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../site/'+path,import.meta.url),'utf8');
const home=read('index.html');
const landing=read('landing.css');
const interior=read('interior.css');

test('all eight public homepages use the responsive shared header',()=>{
 for(const locale of ['en','ru','th','es','fr','de','pt','zh']){
  const path=locale==='en'?'index.html':locale+'/index.html';
  const html=read(path);
  assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1">/,path);
  assert.match(html,/<header class="site-header">/,path);
  assert.match(html,/<nav aria-label="Main navigation">/,path);
  assert.ok(html.includes(locale==='en'?'href="./landing.css"':'href="../landing.css"'),path);
  const nav=html.match(/<nav aria-label="Main navigation">([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav,path+' should have primary navigation');
  const links=[...nav.matchAll(/<a\s/g)];
  assert.ok(links.length>=4,path+' must keep all navigation links accessible');
 }
 assert.ok((home.match(/<nav aria-label="Main navigation">[\s\S]*?<\/nav>/)||[])[0].includes('Reading paths'));
});

test('mobile/tablet landing header has viewport-bounded multi-row navigation',()=>{
 assert.match(landing,/@media\(max-width:1120px\)/);
 assert.match(landing,/\.site-header \.header-inner>nav\{[^}]*display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(landing,/\.site-header \.header-inner>nav\{[^}]*flex:0 0 100%;width:100%;min-width:0/);
 assert.match(landing,/\.site-header \.header-inner>nav a\{[^}]*min-height:44px/);
 assert.match(landing,/\.site-header \.header-inner>nav a\{[^}]*white-space:normal;overflow-wrap:anywhere/);
 assert.match(landing,/@media\(max-width:520px\)\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(landing,/@media\(max-width:760px\)\{[\s\S]*?\.hero\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(landing,/@media\(max-width:520px\)\{[\s\S]*?\.footer-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.doesNotMatch(landing,/\b(?:html|body)\s*\{[^}]*overflow-x\s*:\s*hidden/,
  'do not hide page overflow instead of fixing the header');
});

test('all interior navigation stays wrappable for narrow and translated labels',()=>{
 assert.match(interior,/\.interior-links\{display:flex;[^}]*flex-wrap:wrap/);
 assert.match(interior,/@media\(max-width:760px\)\{[\s\S]*?\.interior-header \.interior-links a\{[^}]*min-height:44px/);
 assert.match(interior,/\.interior-header \.interior-links a\{[^}]*white-space:normal;overflow-wrap:anywhere/);
 for(const path of ['draft-lab.html','progress.html','contribute.html','engineering/index.html']){
  const html=read(path);
  assert.match(html,/class="interior-links"/,path);
  assert.ok(html.includes(path.startsWith('engineering/')?'href="../interior.css"':'href="./interior.css"'),path);
 }
});
