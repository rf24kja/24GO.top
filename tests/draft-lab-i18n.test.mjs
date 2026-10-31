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
