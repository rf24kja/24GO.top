// Cross-channel publication regression guard for public reviewed articles.
// This does not imply that search engines indexed any article or that a hosted
// authenticated publishing backend exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL('../site/'+p,import.meta.url),'utf8');
const root = 'https://24go.top/engineering/';
const feed = JSON.parse(read('engineering/feed.json'));
const rss = read('engineering/feed.xml');
const sitemap = read('sitemap.xml');
const archive = read('engineering/index.html');
const search = JSON.parse(read('engineering/search-index.json'));
const cards = [...archive.matchAll(/<article class="card" data-note-card data-note-topic="[^"]+" data-note-file="([^"]+)">/g)].map(m=>m[1]);

test('every reviewed public article is discoverable in all five committed channels',()=>{
  assert.equal(feed.version,'https://jsonfeed.org/version/1.1');
  assert.equal(search.version,1);
  assert.ok(feed.items.length>0);
  const filenames = feed.items.map(item=>{
    assert.equal(item.id,item.url);
    assert.ok(item.url.startsWith(root));
    const file=item.url.slice(root.length);
    assert.match(file,/^[a-z0-9-]+\.html$/);
    assert.equal(item.language,'en');
    assert.ok(item.title?.length>10);
    assert.ok(item.summary?.length>30);
    const html=read('engineering/'+file);
    assert.ok(html.includes('<link rel="canonical" href="'+item.url+'">'));
    assert.ok(html.includes('<h1>'));
    assert.ok(html.includes('<article class="article">'));
    assert.ok(html.includes('<aside class="article-report"'));
    assert.ok(rss.includes('<link>'+item.url+'</link>'),'missing RSS: '+file);
    assert.ok(sitemap.includes('<loc>'+item.url+'</loc>'),'missing sitemap: '+file);
    return file;
  });
  assert.equal(new Set(filenames).size,filenames.length);
  assert.deepEqual(new Set(cards),new Set(filenames),'archive cards must equal published article set');
  assert.deepEqual(new Set(search.articles.map(a=>a.file)),new Set(filenames),'search text must cover the same reviewed articles');
  assert.equal(cards.length,filenames.length,'no duplicate or unreviewed archive cards');
  assert.equal(search.articles.length,filenames.length,'no duplicate search entries');
  for(const entry of search.articles){
    assert.ok(typeof entry.text==='string'&&entry.text.length>=300);
    assert.equal(entry.text,entry.text.toLocaleLowerCase());
  }
});

test('a canonical public article has an exact single RSS and sitemap URL',()=>{
  for(const item of feed.items){
    const occurrences=(source,needle)=>source.split(needle).length-1;
    assert.equal(occurrences(rss,'<link>'+item.url+'</link>'),1,item.url);
    assert.equal(occurrences(sitemap,'<loc>'+item.url+'</loc>'),1,item.url);
    const html=read('engineering/'+item.url.slice(root.length));
    const metadata=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(metadata.length,1,item.url);
    const structured=JSON.parse(metadata[0][1]);
    assert.equal(structured.headline,item.title);
    assert.equal(structured.mainEntityOfPage?.['@id'],item.url);
    assert.equal(structured.inLanguage,'en');
    assert.equal(Date.parse(structured.datePublished),Date.parse(item.date_published));
  }
});
