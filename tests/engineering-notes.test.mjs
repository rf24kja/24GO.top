import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../site/', import.meta.url));
const read = relative => readFileSync(join(root, relative), 'utf8');
const home = read('index.html');
const index = read('engineering/index.html');
const article = read('engineering/why-draft-lab-first.html');
const previewNote = read('engineering/markdown-preview-safety.html');
const lifecycleNote = read('engineering/submit-is-not-publish.html');
const feed = read('engineering/feed.xml');
const progress = read('progress.html');

test('home and development timeline link to verifiable engineering notes', () => {
  assert.match(home, /href="\.\/engineering\/why-draft-lab-first\.html"/);
  assert.match(home, /href="\.\/engineering\/feed\.xml"/);
  assert.match(progress, /href="\.\/engineering\/why-draft-lab-first\.html"/);
  assert.match(index, /href="\.\/why-draft-lab-first\.html"/);
  assert.match(article, /href="\.\/feed\.xml"/);
});

test('all relative navigation links in engineering collection resolve to packaged static artifacts', () => {
  for (const path of ['engineering/index.html','engineering/why-draft-lab-first.html','engineering/markdown-preview-safety.html','engineering/submit-is-not-publish.html']) {
    const url = new URL('../site/' + path, import.meta.url);
    const html = read(path);
    for (const [, value] of html.matchAll(/\bhref="([^"]+)"/g)) {
      if (/^(https?:|mailto:|#)/i.test(value)) continue;
      const target = new URL(value, url);
      let targetPath = fileURLToPath(target);
      if (targetPath.endsWith('/')) targetPath += 'index.html';
      assert.ok(existsSync(targetPath), path + ' has broken relative link: ' + value);
    }
  }
});

test('editorial content is truthful, code-backed and does not claim production publishing', () => {
  assert.match(article, /<h1>Why we built a Draft Lab before opening public writes<\/h1>/);
  assert.match(article, /early developer prototype/i);
  assert.match(article, /does not sign users in, upload drafts, publish articles/i);
  for (const pr of [5,13,16,28,30]) {
    assert.ok(article.includes('https://github.com/rf24kja/24GO.top/pull/' + pr),'Missing verifiable PR #'+pr);
  }
  assert.match(article, /npm run demo:read/);
  assert.match(article, /<meta name="description"/);
  assert.doesNotMatch(article, /<script\b|PUBLISH_API_KEY|sb_secret_|<iframe\b/i);
  assert.doesNotMatch(article, /24gotop-starter/);
});

test('static RSS lists actual article with explicit source URL and valid publication metadata', () => {
  assert.match(feed, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(feed, /<rss version="2\.0">/);
  assert.match(feed, /<title>24GOTOP Engineering Notes<\/title>/);
  assert.match(feed, /https:\/\/www\.24go\.top\/engineering\/why-draft-lab-first\.html/);
  assert.match(feed, /<pubDate>Mon, 26 Oct 2026 00:00:00 GMT<\/pubDate>/);
  assert.equal((feed.match(/<item>/g) || []).length, 3);
  assert.match(feed, /https:\/\/www\.24go\.top\/engineering\/markdown-preview-safety\.html/);
  assert.match(index, /Preview Markdown without executing author HTML/);
  assert.match(index, /Why we built a Draft Lab before opening public writes/);
  assert.doesNotMatch(feed, /<script|&(?!(?:amp|lt|gt|quot|apos);)/i);
});


test('new safety article is tied to merged source and avoids production claims', () => {
  assert.match(previewNote, /<h1>Preview Markdown without executing author HTML<\/h1>/);
  assert.match(previewNote, /https:\/\/github\.com\/rf24kja\/24GO\.top\/pull\/40/);
  assert.match(previewNote, /textContent/);
  assert.match(previewNote, /browser-only experiment/);
  assert.match(previewNote, /screen-reader/);
  assert.doesNotMatch(previewNote, /<script\b|<iframe\b|PUBLISH_API_KEY|sb_secret_|service_role/i);
});

test('review lifecycle note is indexed, readable and accurately describes prelaunch gates', () => {
  assert.match(index, /href="\.\/submit-is-not-publish\.html"/);
  assert.match(feed, /https:\/\/www\.24go\.top\/engineering\/submit-is-not-publish\.html/);
  assert.match(feed, /<pubDate>Mon, 26 Oct 2026 12:00:00 GMT<\/pubDate>/);
  assert.match(lifecycleNote, /<h1>Submit for review is not publish<\/h1>/);
  assert.match(lifecycleNote, /not a live community publishing service/i);
  assert.match(lifecycleNote, /immutable submission/i);
  assert.match(lifecycleNote, /idempotent intake/i);
  assert.match(lifecycleNote, /moderator/i);
  assert.match(lifecycleNote, /https:\/\/github\.com\/rf24kja\/24GO\.top\/issues\/38/);
  assert.match(lifecycleNote, /https:\/\/github\.com\/rf24kja\/24GO\.top\/issues\/29/);
  assert.match(lifecycleNote, /<link rel="canonical" href="https:\/\/www\.24go\.top\/engineering\/submit-is-not-publish\.html"/);
  assert.doesNotMatch(lifecycleNote, /<script\b|<iframe\b|PUBLISH_API_KEY|sb_secret_|service_role/i);
  // No private full SQL or synthetic user credential in the published article.
  assert.doesNotMatch(lifecycleNote, /CREATE ROLE|CREATE POLICY|INSERT INTO app_private|password123/i);
});

test('owner confirmation stays separate from independent DNS, TLS and public API assertions', () => {
  const d = readFileSync(fileURLToPath(new URL('../docs/DEPLOYMENT_STATUS.md',import.meta.url)), 'utf8');
  assert.match(d, /Founder reports that the HTTPS page opens successfully/);
  assert.match(d, /https:\/\/www\.24go\.top\//);
  assert.match(d, /Apex.*Not independently confirmed|Not independently confirmed.*Apex/is);
  assert.match(d, /Public publishing.*Not implemented/is);
});
