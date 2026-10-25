import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const get = path => readFileSync(fileURLToPath(new URL('../' + path, import.meta.url)), 'utf8');

test('ownership documentation identifies the founder and links current rights', () => {
  const readme = get('README.md');
  const governance = get('GOVERNANCE.md');
  const brand = get('BRAND_POLICY.md');
  assert.match(readme, /Founder and official project lead: \[@rf24kja\]/);
  assert.match(readme, /\[MIT license\]\(LICENSE\)/);
  assert.match(governance, /MIT.*license/);
  assert.match(governance, /does not override that license/i);
  assert.match(brand, /not.*rescinds? or contradicts?|does not rescind or contradict/);
});

test('rights review does not silently relicense the original source', () => {
  const license = get('LICENSE');
  const strategy = get('docs/IP_AND_LICENSING.md');
  assert.match(license, /^MIT License/);
  assert.match(license, /Permission is hereby granted, free of charge/);
  assert.match(strategy, /Changing the license later does \*\*not automatically undo rights/);
  assert.match(strategy, /The founder has \*\*not yet approved\*\* changing the root MIT license/);
  assert.match(strategy, /private product core/);
});
