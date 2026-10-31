import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
const dir=new URL('../site/engineering/',import.meta.url);
const files=readdirSync(dir).filter(f=>f.endsWith('.html')&&f!=='index.html').sort();
const rss=readFileSync(new URL('feed.xml',dir),'utf8');
const sitemap=readFileSync(new URL('../site/sitemap.xml',import.meta.url),'utf8');
const index=readFileSync(new URL('index.html',dir),'utf8');
const items=[...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(v=>v[1]);

test('all real public article pages have matching visible byline, canonical metadata and JSON-LD',()=>{
 assert.equal(files.length,10,'only released editorial HTML, no pretend user posts');
 for(const file of files){
  const html=readFileSync(new URL(file,dir),'utf8');
  const canonical='https://24go.top/engineering/'+file;
  const visible=html.match(/<h1>([^<]+)<\/h1>/)?.[1];
  const jsonMatches=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(jsonMatches.length,1,'one schema.org object: '+file);
  const json=JSON.parse(jsonMatches[0][1]);
  assert.equal(json['@context'],'https://schema.org',file);
  assert.equal(json['@type'],'Article',file);
  assert.equal(json.headline,visible,'headline must match visible content: '+file);
  assert.equal(json.publisher.name,'24GOTOP',file);
  assert.equal(json.mainEntityOfPage['@id'],canonical,file);
  assert.equal(json.inLanguage,'en',file);
  assert.match(json.datePublished,/^2026-10-(26|29|30|31)T/,file);
  assert.ok(Number.isFinite(Date.parse(json.datePublished)),file);
  assert.ok(html.includes('content="'+json.datePublished+'"'),'date metadata: '+file);
  assert.equal(json.isAccessibleForFree,true,file);
  assert.ok(html.includes('<meta property="og:url" content="'+canonical+'">'),file);
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),file);
  assert.ok(html.includes('<meta name="description" content="'),file);
  assert.ok(html.includes('<h1>'),file);
  assert.ok(html.includes('24GOTOP engineering')||html.includes('24GOTOP founder')||
   html.includes('By <a href="https://github.com/rf24kja/24GO.top">24GOTOP Engineering</a>'),file);
  if(json.author['@type']==='Person'){
   assert.equal(file,'why-draft-lab-first.html');
   assert.equal(json.author.name,'rf24kja');
  }else assert.equal(json.author.name,'24GOTOP Engineering');
  assert.match(html,/<link rel="alternate" type="application\/rss\+xml"/,file);
  // Only inert structured-data scripts, never arbitrary active third-party scripts.
  assert.doesNotMatch(html,/<script\b(?! type="application\/ld\+json">)|<iframe\b|sb_secret_|PUBLISH_API_KEY|service_role/i,file);
  assert.ok(index.includes('href="./'+file+'"'),'archive: '+file);
  assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'),'sitemap: '+file);
  const item=items.filter(x=>x.includes('<link>'+canonical+'</link>'));
  assert.equal(item.length,1,'one unique RSS entry: '+file);
  const feedDate=item[0].match(/<pubDate>([^<]+)<\/pubDate>/)?.[1];
  assert.equal(Date.parse(feedDate),Date.parse(json.datePublished),'publication date same in RSS and JSON-LD: '+file);
 }
});

test('RSS contains exactly original public article pages and newest items are first',()=>{
 assert.equal(items.length,files.length);
 const times=items.map(item=>Date.parse(item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1]||''));
 assert.ok(times.every(Number.isFinite));
 for(let i=1;i<times.length;i++)assert.ok(times[i-1]>=times[i],
  'latest real article should be first in RSS, not sorting by keyword');
 const guids=items.map(item=>item.match(/<guid isPermaLink="true">([^<]+)<\/guid>/)?.[1]);
 assert.equal(new Set(guids).size,files.length);
 assert.ok(guids.every(uri=>uri?.startsWith('https://24go.top/engineering/')));
 assert.doesNotMatch(rss,/\bdraft-lab\.html\b|service_role|sb_secret_/i);
});
