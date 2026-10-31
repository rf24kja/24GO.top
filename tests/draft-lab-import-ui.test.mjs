import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import {
  safeSourceUrl, validateDraft, formatDraft, draftFilename, hasDraftContent,
  parseDraftFile, readDraftFileStrict, MAX_DRAFT_FILE_BYTES, hasUnexportedChanges, formatDraftSelection, createDraftImportGate, invalidDraftField
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

function build({uiHref='https://24go.top/draft-lab.html'}={}) {
  const ids = [
    'postTitle','postBody','postLocale','postCategory','postSource','formStatus',
    'previewHeading','previewBody','previewLocale','previewCategory','bodyCount',
    'previewSource','draftSafety','articleOutline','articleOutlineSection','downloadDraft','copyDraft','clearDraft','importDraft','importDraftFile','draftForm',
    'formatHeading','formatList','formatQuote','formatCode','formatTable','formatLink','uiLocale','draftDropZone','homeBrandLink','homeNavLink'
  ];
  const elements = Object.fromEntries(ids.map(id => {
    const el = {
      id, value:'', textContent:'', hidden:false, dataset:{}, listeners:{}, files:[],
      selectionStart:0,selectionEnd:0,
      setRangeText(replacement,start,end){this.value=this.value.slice(0,start)+replacement+this.value.slice(end);},
      setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;},
      addEventListener(type,callback){this.listeners[type]=callback;},
      attributes:{},
      setAttribute(name,value){this.attributes[name]=value;},
      removeAttribute(name){delete this.attributes[name];},
      getAttribute(name){return this.attributes[name]??null;},
      click(){this.clicked=true;},
      focus(){this.focused=true;},
      contains(){return false;}
    };
    return [id,el];
  }));
  elements.uiLocale.value='en';
  elements.postLocale.value='en';
  elements.postCategory.value='guides';
  let confirm = true;
  const window = {listeners:{}, location:{href:uiHref}, confirm(){return confirm;}, addEventListener(type, callback){this.listeners[type]=callback;}};
  const document = {
    listeners:{},
    addEventListener(type,callback){this.listeners[type]=callback;},
    documentElement:{lang:'en'},
    getElementById(id){return elements[id];},
    querySelectorAll(){return [];}
  };
  runInNewContext(source, {
    document, window, navigator:{}, URL, Blob, setTimeout,
    safeSourceUrl,validateDraft,formatDraft,draftFilename,hasDraftContent,
    parseDraftFile,readDraftFileStrict,MAX_DRAFT_FILE_BYTES,hasUnexportedChanges,formatDraftSelection,createDraftImportGate,invalidDraftField,
    uiText,applyUiLanguage,
    renderMarkdownPreview(container, text) { container.textContent = text; },
    renderPreviewOutline(container,text) { container.textContent=text;return /^#{1,3} /m.test(text)?1:0; }
  // Keep a bounded sandbox timeout, with enough CI runner headroom when
  // node --test starts multiple test files concurrently.
  },{timeout:5000});
  return {
    elements, document,
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
    drop(file) {return this.dropFiles([file]);},
    dropFiles(files) {
      const el=elements.draftDropZone;
      return el.listeners.drop({
       dataTransfer:{types:['Files'],files},
       preventDefault(){this.prevented=true;}
      });
    },
    async import(content, filename='24gotop-saved.md', size=Buffer.byteLength(content,'utf8')) {
      const input=elements.importDraftFile;
      const bytes=new TextEncoder().encode(content);
      input.files=[{name:filename,size,async arrayBuffer(){return bytes.buffer;}}];
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

function delayedFile(name,promise){
 const file={name,size:0,
  arrayBuffer:async()=>{
   const bytes=new TextEncoder().encode(await promise);
   file.size=bytes.byteLength;
   return bytes.buffer;
  }
 };
 return file;
}

test('typing during a slow file read preserves every newer edit and the unsaved warning',async()=>{
 const app=build();
 const future=deferred();
 const pending=app.startImport(delayedFile('24gotop-a.md',future.promise));
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
 const first=app.startImport(delayedFile('24gotop-old.md',old.promise));
 const second=app.startImport(delayedFile('24gotop-new.md',newer.promise));
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
 const first=app.startImport(delayedFile('24gotop-old.md',old.promise));
 const second=app.startImport(delayedFile('24gotop-new.md',newer.promise));
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
 const importA=app.startImport(delayedFile('24gotop-old.md',first.promise));
 app.elements.postBody.value='An existing local technical paragraph with enough content for editing.';
 app.elements.postBody.selectionStart=0;app.elements.postBody.selectionEnd=0;
 app.elements.formatHeading.listeners.click();
 const formatted=app.elements.postBody.value;
 first.resolve(formatDraft(sample));await importA;
 assert.equal(app.elements.postBody.value,formatted);
 assert.match(app.elements.formStatus.textContent,/draft changed while/i);

 const second=deferred();
 const importB=app.startImport(delayedFile('24gotop-old.md',second.promise));
 app.elements.clearDraft.listeners.click();
 second.resolve(formatDraft(sample));await importB;
 assert.equal(app.elements.postBody.value,'');
 assert.match(app.elements.formStatus.textContent,/draft changed while/i);

 const third=deferred();
 const importC=app.startImport(delayedFile('24gotop-valid.md',third.promise));
 app.elements.uiLocale.value='ru';
 app.elements.uiLocale.listeners.change();
 third.resolve(formatDraft(sample));await importC;
 assert.equal(app.elements.postTitle.value,sample.title);
 assert.equal(app.beforeUnload().prevented,false);
 assert.equal(app.elements.formStatus.textContent,uiText('ru','opened'));
 assert.equal(app.elements.formStatus.dataset.error,'false');
});


test('exact failing field receives keyboard focus and accessible error, not unrelated source',async()=>{
 const app=build(),el=app.elements;
 const valid={...sample};
 const values={postTitle:valid.title,postBody:valid.body,
  postLocale:valid.locale,postCategory:valid.category,postSource:valid.source};
 for(const [key,value] of Object.entries(values))el[key].value=value;
 const cases=[
  ['postTitle','x','invalidTitle'],
  ['postBody','short','invalidBody'],
  ['postLocale','not-a-language','invalidLocale'],
  ['postCategory','untrusted-category','invalidCategory'],
  ['postSource','javascript:alert(1)','invalidSource']
 ];
 for(const [id,bad,key] of cases){
  const baseline=el[id].value;
  el[id].value=bad;
  for(const control of Object.values(el))control.focused=false;
  await el.copyDraft.listeners.click();
  assert.equal(el[id].focused,true,id+' receives focus');
  assert.equal(el[id].attributes['aria-invalid'],'true',id+' invalid state');
  assert.equal(el[id].attributes['aria-describedby'],'formStatus',id+' screen reader help');
  assert.equal(el.formStatus.textContent,uiText('en',key));
  assert.equal(el.formStatus.dataset.error,'true');
  for(const [other] of cases)if(other!==id)
   assert.equal(el[other].attributes['aria-invalid'],undefined,other+' must not be invalid');
  el[id].value=baseline;
  el[id].listeners.input();
  assert.equal(el[id].attributes['aria-invalid'],undefined,'corrected error clears immediately');
  assert.equal(el[id].attributes['aria-describedby'],undefined,'corrected association cleared');
 }
});

test('oversized title and body focus the correct control, including programmatic values',async()=>{
 const app=build(),el=app.elements;
 el.postTitle.value='x'.repeat(161);
 el.postBody.value=sample.body;
 await el.copyDraft.listeners.click();
 assert.equal(el.postTitle.focused,true);
 assert.equal(el.postTitle.attributes['aria-invalid'],'true');
 el.postTitle.value=sample.title;el.postTitle.listeners.input();
 el.postBody.value='x'.repeat(12001);
 await el.copyDraft.listeners.click();
 assert.equal(el.postBody.focused,true);
 assert.equal(el.postBody.attributes['aria-invalid'],'true');
});

test('Ctrl+S / Cmd+S routes only the explicit local export, never browser writes',()=>{
 const app=build();
 const shortcut=app.document.listeners.keydown;
 assert.equal(typeof shortcut,'function');
 for(const modifiers of [{ctrlKey:true,metaKey:false},{ctrlKey:false,metaKey:true}]){
  app.elements.downloadDraft.clicked=false;
  const e={key:'s',repeat:false,altKey:false,shiftKey:false,...modifiers,
   preventDefault(){this.prevented=true;}};
  shortcut(e);
  assert.equal(e.prevented,true,'browser Save As suppressed for local export');
  assert.equal(app.elements.downloadDraft.clicked,true,'uses same validated Download action');
 }
 for(const props of [
  {key:'s',ctrlKey:false,metaKey:false},
  {key:'s',ctrlKey:true,shiftKey:true},
  {key:'s',ctrlKey:true,altKey:true},
  {key:'s',ctrlKey:true,repeat:true},
  {key:'a',ctrlKey:true},
  {key:'s',metaKey:false}
 ]){
  app.elements.downloadDraft.clicked=false;
  const e={key:'s',repeat:false,ctrlKey:false,metaKey:false,
    shiftKey:false,altKey:false,...props,preventDefault(){this.prevented=true;}};
  shortcut(e);
  assert.equal(e.prevented,undefined);
  assert.equal(app.elements.downloadDraft.clicked,false);
 }
});


test('language switch translates an active field error without modifying the draft',async()=>{
 const app=build(),el=app.elements;
 el.postTitle.value=sample.title;
 el.postBody.value=sample.body;
 el.postCategory.value=sample.category;
 el.postSource.value=sample.source;
 el.postLocale.value='unknown';
 await el.copyDraft.listeners.click();
 assert.equal(el.formStatus.textContent,uiText('en','invalidLocale'));
 assert.equal(el.postLocale.attributes['aria-invalid'],'true');
 assert.equal(el.postLocale.attributes['aria-describedby'],'formStatus');

 el.uiLocale.value='ru';el.uiLocale.listeners.change();
 assert.equal(el.postLocale.value,'unknown','the author content locale is unchanged');
 assert.equal(el.formStatus.textContent,uiText('ru','invalidLocale'));
 assert.equal(el.formStatus.dataset.error,'true');
 assert.equal(el.postLocale.attributes['aria-invalid'],'true');

 el.postSource.value='https://example.org/changed';el.postSource.listeners.input();
 assert.equal(el.formStatus.textContent,uiText('ru','invalidLocale'),
  'unrelated edits cannot hide the still-active field error');

 el.postLocale.value='en';el.postLocale.listeners.change();
 assert.equal(el.postLocale.attributes['aria-invalid'],undefined);
 assert.equal(el.postLocale.attributes['aria-describedby'],undefined);
 assert.equal(el.formStatus.textContent,'');
 assert.equal(el.formStatus.dataset.error,'false');
});


test('desktop file drop opens the original multilingual draft without upload',async()=>{
 const app=build();
 const original={...sample,locale:'th',title:'อธิบายโค้ดที่ทดสอบได้'};
 const bytes=new TextEncoder().encode(formatDraft(original));
 const dragged={name:'24gotop-saved.md',size:bytes.byteLength,
  arrayBuffer:async()=>bytes.buffer};
 let prevented=false;
 app.elements.draftDropZone.listeners.dragover({
  dataTransfer:{types:['text/plain'],dropEffect:'none'},
  preventDefault(){prevented=true;}
 });
 assert.equal(prevented,false,'non-file drag must retain normal text selection');
 const event={dataTransfer:{types:['Files'],dropEffect:'none'},
  preventDefault(){prevented=true;}};
 app.elements.draftDropZone.listeners.dragenter(event);
 assert.equal(prevented,true);
 assert.equal(app.elements.draftDropZone.dataset.dragging,'true');
 await app.drop(dragged);
 assert.equal(app.elements.draftDropZone.dataset.dragging,undefined);
 assert.equal(app.elements.postTitle.value,original.title);
 assert.equal(app.elements.postLocale.value,original.locale);
 assert.equal(app.elements.postSource.value,original.source);
 assert.match(app.elements.formStatus.textContent,/Nothing was uploaded/);
 assert.equal(app.beforeUnload().prevented,false);
});
test('multiple dropped files and invalid bytes never overwrite an unsaved draft',async()=>{
 const app=build();
 app.elements.postTitle.value='Author has not exported this draft';
 app.elements.postBody.value='Reproducible local research with substantial unsaved edits.';
 app.elements.postBody.listeners.input();
 const bytes=new TextEncoder().encode(formatDraft(sample));
 const good={name:'24gotop-saved.md',size:bytes.byteLength,
  arrayBuffer:async()=>bytes.buffer};
 await app.dropFiles([good,good]);
 assert.equal(app.elements.postTitle.value,'Author has not exported this draft');
 assert.equal(app.elements.formStatus.dataset.error,'true');
 const badBytes=Uint8Array.from([0xff,0xfe,0x80]);
 await app.drop({name:'24gotop-damaged.md',size:badBytes.length,
  arrayBuffer:async()=>badBytes.buffer});
 assert.equal(app.elements.postTitle.value,'Author has not exported this draft');
 assert.equal(app.beforeUnload().prevented,true);
 app.setConfirm(false);
 await app.drop(good);
 assert.equal(app.elements.postTitle.value,'Author has not exported this draft');
 assert.match(app.elements.formStatus.textContent,/Import cancelled/);
});


test('dropping a file outside the import area cannot navigate away or replace an unsaved draft',()=>{
 const app=build();
 const currentTitle='Keep this original technical draft';
 const currentBody='Long enough technical body that must survive an accidental file drop.';
 app.elements.postTitle.value=currentTitle;
 app.elements.postBody.value=currentBody;
 const outside={
  target:app.elements.postBody,
  dataTransfer:{types:['Files'],files:[{name:'notes.md'}]},
  prevented:false,preventDefault(){this.prevented=true;}
 };
 app.elements.draftDropZone.dataset.dragging='true';
 app.document.listeners.dragover(outside);
 assert.equal(outside.prevented,true,'prevent browser file navigation on dragover');
 assert.equal(app.elements.draftDropZone.dataset.dragging,undefined,
  'clear misleading import-zone hover state when leaving the zone');
 outside.prevented=false;
 app.document.listeners.drop(outside);
 assert.equal(outside.prevented,true,'never navigate away on misplaced file drop');
 assert.equal(app.elements.postTitle.value,currentTitle);
 assert.equal(app.elements.postBody.value,currentBody);
 assert.equal(app.beforeUnload().prevented,true);
 assert.match(app.elements.formStatus.textContent,/Drop one saved Draft Lab/);
});

test('ordinary text drags are unaffected by the file-navigation guard',()=>{
 const app=build();
 const event={
  target:app.elements.postBody,
  dataTransfer:{types:['text/plain'],files:[]},
  prevented:false,preventDefault(){this.prevented=true;}
 };
 app.document.listeners.dragover(event);
 app.document.listeners.drop(event);
 assert.equal(event.prevented,false);
 assert.equal(app.elements.formStatus.textContent,'');
});

test('a valid import-zone drop remains supported and does not show misplaced-drop warning',async()=>{
 const app=build();
 const bytes=new TextEncoder().encode(formatDraft(sample));
 const file={name:'24gotop-saved.md',size:bytes.byteLength,
  async arrayBuffer(){return bytes.buffer;}};
 const event={target:app.elements.draftDropZone,
  dataTransfer:{types:['Files'],files:[file]},
  prevented:false,preventDefault(){this.prevented=true;}};
 await app.elements.draftDropZone.listeners.drop(event);
 app.document.listeners.drop(event); // Native drop bubbles after the target handler.
 assert.equal(event.prevented,true);
 assert.equal(app.elements.postTitle.value,sample.title);
 assert.equal(app.elements.postBody.value,sample.body);
 assert.match(app.elements.formStatus.textContent,/Markdown draft opened locally/);
 assert.doesNotMatch(app.elements.formStatus.textContent,/Drop one saved Draft Lab/);
 assert.equal(app.beforeUnload().prevented,false);
});

test('homepage language links select only Draft Lab interface without modifying article language',()=>{
 for(const code of ['en','ru','th','es','fr','de','pt','zh']){
  const app=build({uiHref:'https://24go.top/draft-lab.html?ui='+code});
  assert.equal(app.elements.uiLocale.value,code);
  assert.equal(app.document.documentElement.lang,code);
  const home=code==='en'?'./':'./'+code+'/';
  assert.equal(app.elements.homeBrandLink.href,home);
  assert.equal(app.elements.homeNavLink.href,home);
  assert.equal(app.elements.postLocale.value,'en','article language is separate');
  assert.equal(app.elements.postTitle.value,'');
  assert.equal(app.elements.postBody.value,'');
 }
 for(const supplied of ['?ui=../ru','?ui=__proto__','?ui=RU','?ui=%3Cscript%3E','?lang=ru']){
  const app=build({uiHref:'https://24go.top/draft-lab.html'+supplied});
  assert.equal(app.elements.uiLocale.value,'en','unknown UI must fall back to English');
  assert.equal(app.elements.postLocale.value,'en');
 }
});


test('live browser preview receives original article whitespace and matches exported text',async()=>{
 const app=build();
 const body='\n\n    const secret = "<img onerror=attack()>";  \n\n    const phrase = "中文 Русский ไทย";\n\n';
 app.elements.postTitle.value='An original technical article';
 app.elements.postBody.value=body;
 app.elements.postBody.listeners.input();
 assert.equal(app.elements.previewBody.textContent,body,
  'preview renderer must receive untrimmed article source');
 const draft={
  title:app.elements.postTitle.value,body,
  locale:app.elements.postLocale.value,
  category:app.elements.postCategory.value,
  source:app.elements.postSource.value
 };
 const reopen=formatDraft(draft);
 assert.equal(parseDraftFile(reopen).body,body,
  'export and reopen preserve exactly the same source');
 const fresh=build();
 await fresh.import(reopen);
 assert.equal(fresh.elements.previewBody.textContent,body,
  'reopening .md must not silently trim the preview');
 assert.equal(fresh.beforeUnload().prevented,false,
  'merely previewing an imported file does not mark it as edited');
});

test('visible Table toolbar edits draft source, previews and keeps loss protection',()=>{
 const app=build();
 app.elements.postTitle.value='Evidence comparison for technical readers';
 app.elements.postBody.value='The author writes a reproducible summary first.';
 const start=app.elements.postBody.value.length;
 app.elements.postBody.selectionStart=start;
 app.elements.postBody.selectionEnd=start;
 app.elements.formatTable.listeners.click();
 assert.match(app.elements.postBody.value,/\| Column \| Value \|\n\| --- \| --- \|\n\| Example \| 123 \|$/);
 assert.equal(app.elements.postBody.value.slice(
  app.elements.postBody.selectionStart,app.elements.postBody.selectionEnd),'Column');
 assert.equal(app.elements.previewBody.textContent,app.elements.postBody.value);
 assert.equal(app.beforeUnload().prevented,true);
 assert.match(app.elements.formStatus.textContent,/locally/);
});
