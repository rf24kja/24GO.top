import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePreviewBlocks, renderMarkdownPreview } from '../site/draft-lab-preview.js';

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
