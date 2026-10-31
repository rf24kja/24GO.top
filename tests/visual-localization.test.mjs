import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const locales=['en','ru','th','es','fr','de','pt','zh'];
const ownText={ru:/Статьи|Проверяемые/,th:/บทความ|ความรู้/,es:/Artículos|Conocimiento/,fr:/Articles|savoir/,de:/Artikel|Wissen/,pt:/Artigos|Conhecimento/,zh:/文章|知识/};
function safe(svg){assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);assert.doesNotMatch(svg,/<script\b|<foreignObject\b|<image\b|<use\b|onload=|onclick=|javascript:|https?:\/\/(?!www\.w3\.org)/i);assert.doesNotMatch(svg,/<clipPath/)}
test('language switch also changes both homepage images and README header artwork',()=>{
 for(const code of locales){const ext=code==='en'?'':'.'+code;
  const home=read('site/'+(code==='en'?'':code+'/')+'index.html');
  const md=read(code==='en'?'README.md':'docs/i18n/README.'+code+'.md');
  const network=read('site/visuals/knowledge-network'+ext+'.svg');
  const poster=read('site/visuals/24gotop-showcase'+ext+'.svg');
  const hero=read('docs/assets/24gotop-readme-hero'+ext+'.svg');
  for(const art of [network,poster,hero])safe(art);
  assert.ok(home.includes('visuals/knowledge-network'+ext+'.svg'),code+' illustration');
  assert.ok(home.includes('visuals/24gotop-showcase'+ext+'.svg'),code+' poster');
  assert.ok(md.includes('24gotop-readme-hero'+ext+'.svg'),code+' README header');
  assert.equal(poster,hero,'README and site poster should remain identical');
  assert.match(network,/Agent Arena: PLANNED/);
  assert.match(poster,/Hosted community publishing: pre-launch/);
  if(code!=='en'){assert.match(network,ownText[code]);assert.match(poster,ownText[code]);}
  for(const [x,y] of [[52,248],[360,248],[52,440],[360,440]]){
   assert.ok(network.includes('x="'+x+'" y="'+y+'" width="288" height="170"'),code+' 4 fully visible cards');
   assert.ok(x+288<700&&y+170<740);
  }
  assert.ok(poster.includes('x="1024" y="277" width="310" height="183"'));
  assert.ok(1024+310<1400&&277+183<560);
 }
});
test('figure captions cannot cover artwork and mobile posters use full portrait source',()=>{
 const css=read('site/landing.css');
 assert.match(css,/\.hero-illustration figcaption\{position:static/);
 assert.match(css,/@media\(max-width:620px\)\{\.visual-showcase__media\{height:auto\}/);
 assert.match(read('site/index.html'),/<picture><source media="\(max-width: 620px\)" srcset="\.\/visuals\/knowledge-network\.svg"/);
 for(const code of locales.slice(1)){
  const html=read('site/'+code+'/index.html');
  assert.ok(html.includes('srcset="../visuals/knowledge-network.'+code+'.svg"'));
  assert.ok(html.includes('<picture>'));
 }
});
