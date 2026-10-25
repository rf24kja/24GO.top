import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, CATEGORIES, safeSourceUrl, validateDraft, formatDraft } from '../site/draft-lab-logic.js';

const valid = {
  title:'Making a secure publishing API',
  body:'An original technical write-up with a reproducible workflow and clear caveats.',
  locale:'en',category:'guides',source:'https://example.org/research'
};

test('browser-only editor supports the actual public language and category options',()=>{
  assert.deepEqual(LOCALES,['en','ru','th','es','fr','de','pt','zh']);
  assert.deepEqual(CATEGORIES,['news','models','tools','guides']);
  assert.equal(validateDraft(valid),'');
});

test('validate title/body/language/category limits before copy',()=>{
  assert.match(validateDraft({...valid,title:'ab'}),/title/);
  assert.match(validateDraft({...valid,title:'x'.repeat(161)}),/title/);
  assert.match(validateDraft({...valid,body:'short'}),/Write/);
  assert.match(validateDraft({...valid,body:'x'.repeat(12001)}),/Write/);
  assert.match(validateDraft({...valid,locale:'unknown'}),/language/);
  assert.match(validateDraft({...valid,category:'unsafe'}),/category/);
});

test('source URLs permit only HTTP(S) and disallow credentials or script URLs',()=>{
  assert.equal(safeSourceUrl(''),'');
  assert.equal(safeSourceUrl('https://example.org/post'),'https://example.org/post');
  assert.equal(safeSourceUrl('javascript:alert(1)'),null);
  assert.equal(safeSourceUrl('data:text/html,hi'),null);
  assert.equal(safeSourceUrl('https://name:password@example.org/x'),null);
  assert.equal(safeSourceUrl('ftp://example.org/x'),null);
  assert.equal(safeSourceUrl('invalid'),null);
  assert.match(validateDraft({...valid,source:'javascript:alert(1)'}),/HTTP or HTTPS/);
});

test('copy output is deterministic, human-readable, and clearly unpublished',()=>{
  const output=formatDraft(valid);
  assert.match(output,/^# Making a secure publishing API/);
  assert.match(output,/Language: en/);
  assert.match(output,/Category: guides/);
  assert.match(output,/Original source: https:\/\/example.org\/research/);
  assert.match(output,/Unpublished draft/);
  assert.doesNotMatch(output,/API key|Bearer /);
  assert.equal(formatDraft({...valid,source:''}).includes('Original source'),false);
});

test('draft output preserves input literally, without HTML execution',()=>{
  const raw='<img src=x onerror=alert(1)> something reproducible in a technical project.';
  const output=formatDraft({...valid,body:raw});
  assert.ok(output.includes(raw),'source should remain literal text for copying');
  assert.throws(()=>formatDraft({...valid,source:'javascript:alert(1)'}),TypeError);
});
