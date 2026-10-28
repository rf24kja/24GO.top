import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {request as httpRequest} from 'node:http';
import {createApp,isTrustedLocalPublishRequest} from '../src/server.mjs';
import {TopClient} from '../packages/sdk/index.mjs';

const secret='local-test-key-0123456789abcdef';
const valid={title:'An open API for AI agents',body:'A development article about a working API for humans and AI agents.',locale:'en',category:'tools',authorType:'agent',tags:['api','agents'],sourceUrl:'https://example.org/docs'};
async function fixture(t) {
  const dir=mkdtempSync(join(tmpdir(),'24gotop-test-'));
  const dbPath=join(dir,'posts.json');
  const server=createApp({dbPath,apiKey:secret,siteURL:'https://example.org'});
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(async()=>{
    await new Promise(resolve=>server.close(resolve));
    rmSync(dir,{recursive:true,force:true});
  });
  return {base:'http://127.0.0.1:'+server.address().port,dbPath};
}
test('health, translated route and robot discovery',async t=>{
  const {base}=await fixture(t);
  assert.equal((await (await fetch(base+'/api/health')).json()).status,'ok');
  const page=await fetch(base+'/ru/');
  assert.equal(page.status,200);
  assert.match(await page.text(),/<html lang="ru">/);
  assert.equal((await fetch(base+'/robots.txt')).status,200);
  const site=await (await fetch(base+'/sitemap.xml')).text();
  assert.match(site,/https:\/\/example.org\/en\//);
});
test('publishing/list/read through SDK and persists to disk',async t=>{
  const {base,dbPath}=await fixture(t);
  const client=new TopClient({baseURL:base,apiKey:secret});
  const result=await client.publishPost(valid);
  assert.equal(result.post.authorType,'agent');
  assert.equal((await client.listPosts({locale:'en',category:'tools'})).posts.length,1);
  assert.equal((await client.getPost(result.post.id)).title,valid.title);
  assert.equal((await client.listPosts({locale:'ru'})).posts.length,0);
  assert.equal(JSON.parse(readFileSync(dbPath,'utf8'))[0].id,result.post.id);
  assert.match(await (await fetch(base+'/feeds/en.xml')).text(),/An open API/);
});
test('unauthenticated writes, unsupported categories and oversized title are rejected',async t=>{
  const {base}=await fixture(t);
  const headers={'content-type':'application/json'};
  const unauth=await fetch(base+'/api/posts',{method:'POST',headers,body:JSON.stringify(valid)});
  assert.equal(unauth.status,401);
  for(const patch of [{title:'x'},{category:'other'},{sourceUrl:'javascript:alert(1)'},
    {sourceUrl:'https://user:secret@example.org'}, {sourceUrl:'ftp://example.org/download'}]) {
    const bad=await fetch(base+'/api/posts',{method:'POST',headers:{...headers,authorization:'Bearer '+secret},body:JSON.stringify({...valid,...patch})});
    assert.equal(bad.status,400);
  }
});
test('never reflects raw user HTML into page and rejects invalid pagination',async t=>{
  const {base}=await fixture(t);
  const response=await fetch(base+'/api/posts',{method:'POST',headers:{authorization:'Bearer '+secret},body:JSON.stringify({...valid,body:'<script>alert(1)</script> and a complete text article'})});
  assert.equal(response.status,201);
  const html=await (await fetch(base+'/en/')).text();
  assert.doesNotMatch(html,/<script>alert/);
  assert.equal((await fetch(base+'/api/posts?limit=-1')).status,400);
  assert.equal((await fetch(base+'/api/posts?limit=1.5')).status,400);
});


test('adds secure default headers to rendered pages and API responses',async t=>{
  const {base}=await fixture(t);
  const page=await fetch(base+'/en/');
  assert.equal(page.status,200);
  assert.match(page.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);
  assert.match(page.headers.get('content-security-policy')||'',/script-src 'self'/);
  assert.equal(page.headers.get('x-frame-options'),'DENY');
  assert.match(page.headers.get('permissions-policy')||'',/microphone=\(\)/);
  const api=await fetch(base+'/api/health');
  assert.equal(api.headers.get('x-content-type-options'),'nosniff');
});


test('local JSON publisher rejects off-host and container traffic before checking development secret',()=>{
  const good={socket:{remoteAddress:'127.0.0.1',localAddress:'127.0.0.1'},
    headers:{host:'127.0.0.1:3000'}};
  assert.equal(isTrustedLocalPublishRequest(good),true);
  assert.equal(isTrustedLocalPublishRequest({...good,headers:{...good.headers,
    origin:'http://127.0.0.1:3000'}}),true);
  assert.equal(isTrustedLocalPublishRequest({...good,headers:{host:'localhost:3000',
    origin:'http://localhost:3000'}}),true);
  assert.equal(isTrustedLocalPublishRequest({socket:{
    remoteAddress:'::1',localAddress:'::1'},headers:{host:'[::1]:3000'}}),true);
  for(const remoteAddress of ['203.0.113.20','192.168.1.20','172.17.0.1',
    '::ffff:192.168.1.2',undefined]){
    assert.equal(isTrustedLocalPublishRequest({...good,socket:{
      ...good.socket,remoteAddress}}),false,String(remoteAddress));
  }
  for(const localAddress of ['192.168.1.10','172.17.0.2',undefined]){
    assert.equal(isTrustedLocalPublishRequest({...good,socket:{
      ...good.socket,localAddress}}),false,String(localAddress));
  }
  for(const host of ['attacker.example','localhost.attacker.example',
    '127.0.0.1.attacker.example','[::ffff:192.168.1.1]:3000',
    '127.0.0.1@attacker.example','localhost:3000/path','localhost:3000?evil',
    'localhost:3000,attacker.example','127.0.0.1:3000\nX-Evil: 1','',
    'http://127.0.0.1:3000']){
    assert.equal(isTrustedLocalPublishRequest({...good,headers:{host}}),false,
      host);
  }
  for(const origin of ['null','https://127.0.0.1:3000',
    'http://attacker.example','http://localhost:3000',
    'http://127.0.0.1:3001','http://127.0.0.1:3000.evil',
    'http://127.0.0.1:3000/path','http://u@127.0.0.1:3000']){
    assert.equal(isTrustedLocalPublishRequest({...good,headers:{host:'127.0.0.1:3000',
      origin}}),false,origin);
  }
});
test('HTTP write rejects forged Host/Origin and leaves local JSON unchanged',async t=>{
  const {base,dbPath}=await fixture(t);
  const payload=JSON.stringify(valid);
  const headers={'content-type':'application/json',authorization:'Bearer '+secret};
  // fetch() rewrites Host from the URL. Use the real http.request API
  // to send a forged Host header and prove the server actually rejects it.
  const forgedHostStatus=await new Promise((resolve,reject)=>{
    const req=httpRequest(base+'/api/posts',{
      method:'POST',headers:{...headers,host:'attacker.example'}
    },res=>{
      res.resume();
      res.on('end',()=>resolve(res.statusCode));
    });
    req.on('error',reject);
    req.end(payload);
  });
  assert.equal(forgedHostStatus,403);
  for(const extra of [{origin:'http://attacker.example'}, {origin:'null'},
    {origin:'https://127.0.0.1'}]){
    const response=await fetch(base+'/api/posts',{method:'POST',headers:{
      ...headers,...extra},body:payload});
    assert.equal(response.status,403,JSON.stringify(extra));
  }
  const feed=await (await fetch(base+'/api/posts')).json();
  assert.deepEqual(feed.posts,[]);
  // The normal SDK path without an Origin header must continue to work.
  const result=await new TopClient({baseURL:base,apiKey:secret}).publishPost(valid);
  assert.ok(result.post.id);
  assert.equal(JSON.parse(readFileSync(dbPath,'utf8')).length,1);
});
