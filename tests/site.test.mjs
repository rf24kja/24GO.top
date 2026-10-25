import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../site/index.html', import.meta.url)), 'utf8');
const workflow = readFileSync(fileURLToPath(new URL('../.github/workflows/pages.yml', import.meta.url)), 'utf8');

test('pre-launch landing includes truthful disclosure and contributor link', () => {
  assert.match(html, /OPEN SOURCE.*PRE-LAUNCH/s);
  assert.match(html, /github\.com\/rf24kja\/24gotop-starter/);
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
