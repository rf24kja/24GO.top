import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {discoverPublicHtmlRoutes} from '../scripts/discover-public-html.mjs';
import {RESPONSIVE_VIEWPORTS} from '../scripts/responsive-viewports.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const script=read('scripts/check-mobile-layout.mjs');
const landing=read('site/landing.css');
const interior=read('site/interior.css');

test('responsive Chromium coverage includes real touch phones, rotations, tablets and desktop mode',()=>{
 assert.equal(RESPONSIVE_VIEWPORTS.length,18);
 assert.ok(Object.isFrozen(RESPONSIVE_VIEWPORTS));
 assert.ok(RESPONSIVE_VIEWPORTS.every(x=>Object.isFrozen(x)));
 assert.equal(new Set(RESPONSIVE_VIEWPORTS.map(x=>x.name)).size,18);
 assert.equal(new Set(RESPONSIVE_VIEWPORTS.map(x=>x.width+'x'+x.height+':'+x.mobile)).size,18);
 assert.equal(Math.min(...RESPONSIVE_VIEWPORTS.map(x=>x.width)),280);
 assert.equal(Math.max(...RESPONSIVE_VIEWPORTS.map(x=>x.width)),1920);
 assert.ok(RESPONSIVE_VIEWPORTS.some(x=>x.mobile&&x.width===320));
 assert.ok(RESPONSIVE_VIEWPORTS.some(x=>x.mobile&&x.width===390&&x.dpr===3));
 assert.ok(RESPONSIVE_VIEWPORTS.some(x=>x.mobile&&x.width===768));
 assert.ok(RESPONSIVE_VIEWPORTS.some(x=>x.mobile&&x.width===1024));
 assert.ok(RESPONSIVE_VIEWPORTS.some(x=>!x.mobile&&x.width===1280));
 assert.ok(RESPONSIVE_VIEWPORTS.some(x=>!x.mobile&&x.width===1440));
 assert.ok(RESPONSIVE_VIEWPORTS.some(x=>!x.mobile&&x.width===1920));
 assert.ok(RESPONSIVE_VIEWPORTS.some(x=>x.theme==='light'));
 assert.ok(RESPONSIVE_VIEWPORTS.some(x=>x.reducedMotion===true));
 for(const x of RESPONSIVE_VIEWPORTS){
  assert.ok(Number.isSafeInteger(x.width)&&x.width>=280&&x.width<=1920);
  assert.ok(Number.isSafeInteger(x.height)&&x.height>=320&&x.height<=1180);
  assert.ok(Number.isSafeInteger(x.dpr)&&x.dpr>=1&&x.dpr<=3);
  assert.equal(typeof x.mobile,'boolean');
  if(x.shortLandscape){
   assert.equal(x.mobile,true);
   assert.ok(x.width>x.height&&x.height<=450&&x.width<=950);
  }
 }
 assert.equal(RESPONSIVE_VIEWPORTS.filter(x=>x.shortLandscape).length,4);
});

test('the real Chromium matrix exercises CSS layout, navigation targets, accessibility modes and zero mobile-only desktop shortcuts',()=>{
 assert.match(script,/for\(const profile of RESPONSIVE_VIEWPORTS\)/);
 assert.match(script,/Emulation\.setDeviceMetricsOverride/);
 assert.match(script,/mobile:profile\.mobile/);
 assert.match(script,/Emulation\.setTouchEmulationEnabled/);
 assert.match(script,/enabled:profile\.mobile/);
 assert.match(script,/Emulation\.setEmulatedMedia/);
 assert.match(script,/prefers-color-scheme/);
 assert.match(script,/prefers-reduced-motion/);
 assert.match(script,/box\.navigation\.some\(link=>link\.height<43\.5/);
 assert.match(script,/profile\.shortLandscape&&box\.headerPosition==='sticky'/);
 assert.match(script,/box\.scroll>box\.viewport\+1/);
 assert.match(script,/for\(const path of PATHS\)/);
 assert.doesNotMatch(script,/WIDTHS=\[/);
 assert.doesNotMatch(script,/overflow-x\s*:\s*hidden/);
});

test('both public header systems scroll naturally on short phone landscape without hiding navigation',()=>{
 for(const [css,selector] of [[landing,'.site-header'],[interior,'header.interior-header']]){
  assert.match(css,/@media\(orientation:landscape\) and \(max-height:450px\) and \(max-width:950px\)/);
  assert.ok(css.includes(selector+'{position:relative}'),selector);
 }
 assert.match(landing,/\.site-header \.header-inner>nav a\{[^}]*min-height:44px/);
 assert.match(interior,/\.interior-header \.interior-links a\{[^}]*min-height:44px/);
 assert.doesNotMatch(landing,/body\{[^}]*overflow-x:hidden/);
 assert.doesNotMatch(interior,/body\{[^}]*overflow-x:hidden/);
});

test('German and other long translated card labels cannot enlarge the 280px grid track',()=>{
 assert.match(landing,/\.cards\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(landing,/\.card\{min-height:0;min-width:0;padding:24px;overflow-wrap:anywhere\}/);
 assert.ok(RESPONSIVE_VIEWPORTS.some(x=>x.width===280&&x.mobile));
});

test('reading path builder reuses the same reset and color tokens as the public engineering archive',()=>{
 const html=read('site/engineering/reading-paths/index.html');
 const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)]
  .map(match=>match[1]);
 assert.deepEqual(styles,['../notes.css','../../interior.css','../paths.css']);
 const base=read('site/engineering/notes.css');
 assert.match(base,/\*\{box-sizing:border-box\}/);
 assert.match(base,/body\{margin:0/);
 assert.match(base,/--text:/);
 assert.match(base,/--border:/);
});


test('every published HTML route is covered automatically by real Chromium device matrix',async()=>{
 const root=fileURLToPath(new URL('../site/',import.meta.url));
 const actual=await discoverPublicHtmlRoutes(root);
 const expected=[];
 const scan=(dir,prefix='')=>{
  for(const item of readdirSync(dir,{withFileTypes:true})){
   if(item.isDirectory())scan(join(dir,item.name),prefix+item.name+'/');
   else if(item.isFile()&&item.name.endsWith('.html'))expected.push(prefix+item.name);
  }
 };
 scan(root);
 assert.ok(expected.length>=30,'do not silently drop article/topic/privacy pages');
 assert.deepEqual(actual,expected.sort());
 assert.ok(Object.isFrozen(actual));
 for(const key of ['index.html','privacy.html','draft-lab.html',
  'engineering/index.html','engineering/reading-paths/index.html',
  'engineering/topics/security.html','engineering/why-draft-lab-first.html']){
  assert.ok(actual.includes(key),'missing required route '+key);
 }
 assert.match(script,/const PATHS=await discoverPublicHtmlRoutes\(ROOT\)/);
 assert.match(script,/for\(const path of PATHS\)/);
 assert.doesNotMatch(script,/const PATHS=\[/);
 assert.equal(RESPONSIVE_VIEWPORTS.length*actual.length,18*expected.length);
});

test('privacy controls are reachable through the same mobile navigation as public articles',()=>{
 const privacy=read('site/privacy.html');
 assert.match(privacy,/<a class="skip" href="#main-content">/);
 assert.match(privacy,/<main class="wrap" id="main-content" tabindex="-1"/);
 assert.match(privacy,/<nav aria-label="Main navigation">/);
 for(const href of ['/engineering/','/engineering/reading-paths/','/draft-lab.html']){
  assert.ok(privacy.includes('href="'+href+'"'),href);
 }
 assert.match(privacy,/rel="stylesheet" href="\/landing\.css"/);
 assert.match(landing,/\.site-header \.header-inner>nav a\{[^}]*min-height:44px/);
});


test('280px topic heading and article card text wrap instead of pushing the viewport',()=>{
 const notes=read('site/engineering/notes.css');
 assert.match(notes,/@media\(max-width:400px\)\{\s*h1\{font-size:clamp\(29px,9vw,38px\);letter-spacing:-\.04em;overflow-wrap:anywhere\}/);
 assert.match(notes,/\.topic-guide__steps>li>div\{min-width:0\}/);
 assert.ok(RESPONSIVE_VIEWPORTS.some(x=>x.width===280&&x.mobile));
});


test('printable public engineering articles hide interactive UI but preserve readable attribution and code',()=>{
 const css=read('site/engineering/notes.css');
 assert.match(css,/@media print\{/);
 assert.match(css,/body:has\(main \.article\)>header/);
 assert.match(css,/body:has\(main \.article\)>footer/);
 assert.match(css,/body:has\(main \.article\) \.article-report/);
 assert.match(css,/body:has\(main \.article\) \.related-reading/);
 assert.match(css,/body:has\(main \.article\) main \.article \.details/);
 assert.match(css,/body:has\(main \.article\) main \.article pre code\{[^}]*white-space:pre-wrap/);
 assert.match(script,/const printWidths=\[280,768,1440\]/);
 assert.match(script,/media:'print'/);
 assert.match(script,/printedRoutes\.size<10/);
 assert.match(script,/!q\.attributionVisible/);
 assert.match(script,/!q\.hiddenReport/);
 assert.match(script,/!q\.hiddenRelated/);
 assert.match(script,/!q\.hiddenReader/);
 assert.doesNotMatch(css,/body:has\(main \.article\)\s*{\s*overflow-x:hidden/);
});
