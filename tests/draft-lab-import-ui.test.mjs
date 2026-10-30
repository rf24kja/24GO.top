import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import {
  safeSourceUrl, validateDraft, formatDraft, draftFilename, hasDraftContent,
  parseDraftFile, MAX_DRAFT_FILE_BYTES, hasUnexportedChanges, formatDraftSelection, createDraftImportGate
} from '../site/draft-lab-logic.js';
import {uiText,applyUiLanguage} from '../site/draft-lab-i18n.js';

const source = readFileSync(fileURLToPath(new URL('../site/draft-lab.js', import.meta.url)), 'utf8')
  .replace(/^import .* from '.\/draft-lab-logic\.js';\n/m, '')
  .replace(/^import .* from '.\/draft-lab-preview\.js';\n/m, '')
  .replace(/^import .* from '.\/draft-lab-i18n\.js';\n/m, '');

const sample = {
  title:'Return and improve the documentation', locale:'ru', category:'tools',
  body:'The first paragraph explains a real technical problem.\n\nThe next paragraph contains the fix.',
  source:'https://example.org/guide'
};

function build() {
  const ids = [
    'postTitle','postBody','postLocale','postCategory','postSource','formStatus',
    'previewHeading','previewBody','previewLocale','previewCategory','bodyCount',
    'previewSource','draftSafety','articleOutline','articleOutlineSection','downloadDraft','copyDraft','clearDraft','importDraft','importDraftFile','draftForm',
    'formatHeading','formatList','formatQuote','formatCode','formatLink','uiLocale'
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
  elements.uiLocale.value='en';
  elements.postLocale.value='en';
  elements.postCategory.value='guides';
  let confirm = true;
  const window = {listeners:{}, confirm(){return confirm;}, addEventListener(type, callback){this.listeners[type]=callback;}};
  const document = {
    documentElement:{lang:'en'},
    getElementById(id){return elements[id];},
    querySelectorAll(){return [];}
  };
  runInNewContext(source, {
    document, window, navigator:{}, URL, Blob, setTimeout,
    safeSourceUrl,validateDraft,formatDraft,draftFilename,hasDraftContent,
    parseDraftFile,MAX_DRAFT_FILE_BYTES,hasUnexportedChanges,formatDraftSelection,createDraftImportGate,
    uiText,applyUiLanguage,
    renderMarkdownPreview(container, text) { container.textContent = text; },
    renderPreviewOutline(container,text) { container.textContent=text;return /^#{1,3} /m.test(text)?1:0; }
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
    startImport(file) {
      const input=elements.importDraftFile;
      input.files=[file];
      return input.listeners.change({currentTarget:input});
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

test('public Link tool writes only Markdown and selects an editable HTTPS destination',()=>{
 const app=build();
 const article='Reproducible API security evidence';
 app.elements.postBody.value=article;
 app.elements.postBody.selectionStart=13;
 app.elements.postBody.selectionEnd=16; // API
 app.elements.formatLink.listeners.click();
 assert.match(app.elements.postBody.value,/\[API\]\(https:\/\/example\.org\)/);
 const selection=app.elements.postBody.value.slice(
  app.elements.postBody.selectionStart,app.elements.postBody.selectionEnd);
 assert.equal(selection,'https://example.org');
 assert.equal(app.beforeUnload().prevented,true);
 assert.match(app.elements.formStatus.textContent,/locally/);
});
test('invalid multiline Link selection keeps local author text untouched',()=>{
 const app=build();
 app.elements.postBody.value='one\ntwo with extra detail';
 app.elements.postBody.selectionStart=0;
 app.elements.postBody.selectionEnd=7;
 app.elements.formatLink.listeners.click();
 assert.equal(app.elements.postBody.value,'one\ntwo with extra detail');
 assert.equal(app.elements.formStatus.dataset.error,'true');
});

test('interface language changes preserve the draft, saved-file baseline and current article language',async()=>{
 const app=build();
 await app.import(formatDraft(sample));
 const before={
  title:app.elements.postTitle.value,body:app.elements.postBody.value,
  articleLanguage:app.elements.postLocale.value,category:app.elements.postCategory.value,
  source:app.elements.postSource.value
 };
 assert.equal(app.beforeUnload().prevented,false);
 app.elements.uiLocale.value='ru';
 app.elements.uiLocale.listeners.change();
 assert.deepEqual({
  title:app.elements.postTitle.value,body:app.elements.postBody.value,
  articleLanguage:app.elements.postLocale.value,category:app.elements.postCategory.value,
  source:app.elements.postSource.value
 },before);
 assert.equal(app.beforeUnload().prevented,false,'language switch must not mark saved file dirty');
 assert.match(app.elements.draftSafety.textContent,/файл не изменён|Открытый файл/);
 app.elements.postBody.value+='\nNew paragraph';
 app.elements.postBody.listeners.input();
 assert.equal(app.beforeUnload().prevented,true);
 assert.match(app.elements.draftSafety.textContent,/не сохраняются/i);
 app.elements.uiLocale.value='zh';
 app.elements.uiLocale.listeners.change();
 assert.equal(app.beforeUnload().prevented,true,'language change does not pretend edits were exported');
 assert.match(app.elements.draftSafety.textContent,/不会自动保存/);
});

test('live outline visibility follows headings without modifying the article or exported baseline',async()=>{
 const app=build();
 const original=formatDraft(sample);
 await app.import(original);
 assert.equal(app.elements.articleOutlineSection.hidden,true);
 app.elements.postBody.value+='\n\n## Source evidence';
 app.elements.postBody.listeners.input();
 assert.equal(app.elements.articleOutlineSection.hidden,false);
 assert.equal(app.beforeUnload().prevented,true);
 app.elements.uiLocale.value='th';
 app.elements.uiLocale.listeners.change();
 assert.equal(app.elements.articleOutlineSection.hidden,false);
 assert.equal(app.beforeUnload().prevented,true);
 app.elements.postBody.value='A technical note without a Markdown section title.';
 app.elements.postBody.listeners.input();
 assert.equal(app.elements.articleOutlineSection.hidden,true);
});

function deferred(){
 let resolve,reject;
 const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
 return {promise,resolve,reject};
}

test('typing during a slow file read preserves every newer edit and the unsaved warning',async()=>{
 const app=build();
 const future=deferred();
 const pending=app.startImport({name:'24gotop-a.md',size:4000,text:()=>future.promise});
 app.elements.postTitle.value='Fresh hand-written title';
 app.elements.postBody.value='A newer technical explanation written while the file was opening.';
 app.elements.postBody.listeners.input();
 future.resolve(formatDraft(sample));
 await pending;
 assert.equal(app.elements.postTitle.value,'Fresh hand-written title');
 assert.equal(app.elements.postBody.value,'A newer technical explanation written while the file was opening.');
 assert.match(app.elements.formStatus.textContent,/draft changed while/i);
 assert.equal(app.elements.formStatus.dataset.error,'true');
 assert.equal(app.beforeUnload().prevented,true);
 assert.equal(app.elements.importDraftFile.value,'');
});

test('newer file selection wins regardless of read completion order',async()=>{
 const app=build();
 const old=deferred(),newer=deferred();
 const first=app.startImport({name:'24gotop-old.md',size:4000,text:()=>old.promise});
 const second=app.startImport({name:'24gotop-new.md',size:4000,text:()=>newer.promise});
 // An old rejected or successful read cannot clear the new selection's status.
 old.reject(new Error('old file unreadable'));
 await first;
 assert.equal(app.elements.formStatus.textContent,'');
 const winning={...sample,title:'A second and newer selected draft file'};
 newer.resolve(formatDraft(winning));
 await second;
 assert.equal(app.elements.postTitle.value,winning.title);
 assert.equal(app.elements.postBody.value,winning.body);
 assert.equal(app.beforeUnload().prevented,false,'most recent reopened file is baseline');
 assert.match(app.elements.formStatus.textContent,/Nothing was uploaded/);
});

test('slow first import cannot overwrite already opened second file',async()=>{
 const app=build();
 const old=deferred(),newer=deferred();
 const first=app.startImport({name:'24gotop-old.md',size:4000,text:()=>old.promise});
 const second=app.startImport({name:'24gotop-new.md',size:4000,text:()=>newer.promise});
 const winning={...sample,title:'A replacement selected after the first file'};
 newer.resolve(formatDraft(winning));await second;
 old.resolve(formatDraft(sample));await first;
 assert.equal(app.elements.postTitle.value,winning.title);
 assert.match(app.elements.formStatus.textContent,/Nothing was uploaded/);
 assert.equal(app.beforeUnload().prevented,false);
});

test('local formatting and explicit Clear invalidate slow import; UI language switch does not',async()=>{
 const app=build();
 const first=deferred();
 const importA=app.startImport({name:'24gotop-old.md',size:4000,text:()=>first.promise});
 app.elements.postBody.value='An existing local technical paragraph with enough content for editing.';
 app.elements.postBody.selectionStart=0;app.elements.postBody.selectionEnd=0;
 app.elements.formatHeading.listeners.click();
 const formatted=app.elements.postBody.value;
 first.resolve(formatDraft(sample));await importA;
 assert.equal(app.elements.postBody.value,formatted);
 assert.match(app.elements.formStatus.textContent,/draft changed while/i);

 const second=deferred();
 const importB=app.startImport({name:'24gotop-old.md',size:4000,text:()=>second.promise});
 app.elements.clearDraft.listeners.click();
 second.resolve(formatDraft(sample));await importB;
 assert.equal(app.elements.postBody.value,'');
 assert.match(app.elements.formStatus.textContent,/draft changed while/i);

 const third=deferred();
 const importC=app.startImport({name:'24gotop-valid.md',size:4000,text:()=>third.promise});
 app.elements.uiLocale.value='ru';
 app.elements.uiLocale.listeners.change();
 third.resolve(formatDraft(sample));await importC;
 assert.equal(app.elements.postTitle.value,sample.title);
 assert.equal(app.beforeUnload().prevented,false);
 assert.equal(app.elements.formStatus.textContent,uiText('ru','opened'));
 assert.equal(app.elements.formStatus.dataset.error,'false');
});
