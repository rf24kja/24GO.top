import test from 'node:test';
import assert from 'node:assert/strict';
import { TopClient, TopClientError } from '../packages/sdk/index.mjs';

const fake = (data, status=200) => async () => new Response(JSON.stringify(data), { status });

test('read-only SDK makes GET requests without authorization tokens', async () => {
  const calls=[];
  const client = new TopClient({
    fetchImpl: async (url,options) => {
      calls.push({url,options});
      return new Response(JSON.stringify({posts:[]}));
    }
  });
  assert.deepEqual((await client.listPosts({locale:'ru',category:'tools',limit:3})).posts,[]);
  assert.equal(calls.length,1);
  const url=new URL(calls[0].url);
  assert.equal(url.pathname,'/api/posts');
  assert.equal(url.searchParams.get('locale'),'ru');
  assert.equal(url.searchParams.get('category'),'tools');
  assert.equal(url.searchParams.get('limit'),'3');
  assert.equal(calls[0].options.headers?.authorization,undefined);
  assert.equal(calls[0].options.redirect,'error');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
});

test('SDK includes HTTP status, handles malformed response', async () => {
  const client=new TopClient({fetchImpl:fake({error:'Invalid locale'},400)});
  await assert.rejects(client.health(),error=>{
    assert.ok(error instanceof TopClientError);
    assert.equal(error.status,400);
    assert.match(error.message,/Invalid locale/);
    return true;
  });
  const broken=new TopClient({fetchImpl:async()=>new Response('not-json')});
  await assert.rejects(broken.health(),/invalid JSON/);
});

test('SDK network failures return stable redacted error', async () => {
  const client=new TopClient({fetchImpl:async()=>{throw Error('internal credential secret');}});
  await assert.rejects(client.health(),error=>{
    assert.ok(error instanceof TopClientError);
    assert.doesNotMatch(error.message,/credential|secret/);
    assert.match(error.message,/network request failed/);
    return true;
  });
});

test('SDK rejects credentials in origin and unreasonable timeout', () => {
  for(const baseURL of ['ftp://example.com','https://user:secret@example.com','https://example.com/extra','https://example.com/?token=abc']) {
    assert.throws(()=>new TopClient({baseURL}),/baseURL/);
  }
  assert.throws(()=>new TopClient({apiKey:''}),/apiKey/);
  assert.throws(()=>new TopClient({timeoutMs:0}),/timeoutMs/);
  assert.throws(()=>new TopClient({fetchImpl:null}),/fetchImpl/);
});

test('SDK never sends dev publisher key over remote HTTP', async () => {
  const calls=[];
  const client=new TopClient({
    baseURL:'http://example.org',apiKey:'local-dev-key',
    fetchImpl:async (...args)=>{calls.push(args);return new Response('{}');}
  });
  await assert.rejects(client.publishPost({title:'unsafe'}),/Refusing to send/);
  assert.equal(calls.length,0);
});

test('SDK keeps read unauthenticated and adds key only to local publish POST', async () => {
  const calls=[];
  const client=new TopClient({apiKey:'local-dev-key',fetchImpl:async(url,options)=>{
    calls.push({url,options});return new Response(JSON.stringify({post:{id:'demo'}}));
  }});
  await client.health();
  assert.equal((await client.publishPost({title:'Local post'})).post.id,'demo');
  assert.equal(calls[0].options.headers?.authorization,undefined);
  assert.equal(calls[1].options.method,'POST');
  assert.equal(calls[1].options.headers.authorization,'Bearer local-dev-key');
});
