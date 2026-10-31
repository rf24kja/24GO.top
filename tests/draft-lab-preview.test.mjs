import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePreviewBlocks, renderMarkdownPreview, safeCitationUrl } from '../site/draft-lab-preview.js';

test('parses headings, paragraphs, lists, quotes and fenced code', () => {
  const article = [
    '# Overview',
    '',
    'A step-by-step engineering write-up.',
    'A second line.',
    '',
    '- First thing',
    '- Second thing',
    '',
    '1. Prepare',
    '2. Verify',
    '',
    '> Note one',
    '> Note two',
    '',
    '```js',
    'const ok = 1 < 2;',
    'console.log(ok);',
    '```',
    '',
    '---'
  ].join('\n');
  assert.deepEqual(parsePreviewBlocks(article), [
    {type:'heading',level:1,text:'Overview'},
    {type:'paragraph',text:'A step-by-step engineering write-up. A second line.'},
    {type:'list',ordered:false,items:['First thing','Second thing']},
    {type:'list',ordered:true,items:['Prepare','Verify']},
    {type:'quote',text:'Note one\nNote two'},
    {type:'code',language:'js',text:'const ok = 1 < 2;\nconsole.log(ok);'},
    {type:'rule'}
  ]);
});

test('unclosed fences are displayed as code and no content is silently dropped', () => {
  assert.deepEqual(parsePreviewBlocks('~~~python\nprint(1)\n<img onerror=alert(1)>'), [
    {type:'code',language:'python',text:'print(1)\n<img onerror=alert(1)>'}
  ]);
  assert.equal(parsePreviewBlocks(' \n\n').length,0);
  assert.throws(() => parsePreviewBlocks(null), TypeError);
});

test('renderer uses only fixed element names and textContent, never executable user HTML', () => {
  const created = [];
  const doc = {
    createElement(tag) {
      const node = {tag,children:[],textContent:'',append(...children){this.children.push(...children)}};
      created.push(node);
      return node;
    }
  };
  const container = {nodes:null, replaceChildren(...nodes){this.nodes=nodes}};
  const attack = [
    '# <img src=x onerror=alert(1)>',
    '',
    '<script>window.pwned=true</script>',
    '',
    '- <svg onload=alert(1)>',
    '',
    '```html',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '```'
  ].join('\n');
  renderMarkdownPreview(container, attack, doc);
  assert.deepEqual(container.nodes.map(node => node.tag), ['h4','p','ul','pre']);
  assert.deepEqual(created.map(node => node.tag), ['h4','p','ul','li','pre','code']);
  assert.equal(container.nodes[0].textContent,'<img src=x onerror=alert(1)>');
  assert.equal(container.nodes[1].textContent,'<script>window.pwned=true</script>');
  assert.equal(container.nodes[2].children[0].textContent,'<svg onload=alert(1)>');
  assert.match(container.nodes[3].children[0].textContent,/<iframe srcdoc=/);
  assert.ok(created.every(node => !('innerHTML' in node)));
});

test('displays author-controlled URLs and unsupported Markdown as plain text', () => {
  const blocks=parsePreviewBlocks('Read [unsafe](javascript:alert(1)) or **bold**.');
  assert.deepEqual(blocks,[{type:'paragraph',text:'Read [unsafe](javascript:alert(1)) or **bold**.'}]);
});

test('public Draft Lab preview shows safe HTTP(S) citation anchors without interpreting user HTML',()=>{
 const created=[];
 const doc={
  createElement(tag){
   const el={tag,textContent:'',attributes:{},children:[],
    append(...items){this.children.push(...items);},
    setAttribute(key,value){this.attributes[key]=value;}};
   created.push(el);return el;
  },
  createTextNode(value){return {tag:'#text',textContent:value};}
 };
 const container={nodes:[],replaceChildren(...nodes){this.nodes=nodes;}};
 const tick=String.fromCharCode(96);
 const input=[
  'Read [Docs & <img onerror=evil()>](https://example.org/guide?a=1&b=2) now.',
  '',
  '- [API](http://example.net/api)',
  '',
  '> [Evidence](https://example.org/evidence)',
  '',
  tick.repeat(3)+'txt',
  '[not clickable](https://example.org)',
  tick.repeat(3)
 ].join('\n');
 renderMarkdownPreview(container,input,doc);
 assert.deepEqual(container.nodes.map(n=>n.tag),['p','ul','blockquote','pre']);
 const links=created.filter(n=>n.tag==='a');
 assert.equal(links.length,3);
 assert.equal(links[0].textContent,'Docs & <img onerror=evil()>');
 assert.deepEqual(links[0].attributes,{
  href:'https://example.org/guide?a=1&b=2',
  rel:'noopener noreferrer ugc',
  target:'_blank',
  referrerpolicy:'no-referrer'
 });
 assert.equal(container.nodes[0].children[0].textContent,'Read ');
 assert.equal(container.nodes[0].children.at(-1).textContent,' now.');
 assert.equal(container.nodes[3].children[0].textContent,'[not clickable](https://example.org)');
 assert.ok(created.every(n=>!('innerHTML' in n)));
});
test('malicious schemes and credential-bearing citations remain literal plaintext',()=>{
 assert.equal(safeCitationUrl('https://user:pass@example.org'),null);
 assert.equal(safeCitationUrl('javascript:alert(1)'),null);
 assert.equal(safeCitationUrl('https://example.org/path'),'https://example.org/path');
 const doc={
  createElement(tag){return {tag,children:[],textContent:'',
   append(...n){this.children.push(...n);},
   setAttribute(){throw new Error('No unsafe anchor should be created');}};},
  createTextNode(text){return {tag:'#text',textContent:text};}
 };
 const container={nodes:[],replaceChildren(...n){this.nodes=n;}};
 const input='[not allowed](javascript:alert(1)) and '+
  '[credentials](https://name:pass@example.org/x) and '+
  '[bad label](data:text/html,foo)';
 renderMarkdownPreview(container,input,doc);
 assert.equal(container.nodes.length,1);
 assert.equal(container.nodes[0].textContent,input);
});


test('indented Markdown code remains code instead of a paragraph, with its inner whitespace', () => {
 const input = [
  '',
  '    const token = "<script>not executed</script>";  ',
  '        console.log(token);',
  '',
  '    // Second block line after deliberate blank line',
  '',
  'Plain paragraph after code.',
  '',
  '\tfunction tabIndented() { return true; }',
  '',
  '## Visible section'
 ].join('\n');
 const blocks = parsePreviewBlocks(input);
 assert.deepEqual(blocks,[
  {type:'code',language:'',text:
    'const token = "<script>not executed</script>";  \n' +
    '    console.log(token);\n\n' +
    '// Second block line after deliberate blank line'},
  {type:'paragraph',text:'Plain paragraph after code.'},
  {type:'code',language:'',text:'function tabIndented() { return true; }'},
  {type:'heading',level:2,text:'Visible section'}
 ]);
});

test('indented code preview is safe fixed PRE/CODE text, not interpreted markup',()=>{
 const documentMock={
  created:[],
  createElement(tag){
    const node={tag,textContent:'',children:[],append(...children){this.children.push(...children);}};
    this.created.push(node);
    return node;
  }
 };
 const container={nodes:[],replaceChildren(...nodes){this.nodes=nodes;}};
 renderMarkdownPreview(container,
  '    <img src=x onerror=alert(1)>\n    console.log("© 文档");',documentMock);
 assert.deepEqual(container.nodes.map(node=>node.tag),['pre']);
 assert.deepEqual(documentMock.created.map(node=>node.tag),['pre','code']);
 assert.equal(container.nodes[0].children[0].textContent,
  '<img src=x onerror=alert(1)>\nconsole.log("© 文档");');
 assert.ok(documentMock.created.every(node=>!('innerHTML' in node)));
});


test('bounded Markdown tables parse two language-safe columns, alignment and escaped pipes',()=>{
 const markdown=[
  'Intro paragraph.','',
  '| Field | Result |','| :--- | ---: |',
  '| PostgreSQL | 17 |','| escaped \\| pipe | <img onerror=evil()> |',
  '','After the table.'
 ].join('\n');
 assert.deepEqual(parsePreviewBlocks(markdown),[
  {type:'paragraph',text:'Intro paragraph.'},
  {type:'table',headers:['Field','Result'],align:['left','right'],
   rows:[['PostgreSQL','17'],['escaped | pipe','<img onerror=evil()>']]},
  {type:'paragraph',text:'After the table.'}
 ]);
 assert.deepEqual(parsePreviewBlocks('| Field | Result |\n| ------ | --- |\n| 中文 | ภาษาไทย |'),[
  {type:'table',headers:['Field','Result'],align:['left','left'],rows:[['中文','ภาษาไทย']]}
 ]);
});

test('invalid Markdown table syntax stays literal and code fences have priority',()=>{
 const invalid=['| One | Two |','| -- | --- |','| A | B |'].join('\n');
 assert.equal(parsePreviewBlocks(invalid).some(x=>x.type==='table'),false);
 const mark=String.fromCharCode(96).repeat(3);
 const fenced=mark+'md\n| A | B |\n| --- | --- |\n| x | y |\n'+mark;
 assert.deepEqual(parsePreviewBlocks(fenced),[{
  type:'code',language:'md',text:'| A | B |\n| --- | --- |\n| x | y |'
 }]);
 const mismatch='| A | B |\n| --- | --- |\n| only one |\nNext line';
 assert.deepEqual(parsePreviewBlocks(mismatch),[
  {type:'table',headers:['A','B'],align:['left','left'],rows:[]},
  {type:'paragraph',text:'| only one | Next line'}
 ]);
});

test('table preview renders semantic headers/cells without interpreting malicious markup',()=>{
 const nodes=[];
 const doc={
  createElement(tag){
   const node={tag,children:[],textContent:'',attributes:{},
    append(...children){this.children.push(...children);},
    setAttribute(key,value){this.attributes[key]=value;}};
   nodes.push(node);return node;
  },
  createTextNode(value){return {tag:'#text',textContent:value};}
 };
 const container={children:[],replaceChildren(...items){this.children=items;}};
 const article='| Payload | Details |\n| :---: | ---: |\n'+
  '| <script>alert(1)</script> | [Source](https://example.org/docs) |\n'+
  '| <img src=x onerror=evil()> | [bad](javascript:alert(1)) |';
 renderMarkdownPreview(container,article,doc);
 assert.deepEqual(container.children.map(x=>x.tag),['div']);
 const wrapper=container.children[0];
 assert.equal(wrapper.attributes.role,'region');
 assert.equal(wrapper.attributes.tabindex,'0');
 assert.equal(wrapper.children[0].tag,'table');
 assert.equal(wrapper.children[0].children[0].tag,'thead');
 assert.equal(wrapper.children[0].children[1].tag,'tbody');
 const header=wrapper.children[0].children[0].children[0].children;
 assert.equal(header[0].attributes.scope,'col');
 assert.equal(header[0].className,'table-align-center');
 assert.equal(header[1].className,'table-align-right');
 const rows=wrapper.children[0].children[1].children;
 assert.equal(rows.length,2);
 assert.equal(rows[0].children[0].textContent,'<script>alert(1)</script>');
 assert.equal(rows[1].children[0].textContent,'<img src=x onerror=evil()>');
 assert.equal(rows[1].children[1].textContent,'[bad](javascript:alert(1))');
 const link=nodes.find(x=>x.tag==='a');
 assert.equal(link.attributes.href,'https://example.org/docs');
 assert.equal(link.attributes.rel,'noopener noreferrer ugc');
 assert.ok(nodes.every(x=>!('innerHTML' in x)));
 assert.ok(nodes.every(x=>!['script','img','iframe'].includes(x.tag)));
});

test('inline Markdown preview renders semantic text safely, including code and citations',()=>{
 const created=[];
 const doc={
  createElement(tag){
   const el={tag,children:[],attributes:{},textContent:'',
    append(...children){this.children.push(...children)},
    setAttribute(k,v){this.attributes[k]=v}};
   created.push(el);return el;
  },
  createTextNode(value){return {tag:'#text',textContent:value}}
 };
 const container={nodes:[],replaceChildren(...nodes){this.nodes=nodes}};
 const raw='**strong** and *emphasis* and `<img src=x onerror=alert(1)>` and [Docs](https://example.org)';
 renderMarkdownPreview(container,raw,doc);
 assert.deepEqual(container.nodes.map(x=>x.tag),['p']);
 assert.deepEqual(container.nodes[0].children.filter(x=>x.tag!=='#text').map(x=>x.tag),
  ['strong','em','code','a']);
 const code=created.find(x=>x.tag==='code');
 assert.equal(code.textContent,'<img src=x onerror=alert(1)>');
 assert.ok(created.every(x=>!['script','iframe','img'].includes(x.tag)));
 assert.ok(created.every(x=>!('innerHTML' in x)));
});
