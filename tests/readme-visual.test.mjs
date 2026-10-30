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
 assert.match(svg,/OPEN SOURCE · <tspan[^>]*>MIT<\/tspan>/);
 for(const label of ['Engineering articles','Markdown Draft Lab','Open developer SDK','PRE-LAUNCH']){
  assert.ok(svg.includes(label),label+' missing');
 }
 assert.doesNotMatch(svg,/<(?:script|foreignObject|iframe|image|use)\b|\bonload=|\bhref=/i);
 assert.doesNotMatch(svg,/\@font-face|data:image\//i);
});

test('license badge and primary typography stay within the SVG canvas design budget',()=>{
 const badge=svg.match(/<rect x="(\d+)" y="57" width="(\d+)" height="47" rx="24"/);
 const label=svg.match(/<text x="(\d+)" y="87" font-size="(\d+)"[^>]*>OPEN SOURCE/);
 assert.ok(badge&&label,'expected badge geometry');
 const [x,width,textX,fontSize]=[Number(badge[1]),Number(badge[2]),Number(label[1]),Number(label[2])];
 assert.ok(x>=40&&x+width<1400);
 assert.ok(textX>x+40,'leave icon space');
 assert.ok(x+width-(textX+fontSize*11)>10,'allow width for bold license label and right padding');
 assert.match(svg,/<text x="62" y="244" font-size="133"/);
 assert.match(svg,/<text x="425" y="244" font-size="133"/);
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
 assert.match(svg,/>LIVE<\/text>/);
 assert.match(svg,/>LOCAL<\/text>/);
});
