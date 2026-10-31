import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const site=fileURLToPath(new URL('../site/',import.meta.url));
const read=path=>readFileSync(join(site,path),'utf8');
const home=read('index.html');
const css=read('landing.css');
const network=read('visuals/knowledge-network.svg');
const poster=read('visuals/24gotop-showcase.svg');
const readmeHero=readFileSync(new URL('../docs/assets/24gotop-readme-hero.svg',import.meta.url),'utf8');

test('visitors see approved imagery on the real published homepage, not just on GitHub',()=>{
 assert.match(home,/src="\.\/visuals\/knowledge-network\.svg"/);
 assert.match(home,/src="\.\/visuals\/24gotop-showcase\.svg"/);
 assert.match(home,/<figure class="hero-illustration">/);
 assert.match(home,/<section class="visual-showcase wrap" aria-labelledby="showcase-heading">/);
 assert.match(home,/<h2 id="showcase-heading">One vision\. Real progress\.<\/h2>/);
 assert.match(home,/Hosted public publishing is not live/);
 assert.match(home,/community publishing and verified agents are not live yet/);
 assert.match(home,/href="\.\/draft-lab\.html"/);
 assert.match(home,/href="\.\/engineering\/"/);
 assert.match(home,/src="\.\/visuals\/knowledge-network\.svg"[^>]+alt="[^"]+"/);
 assert.match(home,/src="\.\/visuals\/24gotop-showcase\.svg"[^>]+alt="[^"]+"/);
 assert.doesNotMatch(home,/href="https:\/\/24gotop-staging-auth\.vercel\.app/);
});

test('published SVG resources are local, independent of docs-only Pages exclusions',()=>{
 assert.equal(poster,readmeHero,'public and GitHub illustrations must not silently diverge');
 for(const svg of [network,poster]){
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/<title id=/);
  assert.match(svg,/<desc id=/);
  assert.doesNotMatch(svg,/<script\b|<foreignObject\b|<iframe\b|<image\b|<use\b|\bonload=|\bonclick=|javascript:|@import|@font-face/i);
  assert.doesNotMatch(svg,/https?:\/\/(?!www\.w3\.org\/2000\/svg)/i);
 }
 assert.match(network,/Agent Arena/);
 assert.match(network,/PLANNED/);
 assert.match(poster,/PRE-LAUNCH/);
 assert.match(poster,/OPEN SOURCE ·/);
});

test('home has genuine original inline pictogram icons, no third-party icon CDN',()=>{
 assert.equal((home.match(/class="card-symbol" aria-hidden="true"><svg/g)||[]).length,3);
 assert.equal((home.match(/<svg viewBox="0 0 40 40"/g)||[]).length,3);
 assert.match(css,/\.card-symbol svg\{width:31px;height:31px\}/);
 assert.doesNotMatch(home,/<script[^>]+src="https?:\/\//);
});

test('premiere image remains responsive, focus accessible and motion/privacy safe',()=>{
 assert.match(css,/@media\(max-width:760px\)[\s\S]+?\.hero-illustration\{width:min\(100%,480px\)/);
 assert.match(css,/@media\(max-width:520px\)[\s\S]+?\.visual-showcase__media\{height:260px\}/);
 assert.match(css,/\.visual-showcase__media\{overflow:hidden/);
 assert.match(css,/@media\(prefers-color-scheme:light\)/);
 assert.match(css,/@media\(prefers-contrast:more\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(home,/<a class="skip" href="#main-content">Skip to main content<\/a>/);
 // The only form is a native GET to the public archive, never a write endpoint.
 assert.equal((home.match(/<form\b/gi)||[]).length,1);
 assert.match(home,/<form class="hero-search" role="search" aria-label="[^"]+" method="get" action="\.\/engineering\/">/);
 assert.doesNotMatch(home,/method="post"|enctype=|onsubmit=|sb_secret_|PUBLISH_API_KEY/i);
});
