import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const homes={
 ru:'Создать маршрут чтения',th:'สร้างเส้นทางการอ่าน',
 es:'Crear una ruta de lectura',fr:'Créer un parcours de lecture',
 de:'Lesepfad erstellen',pt:'Criar uma trilha de leitura',
 zh:'创建阅读路线'
};
test('seven translated homepages link the working path builder with matching UI language',()=>{
 for(const [language,label] of Object.entries(homes)){
  const page=readFileSync(new URL('../site/'+language+'/index.html',import.meta.url),'utf8');
  const route='../engineering/reading-paths/?ui='+language;
  const link='<a class="localized-reading-path" href="'+route+'">'+label+' ↗</a>';
  assert.ok(page.includes(link),language+' localized route builder entry missing');
  assert.equal(page.split('href="'+route+'"').length-1,1,
   language+' duplicate route link');
  const readCard=page.match(/<article class="card"><span class="card-index">01 \/ READ<\/span>([\s\S]*?)<\/article>/);
  assert.ok(readCard,'public READ card missing in '+language);
  assert.ok(readCard[1].includes(link),'reading path link must be in the public READ card');
  assert.ok(readCard[1].includes('href="../engineering/"'),
   'original English article archive link must remain available');
  assert.ok(page.includes('href="../draft-lab.html?ui='+language+'"'),
   'existing localized author editor link must remain intact');
  assert.ok(!page.includes('https://24go.top/private'),
   'a public read link must not point into the private host');
 }
});

test('localized read-card links use independent 44px+ keyboard/touch targets',()=>{
 const css=readFileSync(new URL('../site/localized.css',import.meta.url),'utf8');
 assert.match(css,/\.card>a\.localized-reading-path\{[^}]*min-height:44px/);
 assert.match(css,/\.card>a\.localized-reading-path:focus-visible\{[^}]*outline:3px/);
 const ui=readFileSync(new URL('../site/engineering/paths.js',import.meta.url),'utf8');
 assert.match(ui,/PATH_LOCALES\.includes\(requestedLocale\)/);
 const keys=Object.keys(homes);
 const home=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
 assert.match(home,/href="\.\/engineering\/reading-paths\/"/);
 assert.equal(keys.length,7);
});
