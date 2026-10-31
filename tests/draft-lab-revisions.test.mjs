import test from 'node:test';
import assert from 'node:assert/strict';
import {captureDraftRevision,compareDraftRevisions,revisionSummary,REVISION_FIELDS}
 from '../site/draft-lab-revisions.js';

const base={
 title:'Reproducible PostgreSQL guide',locale:'en',category:'guides',
 source:'https://example.org/source',
 body:'## Overview\n\nA reproducible technical explanation.\n\n- First step\n- Second step'
};
test('immutable checkpoint preserves original article and detects no change',()=>{
 const checkpoint=captureDraftRevision(base);
 const actual=compareDraftRevisions(checkpoint,{...base});
 assert.deepEqual(actual.changedFields,[]);
 assert.equal(actual.bodyChanged,false);
 assert.equal(actual.changed,false);
 assert.equal(actual.added,0);
 assert.equal(actual.removed,0);
 assert.equal(actual.entries.length,0);
 assert.ok(Object.isFrozen(checkpoint));
 assert.deepEqual(Object.keys(checkpoint),[...REVISION_FIELDS,'body']);
});

test('line comparison keeps indentation, Unicode, duplicates and untrusted HTML as literal text',()=>{
 const prior={...base,body:'alpha\n\n    code\n中文\nalpha'};
 const now={...base,body:'alpha\n    code\n<iframe src=evil></iframe>\n中文\nalpha'};
 const diff=compareDraftRevisions(prior,now);
 assert.equal(diff.changed,true);
 assert.equal(diff.added,1);
 assert.equal(diff.removed,1);
 assert.equal(diff.truncated,false);
 assert.ok(diff.entries.some(e=>e.kind==='added'&&e.text==='<iframe src=evil></iframe>'));
 assert.ok(diff.entries.some(e=>e.kind==='same'&&e.text==='    code'));
 assert.ok(diff.entries.some(e=>e.kind==='removed'&&e.text===''));
 assert.equal(diff.entries.at(-1).text,'alpha');
});

test('changes to metadata are tracked independently from article body',()=>{
 const diff=compareDraftRevisions(base,{...base,title:'Updated title',locale:'ru',
  category:'news',source:''});
 assert.deepEqual(diff.changedFields,['title','locale','category','source']);
 assert.equal(diff.bodyChanged,false);
 assert.equal(diff.changed,true);
 assert.equal(diff.entries.length,0);
 const report=revisionSummary(diff);
 assert.match(report,/Changed fields: title, locale, category, source/);
 assert.doesNotMatch(report,/Updated title|example\.org|Reproducible PostgreSQL/);
});

test('line-heavy inputs stop at a bounded incomplete-report fallback',()=>{
 const lines=Array.from({length:400},(_,i)=>'x'+i).join('\n');
 const diff=compareDraftRevisions({...base,body:lines},
  {...base,body:lines+'\nnew'});
 assert.equal(diff.bodyChanged,true);
 assert.equal(diff.truncated,true);
 assert.equal(diff.entries.length,0);
 assert.equal(diff.added,null);
 assert.match(revisionSummary(diff),/incomplete/);
});

test('full comparison preserves original article, limits preview and discloses truncation',()=>{
 const previous=Array.from({length:240},(_,i)=>'old '+i).join('\n');
 const current=Array.from({length:240},(_,i)=>'new '+i).join('\n');
 const diff=compareDraftRevisions({...base,body:previous},{...base,body:current});
 assert.equal(diff.changed,true);
 assert.equal(diff.added,240);
 assert.equal(diff.removed,240);
 assert.equal(diff.truncated,true);
 assert.equal(diff.entries.length,180);
 assert.ok(revisionSummary(diff).includes('incomplete'));
 assert.equal(base.body,'## Overview\n\nA reproducible technical explanation.\n\n- First step\n- Second step');
});
test('invalid shapes and overflowing body are rejected before comparing',()=>{
 for(const input of [undefined,null,{}, {...base,body:null},
  {...base,title:'t'.repeat(161)}, {...base,body:'a'.repeat(12001)}]){
  assert.throws(()=>captureDraftRevision(input));
 }
 assert.throws(()=>compareDraftRevisions(base,{...base,source:'x'.repeat(2049)}),RangeError);
 assert.throws(()=>revisionSummary(null),TypeError);
});
