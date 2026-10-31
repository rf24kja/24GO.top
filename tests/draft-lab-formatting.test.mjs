import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDraftSelection} from '../site/draft-lab-logic.js';
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
