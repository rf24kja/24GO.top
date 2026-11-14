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
test('the quiet 48px architectural grid and light/dark theme require no remote tracking',()=>{
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
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|sessionStorage|innerHTML/);
 assert.match(js,/field\('saveBrowserDraft'\)\.addEventListener\('click'/);
});

test('local drop target is labelled, translated and never a server upload',()=>{
 assert.match(html,/id="draftDropZone" class="draft-drop-zone" role="group" aria-labelledby="draftDropHint"/);
 assert.match(html,/id="draftDropHint" data-ui="dropHint"/);
 assert.match(js,/readDraftFileStrict\(file\)/);
 assert.match(js,/addEventListener\('drop'/);
 assert.match(js,/files\.length!==1/);
 assert.match(css,/\.draft-drop-zone\[data-dragging="true"\]/);
 assert.match(css,/@media\(prefers-contrast:more\)\{\.draft-drop-zone/);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|sessionStorage|innerHTML/);
});

test('keyboard and narrow-screen editors can navigate to preview and back without JS state changes',()=>{
 assert.match(html,/<a class="draft-jump-link" href="#preview-title" data-ui="jumpPreview">/);
 assert.match(html,/<h2 id="preview-title" tabindex="-1" data-ui="reader">/);
 assert.match(html,/<a class="draft-jump-link" href="#postBody" data-ui="jumpEditor">/);
 assert.match(html,/<textarea id="postBody" name="body"/);
 assert.match(css,/\.draft-jump-link\{[^}]*min-height:44px/);
 assert.match(css,/\.draft-jump-link:focus-visible\{outline:3px solid var\(--accent\)/);
 assert.match(css,/@media\(max-width:550px\)\{\.draft-jump-row/);
 assert.match(css,/#preview-title\{scroll-margin-top:116px\}/);
 assert.doesNotMatch(js,/location\.hash|history\.pushState|scrollIntoView/);
});
test('download shortcut does not interrupt multilingual IME composition or mixed modifiers',()=>{
 assert.match(js,/event\.isComposing\|\|event\.repeat/);
 assert.match(js,/Boolean\(event\.ctrlKey\)===Boolean\(event\.metaKey\)/);
 assert.match(html,/aria-keyshortcuts="Control\+S Meta\+S"/);
});

test('vault backup restoration invalidates stale async reads without data loss',()=>{
 assert.match(js,/const restoreGate=createDraftImportGate\(\)/);
 assert.match(js,/const ticket=restoreGate\.begin\(\)/);
 assert.match(js,/if\(!restoreGate\.canApply\(ticket\)\)return;\n  if\(!window\.confirm\(ui\('backupRestoreConfirm'\)\)\)return;/);
 assert.match(js,/if\(!restoreGate\.canApply\(ticket\)\)return;\n  const restored=getDraftVault\(\)\.restoreBackup\(text\)/);
 assert.match(js,/restoreGate\.changed\(\);\n  refreshBrowserDrafts\(\)/);
 assert.match(js,/if\(restoreGate\.isLatest\(ticket\)\)input\.value='';/);
 assert.match(js,/window\.addEventListener\('storage',event=>\{[^}]*restoreGate\.changed\(\)/);
 assert.match(js,/field\('saveBrowserDraft'\)\.addEventListener\('click',\(\)=>\{\n restoreGate\.changed\(\)/);
 assert.match(js,/field\('deleteBrowserDraft'\)\.addEventListener\('click',\(\)=>\{\n restoreGate\.changed\(\)/);
});


test('responsive Markdown image previews are consent-gated and fit narrow mobile panels',()=>{
 const preview=read('draft-lab-preview.js');
 assert.match(preview,/export function safePreviewImageUrl\(raw\)/);
 assert.match(preview,/image\.hidden=true/);
 assert.match(preview,/button\.addEventListener\('click'/);
 assert.match(preview,/image\.setAttribute\('src',safe\)/);
 assert.match(preview,/image\.setAttribute\('crossorigin','anonymous'\)/);
 assert.match(preview,/image\.setAttribute\('referrerpolicy','no-referrer'\)/);
 assert.match(css,/\.preview-image-gate>button\{[^}]*min-height:44px/);
 assert.match(css,/\.preview-image-gate>img\{[^}]*max-width:100%/);
 assert.match(css,/\.preview-image-gate>img\[hidden\],\.preview-image-gate>button\[hidden\]\{display:none\}/);
 assert.match(html,/class="hint preview-image-privacy" data-ui="previewImagePrivacy"/);
 const browser=readFileSync(new URL('../scripts/check-draft-lab-accessibility.mjs',import.meta.url),'utf8');
 assert.match(browser,/function exerciseDraftImageGate\(\)/);
 assert.match(browser,/await c\.call\(exerciseDraftImageGate,sessionId\)/);
 for(const marker of ['compact-280','phone-390','landscape-844','tablet-768','desktop-1440']){
  assert.ok(browser.includes(marker),marker);
 }
 assert.doesNotMatch(preview,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|innerHTML/);
});


test('image insertion controls are keyboard accessible, offline and fit every viewport',()=>{
 assert.match(html,/<section class="draft-image-insert" aria-labelledby="imageInsertHeading">/);
 assert.match(html,/<input id="imageUrl" type="url" maxlength="1500"/);
 assert.match(html,/<input id="imageAlt" type="text" maxlength="160"/);
 assert.match(html,/<button id="insertImage" type="button" data-ui="imageInsertButton">/);
 assert.match(js,/field\('insertImage'\)\.addEventListener\('click'/);
 assert.match(js,/formatDraftImageSelection\(body\.value,/);
 assert.match(js,/body\.setRangeText\(edit\.replacement/);
 assert.match(js,/editorChanged\(\)/);
 assert.match(css,/\.draft-image-insert__footer button\{[^}]*min-height:44px/);
 assert.match(css,/@media\(max-width:620px\)\{\s*\.draft-image-insert/);
 const browser=readFileSync(new URL('../scripts/check-draft-lab-accessibility.mjs',import.meta.url),'utf8');
 assert.match(browser,/function exerciseDraftImageInsertion\(\)/);
 assert.match(browser,/await c\.call\(exerciseDraftImageInsertion,sessionId\)/);
 assert.match(browser,/insertion\.invalidSafe/);
 assert.match(browser,/insertion\.noSrc/);
 assert.match(browser,/insertion\.selectedAltUsed/);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|sessionStorage|innerHTML/);
});


test('image link helper fields cannot outlive a confirmed draft switch',()=>{
 for(const content of [
  "source.value = reopened.source;\n    clearImageInsertInputs();",
  "source.value=saved.draft.source;\n  clearImageInsertInputs();",
  "source.value = '';\n  clearImageInsertInputs();"
 ])assert.ok(js.includes(content),'missing image input reset after document change');
 assert.match(js,/function clearImageInsertInputs\(\)\{\s*field\('imageUrl'\)\.value='';\s*field\('imageAlt'\)\.value='';/);
 const browser=readFileSync(new URL('../scripts/check-draft-lab-accessibility.mjs',import.meta.url),'utf8');
 assert.match(browser,/!insertion\.reset/);
});


test('external Markdown insert is an opt-in local-only action separate from restoring 24GOTOP export',()=>{
 assert.match(html,/id="insertExternalMarkdown" class="secondary" type="button" data-ui="externalMdButton"/);
 assert.match(html,/id="externalMarkdownFile" type="file" accept="\.md,text\/markdown" hidden/);
 assert.match(html,/id="externalMarkdownHint" data-ui="externalMdHint"/);
 assert.match(js,/async function insertExternalMarkdown\(file,input=null\)/);
 assert.match(js,/readExternalMarkdownStrict\(file\)/);
 assert.match(js,/formatExternalMarkdownInsertion\(body\.value,start,end,markdown\)/);
 assert.match(js,/body\.setRangeText\(edit\.replacement,edit\.start,edit\.end,'end'\)/);
 assert.match(js,/importGate\.canApply\(ticket\)/);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|sessionStorage|innerHTML/);
 const browser=readFileSync(new URL('../scripts/check-draft-lab-accessibility.mjs',import.meta.url),'utf8');
 assert.match(browser,/async function exerciseExternalMarkdownImport\(\)/);
 assert.match(browser,/await c\.call\(exerciseExternalMarkdownImport,sessionId\)/);
});


test('confirmed Draft Lab file opens recheck latest consent and preserve newer editor state',()=>{
 const segment=js.slice(js.indexOf('async function openLocalDraft('),
  js.indexOf("field('importDraftFile').addEventListener"));
 assert.match(segment,/const confirmed=window\.confirm\(ui\('replaceConfirm'\)\)/);
 assert.match(segment,/if\(!importGate\.isLatest\(ticket\)\)return;/);
 assert.match(segment,/if\(!importGate\.canApply\(ticket\)\)return;/);
 assert.ok(segment.indexOf('if(!importGate.canApply(ticket))return;')<
  segment.indexOf('title.value = reopened.title;'));
 assert.match(segment,/if\(!confirmed\)/);
});


test('browser print/PDF layout includes only local article preview, never private editor controls',()=>{
 assert.match(html,/id="printDraft" type="button" class="secondary" data-ui="printButton"/);
 assert.match(html,/id="printHelp" data-ui="printHelp"/);
 assert.match(html,/class="preview-print-controls" role="group"/);
 assert.match(js,/field\('printDraft'\)\.addEventListener\('click'/);
 assert.match(js,/typeof window\.print!=='function'/);
 assert.match(js,/window\.print\(\)/);
 assert.match(js,/if\(!title\.value\.trim\(\)\|\|!body\.value\.trim\(\)\)/);
 assert.match(css,/\.preview-print-controls button\{min-height:44px/);
 assert.match(css,/@media print\{/);
 for(const selector of [
  '.workspace>.panel:not(.preview)', '.preview .draft-guidance',
  '.preview .revision-review', '.preview .article-outline',
  '.preview .preview-print-controls', '.preview .preview-image-privacy',
  '.preview .preview-foot'
 ])assert.ok(css.includes(selector),'private or helper content not excluded: '+selector);
 assert.match(css,/\.preview-image-gate>button\{display:none!important\}/);
 assert.match(css,/\.preview-image-gate>img\[hidden\]\{display:none!important\}/);
 assert.match(css,/#previewSource:not\(\[hidden\]\)/);
 const browser=readFileSync(new URL('../scripts/check-draft-lab-accessibility.mjs',import.meta.url),'utf8');
 assert.match(browser,/function exerciseDraftPrintAction\(\)/);
 assert.match(browser,/function exerciseDraftPrintMedia\(\)/);
 assert.match(browser,/await c\.call\(exerciseDraftPrintMedia,sessionId\)/);
 assert.match(browser,/Emulation\.setEmulatedMedia/);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|sessionStorage|innerHTML/);
});
