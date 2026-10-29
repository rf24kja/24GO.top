import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../site/index.html', import.meta.url)), 'utf8');
const landingCss = readFileSync(fileURLToPath(new URL('../site/landing.css', import.meta.url)), 'utf8');
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
  assert.match(draftHtml, /does not publish, upload or automatically save your writing/);
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


test('Draft Lab provides private Markdown export and loss-prevention controls',()=>{
  const logic=readFileSync(fileURLToPath(new URL('../site/draft-lab-logic.js',import.meta.url)),'utf8');
  assert.match(draftHtml,/id="downloadDraft"/);
  assert.match(draftHtml,/Download \.md/);
  assert.match(draftJs,/new Blob\(\[formatDraft\(draft\)\]/);
  assert.match(draftJs,/URL\.createObjectURL/);
  assert.match(draftJs,/URL\.revokeObjectURL/);
  assert.match(draftJs,/anchor\.download = draftFilename\(draft\)/);
  assert.match(draftJs,/window\.confirm\(/);
  assert.match(logic,/export function draftFilename/);
  assert.doesNotMatch(draftJs,/\bfetch\s*\(|localStorage|sessionStorage|XMLHttpRequest|sendBeacon|innerHTML/);
  assert.doesNotMatch(draftHtml,/PUBLISH_API_KEY|sb_secret_/);
});


test('public landing exposes meaningful 320px navigation and visible keyboard focus',()=>{
  assert.match(html, /<a class="skip" href="#main-content">Skip to main content<\/a>/);
  assert.match(html, /<main id="main-content" tabindex="-1">/);
  assert.match(html, /<nav aria-label="Main navigation">/);
  for(const target of ['./draft-lab.html','./engineering/','./progress.html','https://github.com/rf24kja/24GO.top']){
    assert.ok(html.includes('href="'+target+'"'),'Missing visible navigation: '+target);
  }
  assert.match(landingCss, /:focus-visible\{outline:3px solid #68ebb0/);
  assert.match(landingCss, /\.site-header nav\{order:3;width:100%/);
  assert.match(landingCss, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(html, /nav a\{display:none\}|display:none[^}]*nav/i);
});


test('saved Markdown can be reopened through an explicit browser-only action',()=>{
  const logic=readFileSync(fileURLToPath(new URL('../site/draft-lab-logic.js',import.meta.url)),'utf8');
  assert.match(draftHtml, /id="importDraft"[^>]*type="button"/);
  assert.match(draftHtml, /id="importDraftFile"[^>]*type="file"[^>]*accept="\.md,text\/markdown"/);
  assert.match(draftHtml, /Opening or refreshing|Closing or refreshing/);
  assert.match(draftJs, /parseDraftFile\(await file\.text\(\)\)/);
  assert.match(draftJs, /file\.size > MAX_DRAFT_FILE_BYTES/);
  assert.match(draftJs, /window\.confirm\('Opening this file replaces your current unsaved draft/);
  assert.match(draftJs, /input\.value = ''/);
  assert.match(logic, /export function parseDraftFile/);
  assert.doesNotMatch(draftJs, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML/);
  assert.doesNotMatch(draftHtml,/PUBLISH_API_KEY|sb_secret_/);
});


test('public landing exposes roadmap and contributor onboarding directly for first-time visitors',()=>{
  assert.match(html,/href="https:\/\/github\.com\/rf24kja\/24GO\.top\/blob\/main\/docs\/ROADMAP\.md">Roadmap/);
  assert.match(html,/href="https:\/\/github\.com\/rf24kja\/24GO\.top\/blob\/main\/docs\/CONTRIBUTOR_START\.md">Contributor onboarding/);
  assert.match(html,/OPEN SOURCE.*PRE-LAUNCH/s);
  assert.doesNotMatch(html,/sb_secret_|PUBLISH_API_KEY/);
});
