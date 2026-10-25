import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../site/index.html', import.meta.url)), 'utf8');
const workflow = readFileSync(fileURLToPath(new URL('../.github/workflows/pages.yml', import.meta.url)), 'utf8');

test('pre-launch landing includes truthful disclosure and contributor link', () => {
  assert.match(html, /OPEN SOURCE.*PRE-LAUNCH/s);
  assert.match(html, /github\.com\/rf24kja\/24GO\.top/);
  assert.match(html, /we are building|our first prototype/i);
  assert.doesNotMatch(html, /PUBLISH_API_KEY|\bBearer\s+[A-Za-z0-9_-]+/);
});

test('Pages workflow uploads only static site and uses scoped privileges', () => {
  assert.match(workflow, /path:\s*site\//);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.doesNotMatch(workflow, /\b(sed|cat)\s+\.env\b/);
});

const progress = readFileSync(fileURLToPath(new URL('../site/progress.html', import.meta.url)), 'utf8');

test('public journey page references actual merged PRs and discloses prototype limits', () => {
  assert.match(html, /href="\.\/progress\.html"/);
  for (const pr of [5, 6, 10, 12, 13, 16, 17]) {
    assert.ok(progress.includes('https://github.com/rf24kja/24GO.top/pull/' + pr));
  }
  assert.match(progress, /development prototype|Early-stage prototype/i);
  assert.match(progress, /not launched/i);
  assert.doesNotMatch(progress, /PUBLISH_API_KEY|sb_secret_|service_role/);
});

test('public landing promotes a working no-key developer demo and does not invent launch', () => {
  assert.match(html, /npm run demo:read/);
  assert.match(html, /docs\/SDK_QUICKSTART\.md/);
  assert.match(html, /No cloud account|no cloud account/i);
  assert.match(html, /Hosted public publishing is not live/);
  assert.match(html, /https:\/\/24go\.top\//);
  assert.doesNotMatch(html, /sb_secret_|PUBLISH_API_KEY|npm install -g.*token/i);
});

const draftHtml = readFileSync(fileURLToPath(new URL('../site/draft-lab.html', import.meta.url)), 'utf8');
const draftJs = readFileSync(fileURLToPath(new URL('../site/draft-lab.js', import.meta.url)), 'utf8');
const draftCss = readFileSync(fileURLToPath(new URL('../site/draft-lab.css', import.meta.url)), 'utf8');

test('draft lab is discoverable, labeled experimental, and provides accessible form controls', () => {
  assert.match(html, /href="\.\/draft-lab\.html"/);
  for (const id of ['postTitle','postBody','postLocale','postCategory','postSource']) {
    assert.ok(draftHtml.includes('for="' + id + '"'), 'missing accessible label: ' + id);
    assert.ok(draftHtml.includes('id="' + id + '"'), 'missing input: ' + id);
  }
  assert.match(draftHtml, /does not publish, upload, save or send content/);
  assert.match(draftHtml, /No backend/);
  assert.match(draftHtml, /role="status"/);
  assert.match(draftCss, /@media\(max-width:860px\)/);
});

test('draft lab never submits, stores, or executes user-created HTML', () => {
  assert.doesNotMatch(draftJs, /\bfetch\s*\(|localStorage|sessionStorage|XMLHttpRequest|sendBeacon|innerHTML/);
  assert.match(draftJs, /\.textContent/);
  assert.match(draftJs, /navigator\.clipboard\?\.writeText/);
  assert.match(draftJs, /preventDefault\(\)/);
  assert.doesNotMatch(draftHtml, /<form[^>]+action=/);
  assert.doesNotMatch(draftHtml, /PUBLISH_API_KEY|sb_secret_/);
});
