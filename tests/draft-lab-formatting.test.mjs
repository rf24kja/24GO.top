import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDraftSelection,countDraftWords} from '../site/draft-lab-logic.js';
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
