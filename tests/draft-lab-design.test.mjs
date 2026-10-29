import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const read=name=>readFileSync(fileURLToPath(new URL('../site/'+name,import.meta.url)),'utf8');
const html=read('draft-lab.html'),css=read('draft-lab.css'),js=read('draft-lab.js');

test('editor shares honest prototype navigation and keyboard skip with the redesigned landing',()=>{
 assert.match(html,/<a class="skip" href="#main-content">Skip to editor<\/a>/);
 assert.match(html,/<main class="shell" id="main-content" tabindex="-1">/);
 assert.match(html,/<nav aria-label="Main navigation">/);
 for(const href of ['./','./engineering/','./progress.html']){
  assert.ok(html.includes('href="'+href+'"'),href);
 }
 assert.match(html,/does not publish, upload or automatically save your writing/);
 assert.match(html,/No backend/);
 assert.match(html,/id="formStatus" role="status" aria-live="polite"/);
});
test('the quiet 48px architectural grid and light/dark theme never require tracking code',()=>{
 assert.match(css,/body::before\{[^}]+pointer-events:none/);
 assert.match(css,/background-size:48px 48px/);
 assert.match(css,/\.bar\{position:sticky;top:0/);
 assert.match(css,/\.skip:focus\{left:12px\}/);
 assert.match(css,/@media\(prefers-color-scheme:light\)/);
 assert.match(css, /color-scheme:light;--bg:#f4f8f6/);
 assert.match(css,/@media\(max-width:550px\)\{\.bar\{position:static\}/);
 assert.match(css,/@media\(prefers-contrast:more\)\{body::before\{display:none\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css, /--panel-copy:#244239/);
 assert.match(css, /--notice-bg:#e7f6ed/);
 assert.doesNotMatch(css,/@import|url\(https?:\/\//);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML/);
});
