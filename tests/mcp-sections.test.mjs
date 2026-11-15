import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {indexPublishedArticleSections,slicePublishedSection}
 from '../packages/mcp/sections.mjs';

const reviewed=readFileSync(new URL(
 '../site/engineering/read-only-mcp-server-for-technical-articles.html',import.meta.url),'utf8');

test('public section scanner excludes unlinked related-reading headings',()=>{
 const list=indexPublishedArticleSections(reviewed);
 assert.ok(list.length>=5);
 assert.ok(Object.isFrozen(list));
 assert.ok(list.every(x=>Object.isFrozen(x)));
 assert.ok(list.every(x=>x.id.startsWith('section-')));
 assert.ok(list.every(x=>x.text.length>0));
 assert.equal(list.some(x=>x.title==='Continue reading'),false);
 assert.equal(list.at(-1).text.includes('Continue reading'),false);
 assert.deepEqual(list.map(x=>x.position),list.map((_,i)=>i+1));
});

test('section parser preserves exact public anchor labels and handles entities',()=>{
 const fixture='<article class="article">'+
  '<h2 id="section-alpha">Alpha &amp; Beta</h2>'+
  '<p>Text &lt;script&gt;ignored&lt;/script&gt; and 🌍.</p>'+
  '<h3 id="section-beta">Second</h3><p>Second &quot;quoted&quot; paragraph.</p>'+
  '<h2>Continue reading</h2><a href="https://example.org/">Related note</a>'+
  '</article>';
 const sections=indexPublishedArticleSections(fixture);
 assert.deepEqual(sections.map(s=>[s.id,s.title,s.level,s.position]),[
  ['section-alpha','Alpha & Beta',2,1],
  ['section-beta','Second',3,2]
 ]);
 assert.ok(sections[0].text.includes('<script>ignored</script>'));
 assert.equal(sections[1].text,'Second "quoted" paragraph.');
 assert.equal(sections[1].text.includes('Related note'),false);
});

test('section excerpts count Unicode code points and expose honest truncation',()=>{
 const section={text:'🚀'.repeat(230)+' КОНЕЦ'};
 const first=slicePublishedSection(section,{offset:0,maxChars:200});
 assert.equal(Array.from(first.text).length,200);
 assert.equal(first.nextOffset,200);
 assert.equal(first.truncated,true);
 const last=slicePublishedSection(section,{offset:200,maxChars:200});
 assert.ok(last.text.startsWith('🚀'));
 assert.ok(last.text.endsWith('КОНЕЦ'));
 assert.equal(last.nextOffset,null);
 assert.equal(last.truncated,false);
 const empty=slicePublishedSection(section,{offset:first.totalCharacters,maxChars:200});
 assert.equal(empty.text,'');
 assert.equal(empty.nextOffset,null);
});

test('malformed oversized HTML and impossible section offsets fail closed',()=>{
 for(const source of [null,{},'',new Array(130000).join('x'),'just text']){
  assert.throws(()=>indexPublishedArticleSections(source),TypeError);
 }
 const duplicate='<article class="article">'+
  '<h2 id="section-x">First</h2><p>A</p>'+
  '<h3 id="section-x">Second</h3><p>B</p></article>';
 assert.throws(()=>indexPublishedArticleSections(duplicate),TypeError);
 const source={text:'simple technical content'};
 for(const range of [{offset:-1},{offset:10000},{offset:1.5},
  {maxChars:199},{maxChars:4001},{maxChars:NaN}]){
  assert.throws(()=>slicePublishedSection(source,range),RangeError);
 }
});
