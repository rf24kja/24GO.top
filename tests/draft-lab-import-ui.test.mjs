import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import {
  safeSourceUrl, validateDraft, formatDraft, draftFilename, hasDraftContent,
  parseDraftFile, MAX_DRAFT_FILE_BYTES, hasUnexportedChanges, formatDraftSelection
} from '../site/draft-lab-logic.js';

const source = readFileSync(fileURLToPath(new URL('../site/draft-lab.js', import.meta.url)), 'utf8')
  .replace(/^import .* from '.\/draft-lab-logic\.js';\n/m, '')
  .replace(/^import .* from '.\/draft-lab-preview\.js';\n/m, '');

const sample = {
  title:'Return and improve the documentation', locale:'ru', category:'tools',
  body:'The first paragraph explains a real technical problem.\n\nThe next paragraph contains the fix.',
  source:'https://example.org/guide'
};

function build() {
  const ids = [
    'postTitle','postBody','postLocale','postCategory','postSource','formStatus',
    'previewHeading','previewBody','previewLocale','previewCategory','bodyCount',
    'previewSource','draftSafety','downloadDraft','copyDraft','clearDraft','importDraft','importDraftFile','draftForm',
    'formatHeading','formatList','formatQuote','formatCode'
  ];
  const elements = Object.fromEntries(ids.map(id => {
    const el = {
      id, value:'', textContent:'', hidden:false, dataset:{}, listeners:{}, files:[],
      selectionStart:0,selectionEnd:0,
      setRangeText(replacement,start,end){this.value=this.value.slice(0,start)+replacement+this.value.slice(end);},
      setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;},
      addEventListener(type,callback){this.listeners[type]=callback;},
      click(){this.clicked=true;},
      focus(){}
    };
    return [id,el];
  }));
  elements.postLocale.value='en';
  elements.postCategory.value='guides';
  let confirm = true;
  const window = {listeners:{}, confirm(){return confirm;}, addEventListener(type, callback){this.listeners[type]=callback;}};
  const document = {getElementById(id){return elements[id];}};
  runInNewContext(source, {
    document, window, navigator:{}, URL, Blob, setTimeout,
    safeSourceUrl,validateDraft,formatDraft,draftFilename,hasDraftContent,
    parseDraftFile,MAX_DRAFT_FILE_BYTES,hasUnexportedChanges,formatDraftSelection,
    renderMarkdownPreview(container, text) { container.textContent = text; }
  // Keep a bounded sandbox timeout, with enough CI runner headroom when
  // node --test starts multiple test files concurrently.
  },{timeout:5000});
  return {
    elements,
    setConfirm(value){confirm=value;},
    beforeUnload() {
      const event = {prevented:false, returnValue:undefined, preventDefault(){this.prevented=true;}};
      window.listeners.beforeunload(event);
      return event;
    },
    async import(content, filename='24gotop-saved.md', size=Buffer.byteLength(content,'utf8')) {
      const input=elements.importDraftFile;
      input.files=[{name:filename,size,async text(){return content;}}];
      await input.listeners.change({currentTarget:input});
    }
  };
}

test('import action opens the file picker and restores every field',async()=>{
  const app=build();
  app.elements.importDraft.listeners.click();
  assert.equal(app.elements.importDraftFile.clicked,true);
  await app.import(formatDraft(sample));
  assert.equal(app.elements.postTitle.value,sample.title);
  assert.equal(app.elements.postBody.value,sample.body);
  assert.equal(app.elements.postLocale.value,sample.locale);
  assert.equal(app.elements.postCategory.value,sample.category);
  assert.equal(app.elements.postSource.value,sample.source);
  assert.equal(app.elements.previewHeading.textContent,sample.title);
  assert.match(app.elements.formStatus.textContent,/Nothing was uploaded/);
  assert.equal(app.elements.importDraftFile.value,'');
});

test('declining overwrite keeps existing article and does not clear editor',async()=>{
  const app=build();
  app.elements.postTitle.value='A draft not yet saved';
  app.elements.postBody.value='This long unsaved draft belongs to the current author.';
  app.setConfirm(false);
  await app.import(formatDraft(sample));
  assert.equal(app.elements.postTitle.value,'A draft not yet saved');
  assert.equal(app.elements.postBody.value,'This long unsaved draft belongs to the current author.');
  assert.match(app.elements.formStatus.textContent,/Import cancelled/);
});

test('malformed and oversized inputs are refused before overwriting',async()=>{
  const app=build();
  app.elements.postTitle.value='Keep this article';
  await app.import('# not our original export');
  assert.equal(app.elements.postTitle.value,'Keep this article');
  assert.equal(app.elements.formStatus.dataset.error,'true');
  await app.import(formatDraft(sample),'24gotop-saved.md',MAX_DRAFT_FILE_BYTES+1);
  assert.equal(app.elements.postTitle.value,'Keep this article');
  assert.match(app.elements.formStatus.textContent,/64 KB maximum/);
});

test('beforeunload warns for new or changed writing, not for unchanged reopened files', async () => {
  const app = build();
  assert.equal(app.beforeUnload().prevented,false);
  app.elements.postTitle.value = 'A new unsaved draft';
  app.elements.postBody.value = 'Long enough original technical writing from the user.';
  app.elements.postBody.listeners.input();
  assert.match(app.elements.draftSafety.textContent,/Check your exported/);
  let leaving = app.beforeUnload();
  assert.equal(leaving.prevented,true);
  assert.equal(leaving.returnValue,'');
  assert.match(app.elements.draftSafety.textContent,/Check your exported/);
  app.elements.postTitle.value = '';
  app.elements.postBody.value = '';
  assert.equal(app.beforeUnload().prevented,false);
  await app.import(formatDraft(sample));
  assert.equal(app.beforeUnload().prevented,false, 'local file already exists');
  assert.match(app.elements.draftSafety.textContent,/Reopened file is unchanged/);
  app.elements.postBody.value += '\nNew edits not in that file';
  app.elements.postBody.listeners.input();
  assert.match(app.elements.draftSafety.textContent,/Check your exported/);
  leaving = app.beforeUnload();
  assert.equal(leaving.prevented,true);
});

test('cancelled import and failed import never clear new-draft exit protection', async () => {
  const app = build();
  app.elements.postTitle.value = 'Keep an unsaved draft';
  app.elements.postBody.value = 'This working draft should remain protected on navigation.';
  app.setConfirm(false);
  await app.import(formatDraft(sample));
  assert.equal(app.beforeUnload().prevented,true);
  await app.import('Unrecognized Markdown file');
  assert.equal(app.beforeUnload().prevented,true);
});

test('an explicit Clear reset turns off the warning after user confirmation', () => {
  const app = build();
  app.elements.postTitle.value = 'A new unsaved draft';
  app.elements.postBody.value = 'A reproducible article with meaningful unsaved content.';
  app.setConfirm(true);
  app.elements.clearDraft.listeners.click();
  assert.equal(app.beforeUnload().prevented,false);
  assert.match(app.elements.draftSafety.textContent,/No draft content yet/);
});

test('format buttons edit locally, preview, and keep unsaved-exit protection',()=>{
 const app=build();
 app.elements.postTitle.value='A reproducible technical article';
 app.elements.postBody.value='A security finding with exact tests and reproducible steps.';
 app.elements.postBody.selectionStart=0;
 app.elements.postBody.selectionEnd=0;
 app.elements.formatHeading.listeners.click();
 assert.match(app.elements.postBody.value,/^## Section heading/);
 assert.match(app.elements.formStatus.textContent,/locally/);
 assert.equal(app.beforeUnload().prevented,true);
 const before=app.elements.postBody.value;
 app.elements.postBody.selectionStart=before.length;
 app.elements.postBody.selectionEnd=before.length;
 app.elements.formatCode.listeners.click();
 assert.match(app.elements.postBody.value,/```\n\/\/ your code\n```$/);
 assert.equal(app.elements.postBody.selectionEnd-app.elements.postBody.selectionStart,'// your code'.length);
 assert.match(app.elements.draftSafety.textContent,/Check your exported/);
});
test('over-limit code formatting does not change or clear text',()=>{
 const app=build();
 app.elements.postBody.value='x'.repeat(12000);
 app.elements.postBody.selectionStart=12000;
 app.elements.postBody.selectionEnd=12000;
 app.elements.formatCode.listeners.click();
 assert.equal(app.elements.postBody.value.length,12000);
 assert.equal(app.elements.formStatus.dataset.error,'true');
 assert.equal(app.beforeUnload().prevented,true);
});
