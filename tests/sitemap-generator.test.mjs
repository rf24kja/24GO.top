import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSitemap,renderSitemap} from '../scripts/build-sitemap.mjs';
import {renderEngineeringFeed} from '../scripts/build-engineering-json-feed.mjs';

const root=new URL('../site/',import.meta.url);
const page=p=>readFileSync(new URL(p,root),'utf8');
const home=page('index.html');
const items=JSON.parse(renderEngineeringFeed()).items;
const build=(overrides={})=>buildSitemap({
 home:overrides.home??home,
 feed:{items:overrides.items??items},
 readPage:overrides.readPage??page
});
test('checked-in sitemap matches source-validated article inventory',()=>{
 const xml=renderSitemap();
 assert.equal(page('sitemap.xml'),xml);
 const urls=[...xml.matchAll(/<url><loc>([^<]+)<\/loc><\/url>/g)].map(x=>x[1]);
 assert.equal(urls.length,15+items.length);
 assert.equal(new Set(urls).size,urls.length);
 assert.deepEqual(urls.slice(15),items.map(x=>x.url));
 for(const topic of ['security','writing','infrastructure','publishing'])
  assert.ok(urls.includes('https://24go.top/engineering/topics/'+topic+'.html'));
 assert.ok(!xml.includes('draft-lab.html'));
 assert.ok(!xml.includes('<lastmod>'));
});
test('untrusted and duplicate article URLs fail closed',()=>{
 const first=items[0];
 assert.throws(()=>build({items:[first,first]}),/duplicate/);
 assert.throws(()=>build({items:[{...first,url:'https://invalid.test/article.html'}]}),/untrusted article/);
 assert.throws(()=>build({items:[]}),/invalid sources/);
});
test('locale and canonical mismatches fail closed',()=>{
 assert.throws(()=>build({home:home.replace(
  'hreflang="ru" href="https://24go.top/ru/"',
  'hreflang="ru" href="https://invalid.test/ru/"')}),/untrusted locale/);
 assert.throws(()=>build({readPage:p=>p==='ru/index.html'
  ?page(p).replace('<link rel="canonical" href="https://24go.top/ru/">','')
  :page(p)}),/unindexable canonical/);
 assert.throws(()=>build({readPage:p=>p==='progress.html'
  ?page(p).replace('</head>','<meta name="robots" content="noindex"></head>')
  :page(p)}),/unindexable canonical/);
});
