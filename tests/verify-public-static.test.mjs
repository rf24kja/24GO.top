import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FIXED_ROUTES,sourcePath,sitemapRoutes,releaseRoutes,verifyPublicStatic} from '../scripts/verify-public-static.mjs';
const SAMPLE='<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
 ['/','/ru/','/th/','/es/','/fr/','/de/','/pt/','/zh/','/engineering/','/engineering/x.html']
 .map(x=>'<url><loc>https://24go.top'+x+'</loc></url>').join('')+'</urlset>';
const utf8=x=>new TextEncoder().encode(x);
const text=(data,status=200)=>new Response(data,{status});

test('builds fixed + sitemap inventory with no accidental duplicates',()=>{
 const routes=releaseRoutes(SAMPLE);
 assert.equal(routes.length,new Set([...FIXED_ROUTES,...sitemapRoutes(SAMPLE)]).size);
 assert.ok(routes.includes('/engineering/x.html'));
 assert.equal(sourcePath('/ru/').pathname.endsWith('/site/ru/index.html'),true);
});

test('rejects off-origin, traversal, duplicate, encoded and unsafe sitemap routes',()=>{
 for(const href of ['https://evil.test/article.html','https://24go.top.evil.test/article.html',
   'https://24go.top/%2e%2e/secrets','https://24go.top/engineering/../secrets',
   'https://24go.top/x.html?token=oops','http://24go.top/','https://24go.top/x%20y.html']){
  const modified=SAMPLE.replace('https://24go.top/engineering/x.html',href);
  assert.throws(()=>sitemapRoutes(modified),TypeError);
 }
 assert.throws(()=>sitemapRoutes(SAMPLE.replace('https://24go.top/engineering/x.html','https://24go.top/')),/Duplicate/);
 for(const path of ['/../secret','//evil','/a//b.html','/a?x=1','https://evil.test/x'])
  assert.throws(()=>sourcePath(path),TypeError);
});

test('accepts byte-identical HTTPS responses with no credentials or redirects',async()=>{
 const seen=new Set();
 const result=await verifyPublicStatic({sitemap:SAMPLE,
  readSource:async route=>utf8('asset:'+route),
  fetchImpl:async (url,options)=>{
   const route=new URL(url).pathname;
   assert.equal(new URL(url).origin,'https://24go.top');
   assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
   assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
   assert.ok(!JSON.stringify(options).match(/Authorization|token|service_role/i));
   seen.add(route);return text('asset:'+route);
  }
 });
 assert.equal(result.verified,true);assert.equal(result.checked,seen.size);
});

test('fails closed on changed assets, redirects, missing resources and network errors',async()=>{
 const base={sitemap:SAMPLE,concurrency:1,readSource:async route=>utf8('asset:'+route)};
 for(const fetchImpl of [async()=>text('different'),async()=>text('missing',404),
   async()=>text('redirect',302),async()=>{throw new Error('DNS');}]){
  await assert.rejects(verifyPublicStatic({...base,fetchImpl}),/missing or stale/);
 }
});

test('rejects streamed oversized responses, malformed inputs and missing source before network',async()=>{
 let calls=0;
 await assert.rejects(verifyPublicStatic({sitemap:SAMPLE,
  readSource:async()=>new Uint8Array(600000),fetchImpl:async()=>{calls++}}),/Invalid local/);
 assert.equal(calls,0);
 await assert.rejects(verifyPublicStatic({sitemap:SAMPLE,
  readSource:async route=>utf8('asset:'+route),concurrency:1,
  fetchImpl:async()=>new Response(new Uint8Array(600000))}),/missing or stale/);
 await assert.rejects(verifyPublicStatic({sitemap:SAMPLE,concurrency:0}),TypeError);
});

test('does not run network requests without a valid sitemap',async()=>{
 let calls=0;
 await assert.rejects(verifyPublicStatic({sitemap:'<?xml?><urlset></urlset>',
  fetchImpl:async()=>{calls++}}),TypeError);
 assert.equal(calls,0);
});
