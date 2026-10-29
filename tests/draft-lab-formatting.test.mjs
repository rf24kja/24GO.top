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
