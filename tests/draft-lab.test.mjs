import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, CATEGORIES, safeSourceUrl, validateDraft, formatDraft, draftFilename, hasDraftContent, parseDraftFile, MAX_DRAFT_FILE_BYTES } from '../site/draft-lab-logic.js';

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


test('on-device export uses safe predictable Markdown filenames',()=>{
  assert.equal(draftFilename(valid),'24gotop-making-a-secure-publishing-api.md');
  assert.equal(draftFilename({...valid,title:'../../../../..\\test<script>',locale:'ru'}),'24gotop-test-script.md');
  assert.equal(draftFilename({...valid,title:'Тестовая статья',locale:'ru'}),'24gotop-draft-ru.md');
  const name=draftFilename({...valid,title:'A'.repeat(160)});
  assert.ok(name.length <= 62);
  assert.match(name,/^24gotop-[a-z0-9-]+\.md$/);
});

test('clear confirmation is only needed when user actually wrote something',()=>{
  assert.equal(hasDraftContent({title:'',body:'',source:''}),false);
  assert.equal(hasDraftContent({title:' ',body:'\n',source:''}),false);
  assert.equal(hasDraftContent({title:'Draft',body:'',source:''}),true);
  assert.equal(hasDraftContent({title:'',body:'text',source:''}),true);
  assert.equal(hasDraftContent({title:'',body:'',source:'https://example.org'}),true);
});

test('download shares exactly the same validated source as clipboard',()=>{
  const output=formatDraft(valid);
  assert.match(output,/Unpublished draft/);
  assert.ok(output.endsWith('24GOTOP static Draft Lab.'));
  assert.throws(()=>formatDraft({...valid,body:'short'}),/Write between/);
});


test('previously exported Markdown survives export → reopen without data loss', () => {
  for (const locale of LOCALES) {
    for (const category of CATEGORIES) {
      const original = { ...valid, locale, category,
        title: 'Writing secure articles · 試験 ทดสอบ тест',
        body: 'A long reproducible text in several scripts.\n\nSecond paragraph: <script>alert(1)</script> plain text.' };
      const exported = formatDraft(original);
      const reopened = parseDraftFile(exported);
      assert.deepEqual(reopened, original);
      assert.equal(formatDraft(reopened), exported);
    }
  }
});

test('reopen old drafts without a source URL and handle UTF-8 BOM/Windows line endings', () => {
  const old = { ...valid, source: '' };
  assert.deepEqual(parseDraftFile(formatDraft(old)), old);
  const windows = '\uFEFF' + formatDraft(valid).replace(/\n/g, '\r\n') + '\r\n';
  assert.deepEqual(parseDraftFile(windows), valid);
});

test('saved article paragraphs that resemble metadata or end markers are preserved', () => {
  const original = { ...valid,
    body: 'Article body with embedded markers.\n\nLanguage: ru\nCategory: models\n\n---\nUnpublished draft · Generated in the 24GOTOP static Draft Lab.\n\nActual ending.' };
  const imported = parseDraftFile(formatDraft(original));
  assert.deepEqual(imported, original);
});

test('reject arbitrary Markdown, malformed metadata, oversized files and dangerous URLs', () => {
  for (const value of [
    '# Arbitrary article\n\nThis is not our export',
    formatDraft(valid).replace('Language: en', 'Language: unknown'),
    formatDraft(valid).replace('Category: guides', 'Category: malware'),
    formatDraft(valid).replace('https://example.org/research', 'javascript:alert(1)'),
    formatDraft(valid).replace('Unpublished draft · Generated in the 24GOTOP static Draft Lab.', 'Unknown producer'),
    formatDraft(valid).replace('Language: en', 'Language: en\nAuthor: admin'),
    'x'.repeat(MAX_DRAFT_FILE_BYTES + 1)
  ]) {
    assert.throws(() => parseDraftFile(value), TypeError);
  }
  assert.throws(() => parseDraftFile(null), TypeError);
  assert.equal(MAX_DRAFT_FILE_BYTES, 65536);
});

test('importer keeps HTML-like content literal and does not sanitize away the author text', () => {
  const text = '<img src=x onerror="alert(1)"> is a literal example of a risky HTML fragment.\nIt must never execute.';
  const original = { ...valid, body: text };
  const imported = parseDraftFile(formatDraft(original));
  assert.equal(imported.body, text);
});
