import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {waitForUniquePagesArtifact} from '../scripts/wait-pages-artifact.mjs';

const repository='rf24kja/24GO.top',runId='123456789';
const token='test-only-token';
const artifact=(id,name='github-pages')=>({id,name,expired:false});
const response=(artifacts,options={})=>new Response(
 JSON.stringify({artifacts}),{
  status:options.status||200,
  headers:{'content-type':'application/json',...options.headers}
 });
const opts={repository,runId,token,pauseMs:0,wait:async()=>{}};

test('Pages deployment waits for exactly one indexed artifact in its own run',async()=>{
 const calls=[];const pauses=[];
 const result=await waitForUniquePagesArtifact({...opts,attempts:5,
  wait:async ms=>{pauses.push(ms);},
  fetcher:async(url,init)=>{
   calls.push({url,init});
   return calls.length===1?response([]):response([artifact(123)]);
  }});
 assert.deepEqual({...result},{ready:true,attempt:2,artifact:'github-pages'});
 assert.equal(calls.length,2);
 assert.equal(pauses.length,1);
 for(const {url,init} of calls){
  assert.equal(url,'https://api.github.com/repos/'+repository+
   '/actions/runs/'+runId+'/artifacts?per_page=100');
  assert.equal(init.method,'GET');
  assert.equal(init.credentials,'omit');
  assert.equal(init.redirect,'error');
  assert.equal(init.cache,'no-store');
  assert.equal(init.headers.authorization,'Bearer '+token);
  assert.equal(init.headers.accept,'application/vnd.github+json');
  assert.equal(init.headers['x-github-api-version'],'2022-11-28');
 }
});

test('missing artifact times out without attempting deployment',async()=>{
 let requests=0,delays=0;
 await assert.rejects(waitForUniquePagesArtifact({...opts,attempts:3,
  fetcher:async()=>{requests++;return response([]);},
  wait:async()=>{delays++;}
 }),/not indexed/);
 assert.equal(requests,3);
 assert.equal(delays,2);
});

test('duplicate Pages artifacts fail closed rather than deploying an ambiguous archive',async()=>{
 let requests=0;
 await assert.rejects(waitForUniquePagesArtifact({...opts,attempts:9,
  fetcher:async()=>{requests++;return response([
   artifact(14104866264),artifact(14103874328)
  ]);}
 }),/Duplicate Pages artifacts/);
 assert.equal(requests,1);
});

test('other artifact names or expired artifacts cannot satisfy the deploy gate',async()=>{
 await assert.rejects(waitForUniquePagesArtifact({...opts,attempts:1,
  fetcher:async()=>response([
   artifact(55,'unrelated'),{...artifact(89),expired:true},
   artifact(0),{name:'github-pages',id:'bogus',expired:false}
  ])
 }),/not indexed/);
});

test('GitHub API temporary rate-limiting and service errors are retryable, auth failure is not',async()=>{
 let count=0;
 const ok=await waitForUniquePagesArtifact({...opts,attempts:4,
  fetcher:async()=>{
   count++;
   return count===1?new Response('',{status:503}):
    count===2?new Response('',{status:429}):
    response([artifact(8)]);
  }});
 assert.equal(ok.attempt,3);
 assert.equal(count,3);
 let forbidden=0;
 await assert.rejects(waitForUniquePagesArtifact({...opts,attempts:5,
  fetcher:async()=>{forbidden++;return new Response('',{status:403});}
 }),/HTTP 403/);
 assert.equal(forbidden,1);
});

test('invalid repo, run id, credentials and caller budgets are refused before network use',async()=>{
 const cases=[
  {...opts,repository:'somebody/../repo'},
  {...opts,repository:'https://evil.example/owner/repo'},
  {...opts,runId:'0'},
  {...opts,runId:'15?foo=bar'},
  {...opts,token:''},
  {...opts,attempts:0},
  {...opts,attempts:26},
  {...opts,pauseMs:15001},
  {...opts,fetcher:null}
 ];
 for(const item of cases){
  await assert.rejects(waitForUniquePagesArtifact({
   ...item,fetcher:item.fetcher===null?null:async()=>{throw Error('must not contact API');}
  }),/Invalid Pages artifact readiness configuration/);
 }
});

test('malformed, non-JSON, redirected or oversized metadata is not accepted',async()=>{
 const metadata='x'.repeat(65537);
 const oversized=new Response(metadata,{status:200,headers:{'content-type':'application/json'}});
 const invalid=[
  new Response('<html>bad</html>',{status:200,headers:{'content-type':'text/html'}}),
  new Response('{invalid}',{status:200,headers:{'content-type':'application/json'}}),
  new Response('[]',{status:200,headers:{'content-type':'application/json'}}),
  oversized,
  new Response('[]',{status:200,headers:{'content-type':'application/json',
   'content-length':'65537'}})
 ];
 for(const value of invalid)await assert.rejects(waitForUniquePagesArtifact({
  ...opts,attempts:1,fetcher:async()=>value
 }));
});

test('Pages workflow validates exact artifact readiness before deploying with least privileges',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 const script=readFileSync(new URL('../scripts/wait-pages-artifact.mjs',import.meta.url),'utf8');
 const tokenEnv='GITHUB_TOKEN: $'+'{{ github.token }}';
 const start=workflow.indexOf('      - name: Upload ONLY the static site');
 const wait=workflow.indexOf('      - name: Require one indexed Pages artifact before deploying');
 const deploy=workflow.indexOf('      - name: Deploy\n');
 assert.ok(start>0&&wait>start&&deploy>wait,'deploy waits for indexed upload');
 assert.match(workflow,/^  actions: read$/m);
 assert.match(workflow,/^  pages: write$/m);
 assert.match(workflow,/^  id-token: write$/m);
 assert.match(workflow,/run: node scripts\/wait-pages-artifact\.mjs/);
 assert.ok(workflow.includes(tokenEnv),'token is passed only as masked job environment');
 assert.doesNotMatch(script,/console\.log\(token\)|console\.error\(token\)|process\.stdout\.write\(token\)/);
 assert.doesNotMatch(script,/https?:\/\/[^\s'"]*evil\./);
});
