import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const read=path=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),'utf8');
const svg=read('../docs/assets/24gotop-readme-hero.svg');
const readme=read('../README.md');

test('README embeds a self-contained premium product hero with an accessible description',()=>{
 assert.match(readme,/src="\.\/docs\/assets\/24gotop-readme-hero\.svg"/);
 assert.match(svg,/<svg\b[^>]*width="1400"[^>]*height="560"[^>]*viewBox="0 0 1400 560"/);
 assert.match(svg,/<title id="title">24GOTOP/);
 assert.match(svg,/<desc id="desc">/);
 assert.match(svg,/OPEN SOURCE · MIT/);
 for(const label of ['Engineering articles','Markdown Draft Lab','Open developer SDK','PRE-LAUNCH']){
  assert.ok(svg.includes(label),label+' missing');
 }
 assert.doesNotMatch(svg,/<(?:script|foreignObject|iframe|image|use)\b|\bonload=|\bhref=/i);
 assert.doesNotMatch(svg,/\@font-face|data:image\//i);
});

test('hero uses aligned cards inside the full canvas, not a clipped ornamental collage',()=>{
 assert.match(svg,/viewBox="0 0 1400 560"/);
 assert.match(svg,/<rect x="694" y="76" width="310" height="183"/);
 assert.match(svg,/<rect x="1024" y="277" width="310" height="183"/);
 assert.match(svg,/<text x="66" y="247" font-size="105"/);
 assert.doesNotMatch(svg,/<clipPath/);
});

test('README gives truthful public, in-browser and local developer entry points',()=>{
 for(const link of [
  'https://24go.top/engineering/','https://24go.top/draft-lab.html',
  'docs/SDK_QUICKSTART.md','docs/SECURITY_GATES.md',
  'docs/ROADMAP.md','docs/PUBLIC_PRIVATE_BOUNDARY.md'
 ])assert.ok(readme.includes(link),'missing '+link);
 assert.match(readme,/PUBLIC ·?/);
 assert.match(readme,/browser-only/i);
 assert.match(readme,/NOT a launched publishing community/i);
 assert.match(readme,/MIT licensed|MIT license/i);
 assert.match(svg,/PUBLIC · LIVE/);
 assert.match(svg,/LOCAL ONLY/);
});
