import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(fileURLToPath(new URL('../site/'+path,import.meta.url)),'utf8');
const html=read('index.html'),css=read('landing.css'),js=read('landing.js');

test('premium landing keeps canonical SEO, truthful prelaunch and navigation',()=>{
 assert.match(html,/<link rel="canonical" href="https:\/\/24go\.top\/">/);
 assert.match(html,/<h1 id="hero-title">Knowledge worth/);
 assert.match(html,/Hosted public publishing is not live/);
 assert.match(html,/PRE-LAUNCH/);
 assert.match(html,/<a class="skip" href="#main-content">Skip to main content<\/a>/);
 assert.match(html,/<main id="main-content" tabindex="-1">/);
 assert.match(html,/<nav aria-label="Main navigation">/);
 for(const link of ['./engineering/','./draft-lab.html','./progress.html',
  './engineering/feed.xml','https://github.com/rf24kja/24GO.top']){
  assert.ok(html.includes('href="'+link+'"'),'missing main/public link: '+link);
 }
 for(const link of ['docs/ROADMAP.md','docs/CONTRIBUTOR_START.md',
  'docs/SDK_QUICKSTART.md','API.md']){
  assert.ok(html.includes(link),'missing genuine resource: '+link);
 }
 assert.match(html,/id="russian-note" lang="ru"/);
 assert.doesNotMatch(html,/PUBLISH_API_KEY|sb_secret_|service_role|public registration is open/i);
});

test('architectural grid is decorative, system-themed, responsive and motion-safe',()=>{
 assert.match(html,/<div class="site-grid" aria-hidden="true">/);
 assert.match(html,/<link rel="stylesheet" href="\.\/landing\.css">/);
 assert.match(html,/<script src="\.\/landing\.js" defer><\/script>/);
 assert.match(css,/\.site-grid\{[^}]*pointer-events:none/);
 assert.match(css,/\.site-grid__lines\{[^}]*background-image:linear-gradient/);
 assert.match(css,/background-size:48px 48px/);
 assert.match(css,/\.site-grid__glow\{[^}]*radial-gradient/);
 assert.match(css,/@media\(prefers-color-scheme:light\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:400px\)/);
 assert.match(css,/\.site-header\{position:sticky/);
 assert.match(css,/:focus-visible\{outline:3px solid #68ebb0/);
 assert.match(css,/\.site-header nav\{order:3;width:100%/);
 assert.match(css,/overflow-x:auto/);
 assert.doesNotMatch(css,/@import|url\(https?:\/\//);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML|eval\s*\(/);
});

function browser({reduced=false,fine=true,observer=true}={}){
 const listeners={},styles={},classNames=new Set(),jobs=[],sections=[0,1,2].map(()=>({
  classes:new Set(),classList:{add(){}}
 }));
 for(const section of sections){
  section.classList.add=key=>section.classes.add(key);
 }
 const watched=[],unwatched=[];
 class FakeObserver{
  constructor(cb){this.notify=cb;}
  observe(el){watched.push(el);}
  unobserve(el){unwatched.push(el);}
 }
 const window={
  innerWidth:960,innerHeight:700,
  matchMedia(query){return {matches:query.includes('reduced-motion')?reduced:fine};},
  addEventListener(type,cb,options){listeners[type]={cb,options};},
  requestAnimationFrame(fn){jobs.push(fn);return jobs.length;}
 };
 if(observer)window.IntersectionObserver=FakeObserver;
 const doc={
  documentElement:{style:{setProperty(k,v){styles[k]=v;}},classList:{add(x){classNames.add(x);}}},
  querySelectorAll(selector){assert.equal(selector,'[data-reveal]');return sections;}
 };
 runInNewContext(js,{window,document:doc,IntersectionObserver:FakeObserver},{timeout:1000});
 return {window,doc,listeners,styles,jobs,sections,watched,unwatched,classNames};
}
test('pointer glow is rAF-throttled and reveal sections never require external code',()=>{
 const app=browser();
 assert.ok(app.listeners.pointermove);
 assert.equal(app.listeners.pointermove.options.passive,true);
 assert.ok(app.classNames.has('motion-ready'));
 assert.equal(app.watched.length,3);
 app.listeners.pointermove.cb({clientX:130,clientY:220});
 app.listeners.pointermove.cb({clientX:260,clientY:340});
 assert.equal(app.jobs.length,1,'one scheduled frame per burst');
 app.jobs.shift()();
 assert.equal(app.styles['--glow-x'],'260px');
 assert.equal(app.styles['--glow-y'],'340px');
 const tracker=new FakeStub();
 // Triggering observer events must reveal only intersecting elements.
 const code=js;
 assert.match(code,/entry\.target\.classList\.add\('in-view'\)/);
 assert.match(code,/observer\.unobserve\(entry\.target\)/);
});
class FakeStub{}
test('reduced-motion, coarse pointers and no Observer remain safely static',()=>{
 const reduced=browser({reduced:true});
 assert.equal(Object.keys(reduced.listeners).length,0);
 assert.equal(reduced.classNames.size,0);
 const coarse=browser({fine:false});
 assert.equal(Object.keys(coarse.listeners).length,0);
 assert.equal(coarse.classNames.size,0);
 const noObserver=browser({observer:false});
 assert.ok(noObserver.listeners.pointermove);
 assert.equal(noObserver.classNames.has('motion-ready'),false);
});
