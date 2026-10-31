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

test('SDK never sends dev publisher key to remote HTTP or HTTPS', async () => {
  const calls=[];
  const client=new TopClient({
    baseURL:'http://example.org',apiKey:'local-dev-key',
    fetchImpl:async (...args)=>{calls.push(args);return new Response('{}');}
  });
  assert.throws(() => client.publishPost({title:'unsafe'}), /Refusing to send/);
  assert.equal(calls.length,0);
  for(const baseURL of ['https://example.org','https://api.example.org',
    'http://192.168.1.10:3000','http://127.0.0.1.evil.example',
    'https://localhost.evil.example']){
    const remote=new TopClient({baseURL,apiKey:'local-dev-key',
      fetchImpl:async(...args)=>{calls.push(args);return new Response('{}');}});
    assert.throws(()=>remote.publishPost({title:'not for remote'}),
      /Refusing to send/,baseURL);
  }
  assert.equal(calls.length,0,'no development credential transmitted to remote targets');
  const remoteReader=new TopClient({baseURL:'https://example.org',
    fetchImpl:async()=>new Response('{"status":"ok"}')});
  assert.equal((await remoteReader.health()).status,'ok');
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

test('SDK forwards caller cancellation without exposing abort reasons', async () => {
  const controller = new AbortController();
  let combined;
  const client = new TopClient({ fetchImpl: async (_url, { signal }) => {
    combined = signal;
    return new Promise((_resolve, reject) => {
      if (signal.aborted) reject(signal.reason);
      else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  } });
  const pending = client.listPosts({ locale: 'en', signal: controller.signal });
  controller.abort(new Error('private credential must stay hidden'));
  await assert.rejects(pending, error => {
    assert.ok(error instanceof TopClientError);
    assert.equal(error.code, 'ABORTED');
    assert.equal(error.status, null);
    assert.doesNotMatch(error.message, /credential|private/i);
    return true;
  });
  assert.equal(combined.aborted, true);
});

test('pre-aborted SDK requests never reach fetch, including publisher POST', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  const client = new TopClient({ apiKey: 'local-dev-key', fetchImpl: async () => {
    calls++;
    return new Response('{}');
  } });
  await assert.rejects(client.health({ signal: controller.signal }), e => e.code === 'ABORTED');
  await assert.rejects(client.getPost('test', { signal: controller.signal }), e => e.code === 'ABORTED');
  await assert.rejects(client.publishPost({ title: 'local only' }, { signal: controller.signal }), e => e.code === 'ABORTED');
  assert.equal(calls, 0);
  await assert.rejects(client.health({ signal: {} }), TypeError);
});

test('SDK timeout remains active with a caller signal and is distinguishable', async () => {
  const controller = new AbortController();
  const client = new TopClient({ timeoutMs: 100, fetchImpl: async (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    })
  });
  // Keep an ordinary timer alive: AbortSignal.timeout uses an unref timer in Node.
  const keepAlive = setTimeout(() => {}, 200);
  try {
    await assert.rejects(client.health({ signal: controller.signal }), error => {
      assert.equal(error.code, 'TIMEOUT');
      assert.match(error.message, /timed out/);
      return true;
    });
    assert.equal(controller.signal.aborted, false);
  } finally {
    clearTimeout(keepAlive);
  }
});


test('SDK rejects reported oversized JSON without consuming the body', async () => {
  let pulls=0, cancelled=0;
  const stream=new ReadableStream({
    pull(controller){pulls++;controller.enqueue(new Uint8Array([123]));},
    cancel(){cancelled++;}
  });
  const client=new TopClient({fetchImpl:async()=>new Response(stream,{
    headers:{'content-length':String(3*1024*1024)}
  })});
  await assert.rejects(client.health(),error=>{
    assert.equal(error.code,'RESPONSE_TOO_LARGE');
    assert.equal(error.status,200);
    assert.doesNotMatch(error.message,/credential/i);
    return true;
  });
  assert.ok(pulls<=1,'no large response body should be consumed');
  assert.equal(cancelled,1);
});

test('SDK stops streaming an oversized untrusted JSON response', async () => {
  let pulls=0, cancelled=0;
  const stream=new ReadableStream({
    pull(controller){
      pulls++;
      controller.enqueue(new Uint8Array(1024*1024));
    },
    cancel(){cancelled++;}
  });
  const client=new TopClient({fetchImpl:async()=>new Response(stream)});
  await assert.rejects(client.listPosts(),error=>{
    assert.ok(error instanceof TopClientError);
    assert.equal(error.code,'RESPONSE_TOO_LARGE');
    return true;
  });
  assert.ok(pulls<=4,'bounded stream must not read the whole response');
  assert.equal(cancelled,1);
});

test('SDK rejects malformed UTF-8 without leaking response content', async () => {
  const bytes=new Uint8Array([123,34,120,34,58,34,255,34,125]);
  const client=new TopClient({fetchImpl:async()=>new Response(bytes)});
  await assert.rejects(client.health(),error=>{
    assert.equal(error.code,'INVALID_JSON');
    assert.doesNotMatch(error.message,/secret|credential|\\uFFFD/i);
    return true;
  });
});

test('SDK preserves split multibyte Unicode when safely parsing streaming JSON', async () => {
  const bytes=new TextEncoder().encode(JSON.stringify({posts:[{title:'ภาษาไทย и 中文'}]}));
  const middle=bytes.indexOf(0xe0);
  assert.ok(middle>0,'test contains a multibyte code point');
  const stream=new ReadableStream({
    start(controller){
      controller.enqueue(bytes.slice(0,middle+1));
      controller.enqueue(bytes.slice(middle+1));
      controller.close();
    }
  });
  const client=new TopClient({fetchImpl:async()=>new Response(stream)});
  const result=await client.listPosts();
  assert.equal(result.posts[0].title,'ภาษาไทย и 中文');
});
