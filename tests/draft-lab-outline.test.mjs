import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPreviewOutline,renderMarkdownPreview} from '../site/draft-lab-preview.js';

function createDocument(){
 const made=[];
 return {made,createElement(tag){
  const el={tag,children:[],textContent:'',attributes:{},id:'',className:'',
    append(...nodes){this.children.push(...nodes);},
    setAttribute(name,value){this.attributes[name]=value;}};
  made.push(el);return el;
 },createTextNode(text){return {tag:'#text',textContent:text}}};
}
function container(){return {children:[],replaceChildren(...nodes){this.children=nodes}};}

test('outline targets correspond to rendered headings in order, excluding fenced code',()=>{
 const doc=createDocument(),body=container(),nav=container();
 const markdown=[
  '# Overview',
  'A source-backed technical article.',
  '## Setup',
  '### Validate [safe](https://example.org)',
  '',
  '```md',
  '# Not a heading',
  '```',
  '## Results'
 ].join('\n');
 renderMarkdownPreview(body,markdown,doc);
 assert.equal(renderPreviewOutline(nav,markdown,doc),4);
 const rendered=body.children.filter(n=>['h4','h5','h6'].includes(n.tag));
 const list=nav.children[0];
 assert.equal(list.tag,'ol');
 const links=list.children.map(li=>li.children[0]);
 assert.deepEqual(links.map(x=>x.attributes.href),
  ['#draft-section-1','#draft-section-2','#draft-section-3','#draft-section-4']);
 assert.deepEqual(rendered.map(n=>n.id),links.map(x=>x.attributes.href.slice(1)));
 assert.deepEqual(list.children.map(x=>x.className),
  ['outline-level-1','outline-level-2','outline-level-3','outline-level-2']);
 assert.equal(links[2].textContent,'Validate [safe](https://example.org)');
 assert.ok(!links.some(x=>x.textContent==='Not a heading'));
});

test('heading text and HTML-like input stay inert, never used in IDs or markup',()=>{
 const doc=createDocument(),body=container(),nav=container();
 const markdown='# <img src=x onerror=alert(1)>\n\n## <script>alert(1)</script>';
 renderMarkdownPreview(body,markdown,doc);
 renderPreviewOutline(nav,markdown,doc);
 const links=nav.children[0].children.map(x=>x.children[0]);
 assert.deepEqual(links.map(x=>x.textContent),
  ['<img src=x onerror=alert(1)>','<script>alert(1)</script>']);
 assert.deepEqual(links.map(x=>x.attributes.href),
  ['#draft-section-1','#draft-section-2']);
 assert.ok(doc.made.every(x=>!('innerHTML' in x)));
 assert.ok(doc.made.every(x=>!['img','script','iframe','svg'].includes(x.tag)));
});

test('outline safely clears when no headings remain, rejects invalid DOM and text',()=>{
 const doc=createDocument(),nav=container();
 assert.equal(renderPreviewOutline(nav,'# First',doc),1);
 assert.equal(renderPreviewOutline(nav,'Only paragraph text.',doc),0);
 assert.equal(nav.children.length,0);
 assert.throws(()=>renderPreviewOutline(nav,null,doc),TypeError);
 assert.throws(()=>renderPreviewOutline(null,'# Section',doc),TypeError);
});

test('outline cannot navigate outside the preview, including attacker-controlled heading text',()=>{
 const doc=createDocument(),nav=container();
 renderPreviewOutline(nav,
  '## [external](https://example.org)\n## javascript:alert(1)\n## <a href=evil>',doc);
 const links=nav.children[0].children.map(x=>x.children[0]);
 assert.equal(links.length,3);
 assert.ok(links.every((x,i)=>x.attributes.href==='#draft-section-'+(i+1)));
 assert.ok(links.every(x=>!('target' in x.attributes)));
});
