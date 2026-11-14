import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UI_LOCALES,UI_STRINGS,uiText,applyUiLanguage} from '../site/draft-lab-i18n.js';

const html=readFileSync(new URL('../site/draft-lab.html',import.meta.url),'utf8');
const code=readFileSync(new URL('../site/draft-lab.js',import.meta.url),'utf8');
const i18n=readFileSync(new URL('../site/draft-lab-i18n.js',import.meta.url),'utf8');

test('all eight approved interface languages have complete, nonempty label and safety dictionaries',()=>{
 assert.deepEqual(UI_LOCALES,['en','ru','th','es','fr','de','pt','zh']);
 const base=Object.keys(UI_STRINGS.en).sort();
 assert.ok(base.length>=75);
 for(const locale of UI_LOCALES){
  const dictionary=UI_STRINGS[locale];
  assert.deepEqual(Object.keys(dictionary).sort(),base,locale+' translated coverage');
  for(const key of base){
   assert.ok(typeof dictionary[key]==='string'&&dictionary[key].trim(),locale+': '+key);
   assert.doesNotMatch(dictionary[key],/<script|<iframe|onerror=|javascript:/i);
  }
 }
 assert.notEqual(uiText('ru','headline'),uiText('en','headline'));
 assert.notEqual(uiText('th','notice'),uiText('en','notice'));
 assert.equal(uiText('??','headline'),uiText('en','headline'));
 assert.throws(()=>uiText('ru','constructor'),TypeError);
 assert.throws(()=>uiText('ru','__proto__'),TypeError);
});

test('every translated static HTML key and accessible attribute exists in the dictionary',()=>{
 assert.match(html,/id="uiLocale"/);
 assert.match(html,/id="postLocale"/);
 assert.match(html,/name="locale"/);
 assert.match(html,/name="category"/);
 for(const locale of UI_LOCALES)assert.match(html,new RegExp('<option value="'+locale+'">'));
 const attributes=[...html.matchAll(/data-ui(?:-placeholder|-label)?="([^"]+)"/g)];
 assert.ok(attributes.length>60,'labels, placeholders and accessibility need translations');
 for(const [,key] of attributes)assert.ok(Object.hasOwn(UI_STRINGS.en,key),key);
 assert.match(html,/does not publish, upload or automatically save your writing/);
 assert.match(html,/meta name="robots" content="noindex,follow"/);
});

test('language application only updates UI text and attributes, never user-entered form values',()=>{
 const title={value:'Private unpublished research'};
 const body={value:'<script>USER ARTICLE MUST NOT CHANGE</script>'};
 const articleLanguage={value:'en'};
 const category={value:'tools'};
 const nodes=new Map();
 const doc={
  documentElement:{lang:'en'},
  querySelectorAll(selector){
   return nodes.get(selector)||[];
  }
 };
 const textNode={textContent:'fallback',getAttribute(){return 'headline';}};
 const placeholderNode={value:body.value,attributes:{},
  getAttribute(){return 'bodyPlaceholder';},
  setAttribute(key,value){this.attributes[key]=value;}
 };
 const ariaNode={attributes:{},getAttribute(){return 'formatGroup';},
  setAttribute(key,value){this.attributes[key]=value;}
 };
 nodes.set('[data-ui]',[textNode]);
 nodes.set('[data-ui-placeholder]',[placeholderNode]);
 nodes.set('[data-ui-label]',[ariaNode]);
 assert.equal(applyUiLanguage(doc,'ru'),'ru');
 assert.equal(doc.documentElement.lang,'ru');
 assert.equal(textNode.textContent,UI_STRINGS.ru.headline);
 assert.equal(placeholderNode.attributes.placeholder,UI_STRINGS.ru.bodyPlaceholder);
 assert.equal(ariaNode.attributes['aria-label'],UI_STRINGS.ru.formatGroup);
 assert.deepEqual([title.value,body.value,articleLanguage.value,category.value],
  ['Private unpublished research','<script>USER ARTICLE MUST NOT CHANGE</script>','en','tools']);
 assert.equal(applyUiLanguage(doc,'zh'),'zh');
 assert.equal(doc.documentElement.lang,'zh');
 assert.equal(applyUiLanguage(doc,'invalid'),'en');
});

test('translation is progressive, offline, and does not change export format or publish',()=>{
 assert.match(code,/uiLocale\.addEventListener\('change',refreshInterface\)/);
 assert.match(code,/applyUiLanguage\(document,uiLocale\.value\)/);
 assert.match(code,/preview\(\)/);
 assert.match(code,/hasUnexportedChanges\(currentDraft\(\), reopenedFileBaseline\)/);
 assert.doesNotMatch(i18n,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|innerHTML|document\.cookie/);
 assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|sessionStorage|innerHTML/);
 assert.match(html,/does not publish, upload or automatically save your writing/);
});

test('authoring controls have translated labels and are wired to local-only logic',()=>{
 for(const language of UI_LOCALES){
  assert.equal(typeof uiText(language,'orderedList'),'string');
  assert.ok(uiText(language,'orderedList').length>2);
  assert.equal(typeof uiText(language,'wordCount'),'string');
  assert.ok(uiText(language,'wordCount').trim().length>3);
 }
 assert.match(html,/id="formatOrderedList"[^>]+data-ui-label="orderedList"/);
 assert.match(html,/id="bodyWordCount" aria-live="off"/);
 assert.match(code,/countDraftWords\(body\.value,locale\.value\)/);
 assert.match(code,/\['formatOrderedList','orderedList'\]/);
});

test('guided local article workflow is fully translated and has accessible landmarks',()=>{
 for(const locale of UI_LOCALES){
  for(const key of ['templateHeading','templateHelp','templateLabel','templateGuide',
   'templateCaseStudy','templateInsert','templateAdded','templateLimit',
   'templateInvalid','readingTime','readingMinutes','guidanceHeading',
   'guidanceHint','guidanceScore','guidanceDone','guidanceMissing','checkTitle',
   'checkBody','checkHeadings','checkSteps','checkSource','checkComplete']){
    assert.equal(typeof uiText(locale,key),'string',locale+'/'+key);
    assert.ok(uiText(locale,key).trim().length>1,locale+'/'+key);
  }
 }
 assert.match(html,/id="draftTemplate"[^>]+data-ui-label="templateLabel"/);
 assert.match(html,/id="insertTemplate" type="button"/);
 assert.match(html,/id="draftReadingTime" aria-live="off"/);
 assert.match(html,/class="draft-guidance" aria-labelledby="guidanceHeading"/);
 assert.match(code,/appendDraftTemplate\(body\.value,field\('draftTemplate'\)\.value,locale\.value\)/);
 assert.match(code,/analyzeDraftGuidance\(currentDraft\(\)\)/);
 assert.doesNotMatch(i18n,/\bfetch\s*\(|sendBeacon|XMLHttpRequest|document\.cookie/);
});

test('offline review handoff is translated in every UI language and declares full-text privacy',()=>{
 for(const locale of UI_LOCALES){
  for(const key of ['reviewPackDownload','reviewPackVerify','reviewPackPrivacy',
   'reviewPackConfirm','reviewPackInterrupted','reviewPackExported',
   'reviewPackError','reviewPackValid','reviewPackValidSuffix','reviewPackInvalid']){
    assert.ok(uiText(locale,key).trim().length>2,locale+'/'+key);
  }
 }
 assert.match(html,/id="downloadReviewPack"[^>]+data-ui="reviewPackDownload"/);
 assert.match(html,/id="verifyReviewPack"[^>]+data-ui="reviewPackVerify"/);
 assert.match(html,/id="reviewPackFile" type="file"/);
 assert.match(code,/createEditorialReviewPack/);
 assert.match(code,/readEditorialReviewPackFile/);
 assert.doesNotMatch(code,/sendBeacon|XMLHttpRequest/);
});

test('author-review jump navigation is translated in all eight languages',()=>{
 for(const locale of UI_LOCALES){
  assert.ok(uiText(locale,'jumpPreview').length>8,locale);
  assert.ok(uiText(locale,'jumpEditor').length>8,locale);
  assert.notEqual(uiText(locale,'jumpPreview'),uiText(locale,'jumpEditor'));
 }
 assert.match(html,/href="#preview-title" data-ui="jumpPreview"/);
 assert.match(html,/href="#postBody" data-ui="jumpEditor"/);
});


test('opt-in external image privacy and loading controls are translated in all eight UI languages',()=>{
 for(const locale of UI_LOCALES){
  for(const key of ['previewImageLoad','previewImageFailed','previewImagePrivacy']){
   assert.ok(uiText(locale,key).trim().length>=4,locale+'/'+key);
  }
 }
 assert.match(html,/data-ui="previewImagePrivacy"/);
 assert.match(code,/imageLoad:ui\('previewImageLoad'\)/);
 assert.match(code,/imageFailed:ui\('previewImageFailed'\)/);
 const preview=readFileSync(new URL('../site/draft-lab-preview.js',import.meta.url),'utf8');
 assert.match(preview,/image\.setAttribute\('crossorigin','anonymous'\)/);
 assert.match(preview,/image\.setAttribute\('referrerpolicy','no-referrer'\)/);
 assert.match(preview,/image\.hidden=true/);
 assert.doesNotMatch(preview,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|innerHTML/);
});


test('every image insertion label, placeholder and error is present in all 8 locales',()=>{
 const keys=['imageInsertHeading','imageUrlLabel','imageAltLabel',
  'imageAltPlaceholder','imageInsertButton','imageInsertHint',
  'imageInserted','imageInvalid'];
 for(const locale of UI_LOCALES){
  for(const key of keys){
   assert.ok(uiText(locale,key).trim().length>=4,locale+' '+key);
  }
 }
 assert.match(html,/data-ui="imageInsertHeading"/);
 assert.match(html,/data-ui="imageInsertButton"/);
 assert.match(html,/data-ui-placeholder="imageAltPlaceholder"/);
 assert.match(code,/message\(ui\('imageInserted'\)\)/);
 assert.match(code,/ui\('imageInvalid'\)/);
 assert.match(html,/id="imageInsertHint" data-ui="imageInsertHint"/);
});


test('plain Markdown insertion, safety messages and keyboard controls are translated in all eight locales',()=>{
 const keys=['externalMdButton','externalMdHint','externalMdInserted',
  'externalMdError','externalMdInterrupted'];
 for(const locale of UI_LOCALES)for(const key of keys)
  assert.ok(uiText(locale,key).trim().length>=4,locale+' '+key);
 assert.match(html,/id="insertExternalMarkdown"[^>]*data-ui="externalMdButton"/);
 assert.match(html,/id="externalMarkdownHint" data-ui="externalMdHint"/);
 assert.match(code,/ui\('externalMdError'\)/);
 assert.match(code,/ui\('externalMdInterrupted'\)/);
 assert.match(code,/ui\('externalMdInserted'\)/);
});


test('local print and PDF safeguards are translated for eight editor interface locales',()=>{
 for(const locale of UI_LOCALES){
  for(const key of ['printGroup','printButton','printHelp','printEmpty',
   'printRequested','printUnavailable']){
   assert.ok(uiText(locale,key).trim().length>=4,locale+': '+key);
  }
 }
 assert.match(html,/data-ui="printButton"/);
 assert.match(html,/data-ui="printHelp"/);
 assert.match(html,/data-ui-label="printGroup"/);
 assert.match(code,/ui\('printRequested'\)/);
 assert.match(code,/ui\('printUnavailable'\)/);
 assert.match(code,/ui\('printEmpty'\)/);
 assert.doesNotMatch(i18n,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|document\.cookie/);
});


test('reversible checkpoint controls, consent and cancellation are translated in all eight locales',()=>{
 for(const locale of UI_LOCALES){
  for(const key of ['revisionRestore','revisionRestoreConfirm','revisionRestored',
   'revisionRestoreCanceled','revisionRestoreSame','revisionHint']){
   assert.ok(uiText(locale,key).trim().length>=4,locale+' '+key);
  }
 }
 assert.match(html,/data-ui="revisionRestore"/);
 assert.match(code,/ui\('revisionRestoreConfirm'\)/);
 assert.match(code,/ui\('revisionRestored'\)/);
 assert.match(code,/ui\('revisionRestoreCanceled'\)/);
 assert.match(code,/ui\('revisionRestoreSame'\)/);
});


test('AES-GCM backup actions, password recovery warning and error states translated in all eight locales',()=>{
 const keys=['encryptedBackupHeading','encryptedBackupHint','encryptedBackupPasswordLabel',
  'encryptedBackupExport','encryptedBackupRestore','encryptedBackupPasswordInvalid',
  'encryptedBackupExported','encryptedBackupInvalid','encryptedBackupUnavailable',
  'encryptedBackupChanged','encryptedBackupRestoreConfirm','encryptedBackupRestored'];
 for(const locale of UI_LOCALES)for(const key of keys)
  assert.ok(uiText(locale,key).trim().length>=4,locale+' '+key);
 for(const key of ['encryptedBackupHeading','encryptedBackupHint',
  'encryptedBackupPasswordLabel','encryptedBackupExport','encryptedBackupRestore'])
  assert.ok(html.includes('data-ui="'+key+'"'),key);
 assert.match(code,/ui\('encryptedBackupRestoreConfirm'\)/);
 assert.match(code,/ui\('encryptedBackupRestored'\)/);
 assert.match(code,/ui\('encryptedBackupUnavailable'\)/);
});
