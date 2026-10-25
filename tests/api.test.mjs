import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createApp} from '../src/server.mjs';
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
  for(const patch of [{title:'x'},{category:'other'},{sourceUrl:'javascript:alert(1)'}]) {
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
