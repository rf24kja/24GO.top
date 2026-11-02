import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDraftSelection,countDraftWords,findDraftText,replaceDraftFindMatch} from '../site/draft-lab-logic.js';
import {parsePreviewBlocks} from '../site/draft-lab-preview.js';
function apply(value,start,end,action){
 const edit=formatDraftSelection(value,start,end,action);
 return {value:value.slice(0,start)+edit.replacement+value.slice(end),edit};
}
test('selected text becomes safe headings, bullets and quotes',()=>{
 assert.equal(apply('Finding',0,7,'heading').value,'## Finding');
 assert.equal(apply('first\nsecond',0,12,'list').value,'- first\n- second');
 assert.equal(apply('one\ntwo',0,7,'quote').value,'> one\n> two');
 assert.equal(parsePreviewBlocks(apply('one\ntwo',0,7,'quote').value)[0].text,'one\ntwo');
});
test('code with embedded triple backticks cannot close its fence',()=>{
 const code='const x = "```";\n<img src=x onerror=alert(1)>';
 const {value}=apply(code,0,code.length,'code');
 assert.match(value,/^````\n/);
 assert.deepEqual(parsePreviewBlocks(value),[{type:'code',language:'',text:code}]);
});
test('empty selection leaves editable placeholder selected',()=>{
 const edit=formatDraftSelection('',0,0,'code');
 assert.equal(edit.replacement,'```\n// your code\n```');
 assert.equal(edit.selectionEnd-edit.selectionStart,'// your code'.length);
 assert.equal(formatDraftSelection('',0,0,'heading').selectionStart,3);
});
test('refuse invalid selection, multiline heading, and overflow',()=>{
 for(const args of [['text',-1,1,'code'],['text',0,5,'list'],
 ['text',3,2,'quote'],['text',0,0,'html'],[null,0,0,'code'],['text',0.1,2,'list']])
 assert.throws(()=>formatDraftSelection(...args),TypeError);
 assert.throws(()=>formatDraftSelection('one\ntwo',0,7,'heading'),TypeError);
 assert.throws(()=>formatDraftSelection('x'.repeat(12000),12000,12000,'code'),RangeError);
});

test('Link tool inserts bounded Markdown citations with selected URL placeholder',()=>{
 const selection='API docs';
 const edit=formatDraftSelection(selection,0,selection.length,'link');
 assert.equal(edit.replacement,'[API docs](https://example.org)');
 assert.equal(edit.replacement.slice(edit.selectionStart,edit.selectionEnd),'https://example.org');
 const empty=formatDraftSelection('',0,0,'link');
 assert.equal(empty.replacement,'[documentation](https://example.org)');
 assert.equal(empty.replacement.slice(empty.selectionStart,empty.selectionEnd),'https://example.org');
 for(const text of ['hello\\nworld'.replace('\\n','\n'),'[not flat]','x'.repeat(201)]){
  assert.throws(()=>formatDraftSelection(text,0,text.length,'link'),TypeError);
 }
 assert.throws(()=>formatDraftSelection('a'.repeat(12000),12000,12000,'link'),RangeError);
});

test('Link tool prefers a safe original source, with Markdown-safe parentheses',()=>{
 const body='Technical API reference';
 const source='https://example.org/reference(v2)?mode=read#proof';
 const edit=formatDraftSelection(body,0,body.length,'link',source);
 assert.equal(edit.replacement,
  '[Technical API reference](https://example.org/reference%28v2%29?mode=read#proof)');
 assert.equal(edit.selectionStart,edit.replacement.length);
 assert.equal(edit.selectionEnd,edit.replacement.length,
  'do not preselect a real citation URL for accidental overwrite');
 const empty=formatDraftSelection('',0,0,'link',source);
 assert.equal(empty.replacement,
  '[documentation](https://example.org/reference%28v2%29?mode=read#proof)');
 assert.equal(empty.replacement.slice(empty.selectionStart,empty.selectionEnd),'documentation');
 const noSource=formatDraftSelection('Docs',0,4,'link','');
 assert.equal(noSource.replacement,'[Docs](https://example.org)');
 assert.equal(noSource.replacement.slice(noSource.selectionStart,noSource.selectionEnd),'https://example.org');
});

test('Link tool rejects unsafe or preview-incompatible original sources',()=>{
 const bad=[
  'javascript:alert(1)',
  'data:text/html,<script>',
  'https://user:secret@example.org/research',
  String.raw`https://example.org/path\\another`,
  ' https://example.org/research',
  'https://example.org/'+'x'.repeat(1500)
 ];
 for(const source of bad)
  assert.throws(()=>formatDraftSelection('Evidence',0,8,'link',source),TypeError,
   'invalid source must not be inserted into generated Markdown');
});

test('Table toolbar inserts an editable bounded Markdown table, locally',()=>{
 const initial=apply('',0,0,'table');
 assert.equal(initial.value,'| Column | Value |\n| --- | --- |\n| Example | 123 |');
 assert.equal(initial.value.slice(initial.edit.selectionStart,initial.edit.selectionEnd),'Column');
 const named=apply('Status',0,6,'table');
 assert.equal(named.value,'| Status | Value |\n| --- | --- |\n| Example | 123 |');
 assert.equal(named.value.slice(named.edit.selectionStart,named.edit.selectionEnd),'Status');
 assert.deepEqual(parsePreviewBlocks(named.value),[
  {type:'table',headers:['Status','Value'],align:['left','left'],rows:[['Example','123']]}
 ]);
 for(const bad of ['x|y','first\nsecond','x'.repeat(121)]){
  assert.throws(()=>apply(bad,0,bad.length,'table'),TypeError);
 }
 assert.throws(()=>formatDraftSelection('x'.repeat(12000),12000,12000,'table'),RangeError);
});

test('selected and placeholder inline formatting works without a rich-text editor',()=>{
 for(const [action,expected] of [
  ['bold','**technical writing**'],
  ['italic','*technical writing*'],
  ['inlineCode','`technical writing`']
 ]){
  const result=apply('technical writing',0,17,action);
  assert.equal(result.value,expected);
  const blank=apply('',0,0,action);
  assert.ok(blank.edit.selectionEnd>blank.edit.selectionStart);
  assert.equal(blank.value.slice(blank.edit.selectionStart,blank.edit.selectionEnd),
    action==='bold'?'bold text':action==='italic'?'italic text':'inline code');
 }
 assert.throws(()=>apply('a\nb',0,3,'bold'),TypeError);
 assert.throws(()=>apply('hello*',0,6,'italic'),TypeError);
 assert.throws(()=>apply('a`b',0,3,'inlineCode'),TypeError);
});


test('numbered Markdown formatter creates readable multi-line article steps',()=>{
 const source='Prepare database\nValidate signed JWT\nPublish 中文 article';
 const {value}=apply(source,0,source.length,'orderedList');
 assert.equal(value,'1. Prepare database\n2. Validate signed JWT\n3. Publish 中文 article');
 assert.deepEqual(parsePreviewBlocks(value),[{
  type:'list',ordered:true,
  items:['Prepare database','Validate signed JWT','Publish 中文 article']
 }]);
 const empty=apply('',0,0,'orderedList');
 assert.equal(empty.value,'1. List item');
 assert.equal(empty.value.slice(empty.edit.selectionStart,empty.edit.selectionEnd),'List item');
 assert.throws(()=>formatDraftSelection('x'.repeat(12000),12000,12000,'orderedList'),RangeError);
});

test('word meter counts separated and unspaced writing without mutating the author article',()=>{
 assert.equal(countDraftWords(''),0);
 assert.equal(countDraftWords('\n  \t'),0);
 assert.equal(countDraftWords('PostgreSQL 17 builds.','en'),3);
 assert.equal(countDraftWords('Безопасная публикация статей','ru'),3);
 if(typeof Intl.Segmenter==='function'){
  assert.equal(countDraftWords('中文技术文章','zh'),3);
  assert.ok(countDraftWords('การเผยแพร่บทความ','th')>=2);
 }
 const markdown='## Stable Markdown\n\n- Source: https://example.org';
 assert.ok(countDraftWords(markdown,'en')>=3);
 assert.equal(markdown,'## Stable Markdown\n\n- Source: https://example.org');
 assert.equal(countDraftWords('two words','unexpected'),2);
 assert.throws(()=>countDraftWords(null),TypeError);
 assert.throws(()=>countDraftWords('x'.repeat(12001)),RangeError);
});

test('exact local manuscript search selects UTF-16 offsets and wraps both ways',()=>{
 const text='alpha beta alpha — 中文 🚀 alpha';
 assert.deepEqual({...findDraftText(text,'alpha',0,'next')},{start:0,end:5});
 assert.deepEqual({...findDraftText(text,'alpha',5,'next')},{start:11,end:16});
 assert.deepEqual({...findDraftText(text,'alpha',text.length,'next')},{start:0,end:5});
 assert.deepEqual({...findDraftText(text,'alpha',0,'previous')},{start:text.lastIndexOf('alpha'),end:text.length});
 assert.deepEqual({...findDraftText(text,'alpha',11,'previous')},{start:0,end:5});
 assert.deepEqual({...findDraftText(text,'中文 🚀',0,'next')},{start:19,end:24});
 assert.equal(findDraftText(text,'ALPHA',0,'next'),null,'search is deliberately case-sensitive');
 assert.equal(findDraftText(text,'not found',0,'next'),null);
});

test('local manuscript search rejects invalid direction, offsets and oversized inputs',()=>{
 const bad=[
  ['abc','',0,'next'],
  ['abc','x'.repeat(81),0,'next'],
  ['abc','a',-1,'next'],
  ['abc','a',4,'next'],
  ['abc','a',0,'replace'],
  ['a'.repeat(12001),'a',0,'next'],
  [null,'a',0,'next']
 ];
 for(const args of bad)assert.throws(()=>findDraftText(...args),TypeError);
});

test('explicit replace changes exactly one literal match and returns textarea offsets',()=>{
 const body='alpha BETA alpha';
 const replace=replaceDraftFindMatch(body,'alpha','beta',0,5);
 assert.deepEqual({...replace},{replacement:'beta',selectionStart:4,selectionEnd:4});
 const result=body.slice(0,0)+replace.replacement+body.slice(5);
 assert.equal(result,'beta BETA alpha');
 const erase=replaceDraftFindMatch(body,'alpha','',11,16);
 assert.deepEqual({...erase},{replacement:'',selectionStart:11,selectionEnd:11});
 assert.equal(body.slice(0,11)+erase.replacement+body.slice(16),'alpha BETA ');
 const unicode='Привет 🚀';
 const match=replaceDraftFindMatch(unicode,'🚀','🌍',7,9);
 assert.equal(unicode.slice(0,7)+match.replacement+unicode.slice(9),'Привет 🌍');
 assert.equal(match.selectionStart,9);
});

test('replace rejects stale selection and bounded overflow without writing',()=>{
 const body='cat dog cat';
 assert.equal(replaceDraftFindMatch(body,'cat','wolf',1,4),null);
 assert.equal(replaceDraftFindMatch(body,'cat','wolf',0,2),null);
 assert.equal(replaceDraftFindMatch(body,'CAT','wolf',0,3),null);
 assert.equal(replaceDraftFindMatch(body,'cat','wolf',7,10),null);
 for(const args of [
  [null,'cat','x',0,3],
  ['abc','', 'x',0,0],
  ['abc','a'.repeat(81),'x',0,3],
  ['abc','abc','x'.repeat(161),0,3],
  ['abc','abc','x',-1,3],
  ['abc','abc','x',0,4],
  ['abc','abc','x',0,0],
  ['abc','abc',null,0,3]
 ])assert.throws(()=>replaceDraftFindMatch(...args),TypeError);
 assert.throws(()=>replaceDraftFindMatch('a'.repeat(12000),'a','too long',0,1),
  RangeError);
});
