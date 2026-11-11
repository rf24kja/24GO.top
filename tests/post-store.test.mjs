import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/server.mjs';
import { createPostStore, createSupabaseReadStore, StoreUnavailable } from '../src/post-store.mjs';

const url = 'https://demo-project.supabase.co';
const key = 'sb_publishable_0123456789abcdefghijklmnopqrstuvwxyz';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const row = {
  id,
  title: 'Read-only example article',
  body: 'This article is intentionally shown by a mocked anonymous Supabase request.',
  locale: 'en',
  category: 'tools',
  status: 'published',
  agent_id: null,
  published_at: '2026-10-25T12:00:00Z',
  author_id: 'private-user-id-that-must-not-leak'
};

function mockFetch(responseRows = [row]) {
  const calls = [];
  const fetchImpl = async (requestUrl, options) => {
    calls.push({ requestUrl: new URL(requestUrl), options });
    return new Response(JSON.stringify(responseRows), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  };
  return { calls, fetchImpl };
}

test('anonymous read uses only the publishable apikey and tightly scoped filters', async () => {
  const { calls, fetchImpl } = mockFetch();
  const store = createSupabaseReadStore({ url, publishableKey: key, fetchImpl });
  const posts = await store.list({ locale: 'en', category: 'tools', limit: 10 });
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0].tags, []);
  assert.equal(posts[0].authorType, 'human');
  assert.equal(posts[0].sourceUrl, null);
  assert.equal(JSON.stringify(posts).includes('private-user-id'), false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].requestUrl.pathname, '/rest/v1/posts');
  assert.equal(calls[0].requestUrl.searchParams.get('locale'), 'eq.en');
  assert.equal(calls[0].requestUrl.searchParams.get('category'), 'eq.tools');
  assert.equal(calls[0].requestUrl.searchParams.get('status'), 'eq.published');
  assert.equal(calls[0].requestUrl.searchParams.get('limit'), '10');
  assert.equal(calls[0].options.headers.apikey, key);
  assert.equal(calls[0].options.headers.authorization, undefined);
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.redirect, 'error');
});

test('read single published post; no matching post returns null', async () => {
  const { calls, fetchImpl } = mockFetch([row]);
  const store = createSupabaseReadStore({ url, publishableKey: key, fetchImpl });
  assert.equal((await store.get(id)).id, id);
  assert.equal(calls[0].requestUrl.searchParams.get('id'), 'eq.' + id);
  assert.equal(await store.get('not-a-uuid'), null);
  assert.equal(calls.length, 1);
  const empty = createSupabaseReadStore({ url, publishableKey: key, fetchImpl: mockFetch([]).fetchImpl });
  assert.equal(await empty.get(id), null);
});

test('configuration fails closed on service keys, invalid URLs or unknown modes', () => {
  assert.throws(
    () => createSupabaseReadStore({ url, publishableKey: 'sb_secret_0123456789abcdefghijklmnop' }),
    /publishable/i
  );
  for (const bad of [
    'http://demo-project.supabase.co',
    'https://demo-project.supabase.co.evil.example',
    'https://user:pass@demo-project.supabase.co',
    'https://demo-project.supabase.co/rest/v1/'
  ]) {
    assert.throws(() => createSupabaseReadStore({ url: bad, publishableKey: key }), /SUPABASE_URL/);
  }
  assert.throws(() => createPostStore({ mode: 'other', dbPath: '/tmp/unused' }), /Unknown POST_STORE/);
  assert.throws(() => createPostStore({ mode: 'supabase-readonly', dbPath: '/tmp/unused' }), /SUPABASE_URL/);
});

test('anonymous adapter rejects unpublished, malformed and oversized upstream responses', async () => {
  for (const rows of [
    [{ ...row, status: 'draft' }],
    [{ ...row, published_at: null }],
    [{ ...row, author_id: 'secret', body: null }],
    { posts: [] },
    Array.from({ length: 51 }, () => row)
  ]) {
    const store = createSupabaseReadStore({ url, publishableKey: key, fetchImpl: mockFetch(rows).fetchImpl });
    await assert.rejects(store.list({ locale: 'en' }), StoreUnavailable);
  }
  const failing = createSupabaseReadStore({
    url, publishableKey: key, fetchImpl: async () => { throw Error('network private details'); }
  });
  await assert.rejects(failing.list({ locale: 'en' }), StoreUnavailable);
});

test('read-only HTTP mode serves feed and rejects ALL publication attempts', async t => {
  const { calls, fetchImpl } = mockFetch();
  const server = createApp({
    storeMode: 'supabase-readonly',
    supabaseUrl: url,
    publishableKey: key,
    fetchImpl,
    apiKey: 'local-test-key-0123456789abcdef'
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const feed = await fetch(base + '/api/posts?locale=en&category=tools');
  assert.equal(feed.status, 200);
  const obj = await feed.json();
  assert.equal(obj.posts[0].title, row.title);
  const xml = await fetch(base + '/feeds/en.xml');
  assert.equal(xml.status, 200);
  assert.match(await xml.text(), /Read-only example article/);
  const attemptedWrite = await fetch(base + '/api/posts', {
    method: 'POST',
    headers: {
      authorization: 'Bearer local-test-key-0123456789abcdef',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ title: 'Attempt', body: 'Some body here' })
  });
  assert.equal(attemptedWrite.status, 503);
  assert.match((await attemptedWrite.json()).error, /disabled/);
  assert.ok(calls.every(call => call.options.method === 'GET'));
});


test('read-only adapter rejects oversized Content-Length without parsing and cancels stream', async () => {
  let cancelled = 0;
  const fetchImpl = async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array([91])); },
    cancel() { cancelled++; }
  }), { headers: { 'content-length': String(3 * 1024 * 1024) } });
  const store = createSupabaseReadStore({url, publishableKey:key, fetchImpl});
  await assert.rejects(store.list({locale:'en'}), error =>
    error instanceof StoreUnavailable && /size limit/.test(error.message));
  assert.equal(cancelled, 1, 'reject advertised oversize before reading payload');
});

test('read-only adapter stops malicious streaming JSON at the actual byte limit', async () => {
  let cancelled = 0, pulls = 0;
  const fetchImpl = async () => new Response(new ReadableStream({
    pull(controller) {
      pulls++;
      controller.enqueue(new Uint8Array(1024 * 1024));
    },
    cancel() { cancelled++; }
  }), { headers: { 'content-length':'1' } }); // deliberately false
  const store = createSupabaseReadStore({url, publishableKey:key, fetchImpl});
  await assert.rejects(store.get(id), error =>
    error instanceof StoreUnavailable && /size limit/.test(error.message));
  assert.equal(cancelled, 1);
  assert.ok(pulls <= 5, 'upstream cannot stream an unbounded JSON response');
});

test('read-only adapter bounds excessive tiny chunks even below byte limit', async () => {
  let cancelled = 0, pulls = 0;
  const fetchImpl = async () => new Response(new ReadableStream({
    pull(controller) {
      pulls++;
      controller.enqueue(Uint8Array.of(32));
    },
    cancel() { cancelled++; }
  }));
  const store = createSupabaseReadStore({url, publishableKey:key, fetchImpl});
  await assert.rejects(store.list({locale:'en'}), StoreUnavailable);
  assert.equal(cancelled, 1);
  assert.ok(pulls <= 515, 'small chunks must not create unlimited allocations');
});

test('read-only adapter rejects invalid UTF-8 rather than rewriting article text', async () => {
  const bytes = Uint8Array.of(91, 34, 255, 34, 93);
  const store = createSupabaseReadStore({
    url, publishableKey:key, fetchImpl:async () => new Response(bytes)
  });
  await assert.rejects(store.list({locale:'en'}), error =>
    error instanceof StoreUnavailable && /invalid JSON/.test(error.message));
});

test('read-only adapter preserves Thai and Chinese split across streamed UTF-8 chunks', async () => {
  const multilingual = {...row, title:'Read-only ภาษาไทย 中文', body:row.body+' ภาษาไทย 中文'};
  const bytes = new TextEncoder().encode(JSON.stringify([multilingual]));
  const at = bytes.findIndex(value => value >= 0xe0);
  assert.ok(at > 0, 'fixture contains multi-byte Unicode');
  const fetchImpl = async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, at + 1));
      controller.enqueue(bytes.slice(at + 1));
      controller.close();
    }
  }));
  const store = createSupabaseReadStore({url, publishableKey:key, fetchImpl});
  const [post] = await store.list({locale:'en'});
  assert.equal(post.title, multilingual.title);
  assert.equal(post.body, multilingual.body);
});

test('read-only HTTP endpoint fails closed on upstream byte overflow without exposing body', async t => {
  const secretText = 'this secret upstream value must never reach the API response';
  const fetchImpl = async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new TextEncoder().encode(secretText.repeat(20000))); }
  }));
  const server = createApp({storeMode:'supabase-readonly',
    supabaseUrl:url, publishableKey:key, fetchImpl});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const response = await fetch(base + '/api/posts?locale=en');
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.doesNotMatch(body, /this secret upstream value/);
  assert.match(body, /size limit/);
});
