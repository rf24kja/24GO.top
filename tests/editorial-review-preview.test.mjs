import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {formatDraft} from '../site/draft-lab-logic.js';
import {renderEditorialReviewPreview,escapeReviewHtml,makeReviewFile} from '../scripts/editorial-review-preview.mjs';

const tick=String.fromCharCode(96);
const base=Object.freeze({
 title:'Understanding safe Markdown preview',
 body:'A useful technical explanation with [documentation](https://example.org/manual?q=1&b=2) and **evidence**.',
 locale:'en',category:'guides',source:'https://example.org/source'
});
test('review copy is explicitly local and non-indexable, with no invented publication metadata',()=>{
 const html=renderEditorialReviewPreview(base);
 assert.match(html,/UNPUBLISHED — LOCAL REVIEW COPY/);
 assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
 assert.match(html,/default-src &#39;none&#39;/);
 assert.doesNotMatch(html,/<link rel="canonical"|datePublished|dateModified|application\/ld\+json|<script/);
 assert.match(html,/<h1>Understanding safe Markdown preview<\/h1>/);
 assert.match(html,/Language: en · Category: guides/);
});
test('untrusted author HTML and source-like HTML are escaped, never executed',()=>{
 const draft={...base,title:'Guide <script>alert(1)</script>',
  body:'Safe preview blocks <img src=x onerror=alert(1)> and code\n\n' +
   tick.repeat(3)+'html\n<script>alert("run")</script>\n'+tick.repeat(3)+'\n\n' +
   '[bad](javascript:alert(1)) and [safe](https://example.org/?a=1&b=2)'};
 const html=renderEditorialReviewPreview(draft);
 assert.doesNotMatch(html,/<script>|<img|javascript:[^<]*"/);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(html,/&lt;script&gt;alert\(&quot;run&quot;\)&lt;\/script&gt;/);
 assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
 assert.match(html,/href="https:\/\/example.org\/\?a=1&amp;b=2"/);
 assert.match(html,/rel="noopener noreferrer ugc"/);
 assert.equal(escapeReviewHtml("<&\"'"),'&lt;&amp;&quot;&#39;');
});
test('multilingual headings, lists, quotes and tables remain legible and inert',()=>{
 const draft={...base,title:'Пример 中文 ภาษาไทย',
  locale:'ru',source:'',
  body:'## Как работает проверка\n\n- пункт один\n- пункт два\n\n> цитата\n\n' +
   '| Колонка | Значение |\n| --- | --- |\n| <svg onload=alert(1)> | '+tick+'code'+tick+' |\n'};
 const html=renderEditorialReviewPreview(draft);
 assert.match(html,/<html lang="ru">/);
 assert.match(html,/<h3>Как работает проверка<\/h3>/);
 assert.match(html,/<ul><li>пункт один<\/li><li>пункт два<\/li><\/ul>/);
 assert.match(html,/<blockquote>цитата<\/blockquote>/);
 assert.match(html,/&lt;svg onload=alert\(1\)&gt;/);
 assert.match(html,/<table>/);
 assert.doesNotMatch(html,/class="source"/);
});
test('invalid draft input is rejected before producing review HTML',()=>{
 for(const draft of [
  {...base,body:'short'}, {...base,locale:'xx'},
  {...base,source:'javascript:alert(1)'},
  {...base,title:'Bad\nLanguage: en'}
 ])assert.throws(()=>renderEditorialReviewPreview(draft),TypeError);
});
test('offline CLI helper reads only valid Draft Lab files and never overwrites review copies',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'24gotop-review-'));
 try{
  const input=join(dir,'draft.md'),output=join(dir,'review.html');
  await writeFile(input,formatDraft(base));
  const result=await makeReviewFile(input,output);
  assert.equal(result.generated,true);
  const outputHtml=await readFile(output,'utf8');
  assert.match(outputHtml,/<title>UNPUBLISHED REVIEW COPY/);
  await assert.rejects(makeReviewFile(input,output),{code:'EEXIST'});
  const wrong=join(dir,'wrong.md');
  await writeFile(wrong,'untrusted arbitrary Markdown');
  await assert.rejects(makeReviewFile(wrong,join(dir,'other.html')),TypeError);
  await assert.rejects(makeReviewFile(input,join(dir,'wrong.txt')),TypeError);
  const oversize=join(dir,'huge.md');
  await writeFile(oversize,'x'.repeat(70000));
  await assert.rejects(makeReviewFile(oversize,join(dir,'oversize.html')),TypeError);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('malformed UTF-8 draft is rejected rather than silently changing author bytes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'24gotop-review-'));
 try{
  const path=join(dir,'invalid.md');
  await writeFile(path,new Uint8Array([0xc3,0x28]));
  await assert.rejects(makeReviewFile(path,join(dir,'no.html')),TypeError);
 }finally{await rm(dir,{recursive:true,force:true});}
});
