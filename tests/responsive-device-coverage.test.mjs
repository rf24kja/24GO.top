import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
