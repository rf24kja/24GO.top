import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const names = ['ci.yml','database.yml','pages.yml','seo-live.yml'];
const workflows = Object.fromEntries(names.map(name => [
  name,
  readFileSync(fileURLToPath(new URL('../.github/workflows/' + name,import.meta.url)), 'utf8')
]));

test('all workflows check out using modern action without persisting git credentials', () => {
  for (const [name,content] of Object.entries(workflows)) {
    assert.match(content,/actions\/checkout@v7/,name);
    assert.match(content,/persist-credentials: false/,name);
    assert.doesNotMatch(content,/actions\/checkout@v4/,name);
  }
});

test('Node tests use maintained setup action without npm caching unneeded secrets', () => {
  const ci=workflows['ci.yml'];
  assert.match(ci,/actions\/setup-node@v7/);
  assert.match(ci,/node-version: '22'/);
  assert.match(ci,/package-manager-cache: false/);
  assert.match(ci,/permissions:\s*\n\s+contents: read/);
});

test('database tests retain isolated PostgreSQL service and least-privilege permissions', () => {
  const db=workflows['database.yml'];
  assert.match(db,/postgres:16-alpine/);
  assert.match(db,/supabase\/tests\/rls\.sql/);
  assert.match(db,/permissions:\s*\n\s+contents: read/);
  assert.doesNotMatch(db,/service_role.*(?:secret|key)/i);
});

test('GitHub Pages deployment still uploads static site only', () => {
  const pages=workflows['pages.yml'];
  assert.match(pages,/actions\/upload-pages-artifact@v4/);
  assert.match(pages,/path: site\//);
  assert.match(pages,/pages: write/);
  assert.match(pages,/id-token: write/);
  assert.doesNotMatch(pages,/npm run (?:dev|start)/);
});

test('read-only live SEO audit starts after successful Pages deployment, not in parallel',()=>{
  const seo=workflows['seo-live.yml'];
  assert.match(seo,/workflow_run:\s*\n\s+workflows: \["Deploy pre-launch landing"\]\s*\n\s+types: \[completed\]/);
  assert.match(seo,/if: github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(seo,/permissions:\s*\n\s+contents: read/);
  assert.match(seo,/run: bash scripts\/check-live-seo\.sh/);
  assert.doesNotMatch(seo,/pages: write|id-token: write|\$\{\{\s*secrets\./);
});

test('Pages embeds immutable checkout commit and run without including backend or secrets',()=>{
 const pages=workflows['pages.yml'];
 assert.match(pages,/PAGES_COMMIT: \$\{\{ github\.sha \}\}/);
 assert.match(pages,/PAGES_RUN_ID: \$\{\{ github\.run_id \}\}/);
 assert.match(pages,/site\/release\.json/);
 assert.match(pages,/printf '[^']*"commit"[^']*"pages_run_id"/);
 assert.ok(pages.indexOf('Embed exact commit')<pages.indexOf('Upload ONLY the static site'));
 assert.doesNotMatch(pages,/site\/src\/|site\/packages\/|secrets\./);
});

test('read-only external audit binds exactly to completed Pages SHA and run ID',()=>{
 const seo=workflows['seo-live.yml'];
 const script=readFileSync(fileURLToPath(
   new URL('../scripts/check-live-seo.sh',import.meta.url)),'utf8');
 assert.match(seo,/EXPECTED_PAGES_SHA:.*github\.event\.workflow_run\.head_sha/);
 assert.match(seo,/EXPECTED_PAGES_RUN_ID:.*github\.event\.workflow_run\.id/);
 assert.match(script,/probe '\/release\.json' release/);
 assert.match(script,/grep -Fxq -- "\$expected_receipt"/);
 assert.match(script,/release\.json\?audit=\$EXPECTED_PAGES_RUN_ID/);
 assert.match(script,/PASS exact public Pages release/);
 assert.doesNotMatch(script,/curl[^\n]* -k(?:\s|$)/);
});
