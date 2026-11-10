import test from 'node:test';
import assert from 'node:assert/strict';
import {
 EDITORIAL_PUBLIC_ROUTES,loadEditorialPublicAssets,
 verifyEditorialPublicPages,formatEditorialPagesEvidenceSummary
} from '../scripts/verify-pages-delivery.mjs';

function responder(assets,{mutate=null,status=200,record=[]}={}){
 return async (url,opts)=>{
  const parsed=new URL(url);
  record.push({url,opts});
  assert.equal(parsed.origin,'https://24go.top');
  assert.match(parsed.search,/^\?pages_audit=42$/);
  assert.equal(opts.method,'GET');
  assert.equal(opts.credentials,'omit');
  assert.equal(opts.redirect,'error');
  assert.equal(opts.referrerPolicy,'no-referrer');
  const text=assets[parsed.pathname];
  assert.equal(typeof text,'string','no network path outside fixed allowlist');
  return new Response(
   mutate?.path===parsed.pathname?mutate.content:text,
   {status}
  );
 };
}

test('editorial source catalog has fixed distinct paths and byte budgets',async()=>{
 const assets=await loadEditorialPublicAssets();
 assert.equal(EDITORIAL_PUBLIC_ROUTES.length,9);
 assert.equal(new Set(EDITORIAL_PUBLIC_ROUTES.map(v=>v.path)).size,8);
 assert.deepEqual(Object.keys(assets),EDITORIAL_PUBLIC_ROUTES.map(v=>v.path));
 for(const entry of EDITORIAL_PUBLIC_ROUTES){
  assert.match(entry.path,/^\/[a-z0-9/.\-]+$/);
  assert.ok(assets[entry.path].includes(entry.marker));
  assert.ok(Buffer.byteLength(assets[entry.path],'utf8')<=98304);
 }
 assert.match(assets['/sitemap.xml'],/read-only-mcp-server-for-technical-articles.html/);
 assert.match(assets['/engineering/feed.json'],/read-only-mcp-server-for-technical-articles.html/);
 assert.match(assets['/engineering/feed.xml'],/read-only-mcp-server-for-technical-articles.html/);
});

test('nine exact public editorial assets pass without arbitrary provider destinations',async()=>{
 const assets=await loadEditorialPublicAssets(),record=[];
 const proof=await verifyEditorialPublicPages({
  runId:'42',expectedAssets:assets,
  attempts:1,pauseMs:0,fetchImpl:responder(assets,{record})
 });
 assert.deepEqual(proof,{verified:true,checked:9});
 assert.equal(record.length,9);
 assert.match(formatEditorialPagesEvidenceSummary(proof.checked),/9\/9 byte-exact/);
});

test('stale canonical article refuses publication proof, even if other files match',async()=>{
 const assets=await loadEditorialPublicAssets();
 const path='/engineering/read-only-mcp-server-for-technical-articles.html';
 const mutated={path,content:assets[path].replace('Giving an AI agent','Giving an outdated AI agent')};
 await assert.rejects(verifyEditorialPublicPages({
  runId:'42',expectedAssets:assets,fetchImpl:responder(assets,{mutate:mutated}),
  attempts:1,pauseMs:0
 }),/asset missing or outdated/);
});

test('non-200 CDN response cannot pass exact editorial publication proof',async()=>{
 const assets=await loadEditorialPublicAssets();
 await assert.rejects(verifyEditorialPublicPages({
  runId:'42',expectedAssets:assets,fetchImpl:responder(assets,{status:404}),
  attempts:1,pauseMs:0
 }),/asset missing or outdated/);
});

test('invalid run IDs, incomplete manifests and overlarge payload expectations fail closed',async()=>{
 const assets=await loadEditorialPublicAssets();
 for(const params of [
  {runId:'nope',expectedAssets:assets},
  {runId:'42',expectedAssets:{...assets,'/bad-route':'evil'}},
  {runId:'42',expectedAssets:{}},
  {runId:'42',expectedAssets:{...assets,[EDITORIAL_PUBLIC_ROUTES[0].path]:'wrong'}},
  {runId:'42',expectedAssets:assets,attempts:0}
 ]){
  await assert.rejects(verifyEditorialPublicPages({
   ...params,fetchImpl:async()=>{throw Error('must not fetch');}
  }),/Invalid exact editorial Pages expectations/);
 }
 assert.throws(()=>formatEditorialPagesEvidenceSummary(7),/Incomplete editorial/);
});

test('redirects and oversized responses are rejected without leaking response bytes',async()=>{
 const assets=await loadEditorialPublicAssets();
 for(const fetchImpl of [
  async()=>new Response('',{status:302,headers:{location:'https://evil.example/'}}),
  async()=>new Response('Z'.repeat(65537),{status:200})
 ]){
  await assert.rejects(verifyEditorialPublicPages({
   runId:'42',expectedAssets:assets,attempts:1,pauseMs:0,fetchImpl
  }),/asset missing or outdated/);
 }
});
