import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const read = path => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const readme = read('../README.md');
const register = read('../docs/DEPLOYMENT_STATUS.md');
const landing = read('../site/index.html');

test('README explains staging login without suggesting a public account release', () => {
 assert.match(readme, /Why can I see a sign-in page on a staging Vercel address/);
 assert.match(readme, /24GO\.online/);
 assert.match(readme, /New signup is disabled/);
 assert.match(readme, /public author writes remain closed/);
 assert.match(readme, /docs\/DEPLOYMENT_STATUS\.md#staging-identity-versus-public-login--31-october-2026/);
 assert.match(readme, /NOT a launched publishing community/);
});

test('deployment register distinguishes the three release boundaries and real evidence', () => {
 for (const required of [
  '## Staging identity versus public login — 31 October 2026',
  'https://24go.top/',
  'staging.24go.top',
  '24gotop-staging-auth.vercel.app',
  'identityFlowsEnabled:false',
  'recoveryFlowsEnabled:true',
  'bb42098f2f43725de0823190eeaad2680bb38e2b',
  'Do **not**',
  'READY',
  'AAL2',
 ]) assert.ok(register.includes(required), 'missing status or safety gate: '+required);
 assert.match(register, /server-side signup is disabled/);
 assert.match(register, /not that a particular test user successfully authenticated/);
});

test('public landing still has no staging sign-in CTA', () => {
 assert.doesNotMatch(landing, /24gotop-staging-auth\.vercel\.app|staging\.24go\.top|href=["'][^"']*\/login["']/i);
 assert.match(landing, /Hosted public publishing is not live|Hosted public publishing is not live\.|Hosted public publishing is not live/);
});
