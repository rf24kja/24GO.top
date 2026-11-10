import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../site/'+file,import.meta.url),'utf8');
const name='fix-mobile-horizontal-overflow-with-chromium-tests.html';
const url='https://24go.top/engineering/'+name;
const article=read('engineering/'+name);
const index=read('engineering/index.html');
const rss=read('engineering/feed.xml');
const sitemap=read('sitemap.xml');
const llms=read('llms.txt');
const feed=JSON.parse(read('engineering/feed.json'));
const search=JSON.parse(read('engineering/search-index.json'));

test('published mobile regression guide is real, source-backed, canonical and discoverable',()=>{
 assert.match(article,/<h1>How to fix mobile horizontal overflow with real Chromium layout tests<\/h1>/);
 assert.match(article,/<link rel="canonical" href="https:\/\/24go\.top\/engineering\/fix-mobile-horizontal-overflow-with-chromium-tests\.html">/);
 for(const pr of [189,190,191])assert.ok(article.includes('https://github.com/rf24kja/24GO.top/pull/'+pr));
 for(const run of [42863517188,42863705970,42863705951])
  assert.ok(article.includes('https://github.com/rf24kja/24GO.top/actions/runs/'+run));
 for(const marker of ['98 layout combinations','320','418','minmax(0,1fr)','overflow-wrap:anywhere',
   'overflow-x:hidden','physical Android or iOS']){
  assert.ok(article.includes(marker),'missing article evidence or evidence boundary: '+marker);
 }
 assert.ok(index.includes('data-note-file="'+name+'"'));
 assert.ok(rss.includes('<link>'+url+'</link>'));
 assert.ok(sitemap.includes('<loc>'+url+'</loc>'));
 assert.ok(llms.includes(url));
 assert.equal(feed.items[0]?.url,url);
 assert.equal(search.articles[0]?.file,name);
 assert.ok(search.articles[0]?.text.includes('chromium'));
 assert.ok(search.articles[0]?.text.includes('localized'));
 assert.equal(article.includes('<meta name="robots" content="noindex'),false);
 assert.match(article,/<aside class="article-report"/);
});
test('mobile article links to actual implemented checks, not a fake hosted product',()=>{
 const css=read('landing.css'),locale=read('localized.css');
 const qa=readFileSync(new URL('../scripts/check-mobile-layout.mjs',import.meta.url),'utf8');
 const audit=readFileSync(new URL('../scripts/verify-public-static.mjs',import.meta.url),'utf8');
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert.ok(locale.includes('.localized-roadmap h2{overflow-wrap:anywhere'));
 assert.match(qa,/PASS .*Chromium mobile\/tablet layouts/);
 for(const asset of ['/landing.css','/localized.css'])assert.ok(audit.includes(asset));
 assert.doesNotMatch(article,/public registration is open|users can publish directly|registered users today/i);
});
