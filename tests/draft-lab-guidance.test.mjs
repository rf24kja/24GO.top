import test from 'node:test';
import assert from 'node:assert/strict';
import {templateSnippet,appendDraftTemplate,analyzeDraftGuidance,GUIDANCE_KEYS} from '../site/draft-lab-guidance.js';
import {LOCALES,formatDraft,parseDraftFile} from '../site/draft-lab-logic.js';

test('both technical writing starters are translated into all eight article languages',()=>{
 for(const language of LOCALES){
  for(const kind of ['guide','caseStudy']){
   const snippet=templateSnippet(kind,language);
   assert.ok(snippet.length>100,language+':'+kind);
   assert.equal((snippet.match(/^## /gm)||[]).length,4);
   assert.equal((snippet.match(/^> TODO: /gm)||[]).length,4);
   assert.doesNotMatch(snippet,/<script|<iframe|javascript:|\u0000/i);
   assert.equal(snippet,templateSnippet(kind,language));
  }
 }
 assert.notEqual(templateSnippet('guide','ru'),templateSnippet('guide','en'));
 assert.notEqual(templateSnippet('guide','th'),templateSnippet('guide','en'));
 for(const args of [['private','en'],['guide','xx'],['__proto__','en']])
  assert.throws(()=>templateSnippet(...args),TypeError);
});

test('template append is non-destructive, bounded and does not rewrite article metadata',()=>{
 const original='    const x = 1;\nA private Markdown note.';
 const next=appendDraftTemplate(original,'guide','ru');
 assert.ok(next.startsWith(original+'\n\n## Проблема'));
 assert.equal(next.length,original.length+2+templateSnippet('guide','ru').length);
 assert.equal(appendDraftTemplate('','caseStudy','en'),templateSnippet('caseStudy','en'));
 assert.equal(appendDraftTemplate('Already ends in newline\n','guide','en'),
  'Already ends in newline\n\n'+templateSnippet('guide','en'));
 assert.throws(()=>appendDraftTemplate('x'.repeat(12000),'guide','en'),RangeError);
 assert.throws(()=>appendDraftTemplate(null,'guide','en'),TypeError);
 const draft={title:'Reproducible article title',body:next,
  locale:'ru',category:'guides',source:''};
 assert.deepEqual(parseDraftFile(formatDraft(draft)),draft,
  'old Draft Lab export format remains readable for templated work');
});

test('guidance is advisory and recognizes sources, executable examples and incomplete TODOs',()=>{
 const empty=analyzeDraftGuidance({title:'',body:'',locale:'en',source:''});
 assert.equal(empty.completed,0);
 assert.equal(empty.total,6);
 assert.equal(empty.words,0);
 assert.equal(empty.readingMinutes,0);
 assert.deepEqual(Object.keys(empty.checks),GUIDANCE_KEYS);
 const draft={
  title:'Practical PostgreSQL security research',
  body:'## Reproduction\n\nA detailed technical article with steps and evidence.\n\n'+
       '1. Reproduce\n2. Check results\n\n'+
       'Refer to [documentation](https://example.org/research) for details.',
  locale:'en',category:'guides',source:''
 };
 const analysis=analyzeDraftGuidance(draft);
 assert.equal(analysis.completed,6);
 assert.ok(analysis.words>5);
 assert.ok(analysis.readingMinutes>=1);
 assert.equal(analyzeDraftGuidance({...draft,body:templateSnippet('guide','en')}).checks.complete,false);
 assert.equal(analyzeDraftGuidance({...draft,source:'javascript:alert(1)',
  body:'## Results\n\nThis article needs genuine evidence, not unsafe URLs.'}).checks.source,false);
 assert.equal(analyzeDraftGuidance({...draft,
  body:'```md\n## Fake heading\n[not a citation](https://example.org)\n```',
  source:''}).checks.headings,false);
 assert.equal(analyzeDraftGuidance({...draft,
  body:'```md\n[not a citation](https://example.org)\n```',source:''}).checks.source,false);
 assert.throws(()=>analyzeDraftGuidance({...draft,body:'x'.repeat(12001)}),RangeError);
});

test('reader-time estimate handles Chinese and Thai without sending data anywhere',()=>{
 for(const locale of LOCALES){
  const output=analyzeDraftGuidance({title:'Technical case study',body:'中文技术文章 '+ 'ภาษาไทยการเขียนบทความ '+
  'reproducible code example.',locale,category:'guides',source:''});
  assert.ok(output.words>=3);
  assert.equal(output.readingMinutes,1);
 }
});
