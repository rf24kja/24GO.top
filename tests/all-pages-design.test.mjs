import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';

const site=fileURLToPath(new URL('../site/',import.meta.url));
const read=path=>readFileSync(join(site,path),'utf8');
const withinSite=target=>target===site.slice(0,-1)||target.startsWith(site);
const articleNames=[
 'multilingual-markdown-editor-without-losing-drafts.html',
 'verify-github-pages-deploy-not-just-ci.html',
 'safe-markdown-citation-links-without-xss.html',
 'discoverable-technical-articles.html',
 'javascript-sdk-api-key-leak-prevention.html',
 'markdown-preview-safety.html',
 'postgres-insert-returning-least-privilege.html',
 'submit-is-not-publish.html',
 'why-draft-lab-first.html'
];
const interiors=['progress.html','draft-lab.html','engineering/index.html',...articleNames.map(x=>'engineering/'+x)];

test('all thirteen actual Pages documents use one coherent visual system',()=>{
 const home=read('index.html'),landing=read('landing.css');
 assert.match(home,/<link rel="stylesheet" href="\.\/landing\.css">/);
 assert.match(home,/class="site-grid" aria-hidden="true"/);
 assert.match(home,/href="#main-content"/);
 assert.match(home,/<nav aria-label="Main navigation">/);
 assert.match(landing,/@media\(prefers-color-scheme:light\)/);
 assert.match(landing,/@media\(prefers-reduced-motion:reduce\)/);

 const shared=read('interior.css');
 assert.match(shared,/background-size:48px 48px/);
 assert.match(shared,/\.interior-links a\[aria-current="page"\]/);
 assert.match(shared,/@media\(max-width:400px\)/);
 assert.match(shared,/@media\(prefers-color-scheme:light\)/);
 assert.match(shared,/@media\(prefers-contrast:more\)/);
 assert.match(shared,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(shared,/@import|url\(https?:\/\//);

 for(const path of interiors){
  const html=read(path),folder=dirname(join(site,path));
  const relative=path.startsWith('engineering/')?'../interior.css':'./interior.css';
  assert.ok(html.includes('href="'+relative+'"'),path+' must load common design');
  assert.match(html,/<nav class="wrap interior-nav" aria-label="Main navigation">/);
  assert.match(html,/<header class="[^"]*interior-header"/);
  assert.match(html,/<footer class="interior-footer">/);
  assert.match(html,/<a class="skip" href="#main-content"(?: data-ui="skip")?>/);
  assert.match(html,/id="main-content" tabindex="-1"/);
  assert.match(html,/class="interior-links"/);
  for(const name of ['Home','Articles','Draft Lab','Development','GitHub ↗']){
   assert.ok(html.includes('>'+name+'</a>'),path+' missing '+name);
  }
  const linked=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)];
  assert.ok(linked.length>=2,path+' needs page and shared CSS');
  for(const [,href] of linked){
   const destination=resolve(folder,href);
   assert.ok(withinSite(destination),path+' resolves inside site');
   assert.ok(existsSync(destination),path+' missing '+href);
  }
  const nav=html.match(/<nav class="wrap interior-nav"[\s\S]*?<\/nav>/)?.[0]||'';
  for(const [,href] of nav.matchAll(/href="([^"]+)"/g)){
   if(href.startsWith('https://'))continue;
   const target=resolve(folder,href);
   assert.ok(withinSite(target),path+' escapes site');
   assert.ok(existsSync(target),path+' missing local nav target '+href);
  }
 }
});

test('article SEO and public prototype distinctions survive design convergence',()=>{
 for(const name of articleNames){
  const html=read('engineering/'+name);
  assert.ok(html.includes('href="https://24go.top/engineering/'+name+'"'),name+' canonical');
  assert.match(html,/<link rel="stylesheet" href="\.\/notes\.css">/);
 }
 const catalogue=read('engineering/index.html');
 assert.equal((catalogue.match(/<article class="card" data-note-card data-note-topic="[^"]+">/g)||[]).length,9);
 assert.match(catalogue,/data-engineering-search hidden/);
 const editor=read('draft-lab.html');
 assert.match(editor,/name="robots" content="noindex,follow"/);
 assert.match(editor,/does not publish, upload or automatically save your writing/);
 const timeline=read('progress.html');
 assert.match(timeline,/href="\.\/progress\.css"/);
 assert.doesNotMatch(timeline,/<style>/);
 assert.match(timeline,/Verified user accounts, production publishing and community discussions are not launched/);
 const styles=['landing.css','draft-lab.css','engineering/notes.css','progress.css'];
 for(const name of styles){
  const css=read(name);
  assert.match(css,/@media\(prefers-color-scheme:light\)/,name);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,name);
 }
});
