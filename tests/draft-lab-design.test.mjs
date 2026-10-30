import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const read=name=>readFileSync(fileURLToPath(new URL('../site/'+name,import.meta.url)),'utf8');
const html=read('draft-lab.html'),css=read('draft-lab.css'),js=read('draft-lab.js');

test('editor shares honest prototype navigation and keyboard skip with the redesigned landing',()=>{
 assert.match(html,/<a class="skip" href="#main-content" data-ui="skip">Skip to editor<\/a>/);
 assert.match(html,/<main class="shell" id="main-content" tabindex="-1">/);
 assert.match(html,/<nav class="wrap interior-nav" aria-label="Main navigation">/);
 for(const href of ['./','./engineering/','./progress.html']){
  assert.ok(html.includes('href="'+href+'"'),href);
 }
 assert.match(html,/does not publish, upload or automatically save your writing/);
 assert.match(html,/No backend/);
 assert.match(html,/id="formStatus" role="status" aria-live="polite"/);
});
test('the quiet 48px architectural grid and light/dark theme never require tracking code',()=>{
 const shared=read("interior.css");
 assert.match(shared,/body::before\{[^}]+pointer-events:none/);
 assert.match(shared,/background-size:48px 48px/);
 assert.match(shared,/header\.interior-header\{position:sticky;top:0/);
 assert.match(shared,/\.skip:focus\{left:12px\}/);
 assert.match(css,/@media\(prefers-color-scheme:light\)/);
 assert.match(css, /color-scheme:light;--bg:#f4f8f6/);
 assert.match(shared,/@media\(max-width:760px\)/);
 assert.match(shared,/@media\(prefers-contrast:more\)\{body::before\{display:none\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css, /--panel-copy:#244239/);
 assert.match(css, /--notice-bg:#e7f6ed/);
 assert.doesNotMatch(css+"\n"+shared,/@import|url\(https?:\/\//);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML/);
});

test('local drop target is labelled, translated and never a server upload',()=>{
 assert.match(html,/id="draftDropZone" class="draft-drop-zone" role="group" aria-labelledby="draftDropHint"/);
 assert.match(html,/id="draftDropHint" data-ui="dropHint"/);
 assert.match(js,/readDraftFileStrict\(file\)/);
 assert.match(js,/addEventListener\('drop'/);
 assert.match(js,/files\.length!==1/);
 assert.match(css,/\.draft-drop-zone\[data-dragging="true"\]/);
 assert.match(css,/@media\(prefers-contrast:more\)\{\.draft-drop-zone/);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML/);
});
