// Restricted Markdown block preview for the browser-only Draft Lab.
// This is intentionally not a full Markdown parser: unrecognized syntax stays literal.
// User content is inserted only with textContent, never interpreted as HTML.

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const CLOSE_FENCE = /^ {0,3}(`{3,}|~{3,})\s*$/;
const HEADING = /^ {0,3}(#{1,3})\s+(.+)$/;
const RULE = /^ {0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/;
const QUOTE = /^ {0,3}> ?(.*)$/;
const LIST = /^ {0,3}([-*+]|\d+[.)])\s+(.+)$/;

// Limited user-authored citation links. Never interpret raw HTML or image Markdown.
const CITATION=/\[([^\[\]\n]{1,200})\]\((https?:\/\/[^<>\s()\\]{1,1500})\)/g;
export function safeCitationUrl(raw){
 if(typeof raw!=='string'||raw.length>1500)return null;
 try{
  const url=new URL(raw);
  return ['https:','http:'].includes(url.protocol)&&url.hostname&&
    !url.username&&!url.password&&url.href.length<=2048?url.href:null;
 }catch{return null;}
}
function setInline(node,text,doc){
 const parts=[];
 let offset=0,hasLink=false;
 for(const match of text.matchAll(CITATION)){
  const safe=safeCitationUrl(match[2]);
  if(!safe)continue;
  if(match.index>offset)parts.push(doc.createTextNode(text.slice(offset,match.index)));
  const link=doc.createElement('a');
  link.textContent=match[1];
  link.setAttribute('href',safe);
  link.setAttribute('rel','noopener noreferrer ugc');
  link.setAttribute('target','_blank');
  link.setAttribute('referrerpolicy','no-referrer');
  parts.push(link);
  offset=match.index+match[0].length;
  hasLink=true;
 }
 if(!hasLink){node.textContent=text;return;}
 if(offset<text.length)parts.push(doc.createTextNode(text.slice(offset)));
 node.append(...parts);
}

function startsBlock(line) {
  return FENCE.test(line) || HEADING.test(line) || RULE.test(line)
    || QUOTE.test(line) || LIST.test(line);
}

export function parsePreviewBlocks(input) {
  if (typeof input !== 'string') throw new TypeError('Expected draft text');
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }

    const fence = line.match(FENCE);
    if (fence) {
      const marker = fence[1][0];
      const length = fence[1].length;
      const requestedLanguage = fence[2].trim();
      const language = /^[\w.+#-]{1,32}$/.test(requestedLanguage) ? requestedLanguage : '';
      const codeLines = [];
      index++;
      while (index < lines.length) {
        const closing = lines[index].match(CLOSE_FENCE);
        if (closing && closing[1][0] === marker && closing[1].length >= length) {
          index++;
          break;
        }
        codeLines.push(lines[index++]);
      }
      blocks.push({ type: 'code', language, text: codeLines.join('\n') });
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: 'rule' });
      index++;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      index++;
      continue;
    }

    if (QUOTE.test(line)) {
      const quoteLines = [];
      while (index < lines.length && QUOTE.test(lines[index])) {
        quoteLines.push(lines[index++].match(QUOTE)[1]);
      }
      blocks.push({ type: 'quote', text: quoteLines.join('\n') });
      continue;
    }

    const firstItem = line.match(LIST);
    if (firstItem) {
      const ordered = /^\d/.test(firstItem[1]);
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(LIST);
        if (!item || /^\d/.test(item[1]) !== ordered) break;
        items.push(item[2]);
        index++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim()
      && (paragraph.length === 0 || !startsBlock(lines[index]))) {
      paragraph.push(lines[index++].trim());
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

export function renderMarkdownPreview(container, markdown, doc = document) {
  if (!container || typeof container.replaceChildren !== 'function'
    || !doc || typeof doc.createElement !== 'function') {
    throw new TypeError('A DOM container and document are required');
  }
  const nodes = [];
  let headingIndex=0;
  for (const block of parsePreviewBlocks(markdown)) {
    let node;
    switch (block.type) {
      case 'heading':
        // The article title is already an H3; keep a meaningful heading hierarchy.
        node = doc.createElement('h' + (block.level + 3));
        // Static generated IDs, never derived from untrusted heading text.
        node.id='draft-section-'+(++headingIndex);
        setInline(node,block.text,doc);
        break;
      case 'rule':
        node = doc.createElement('hr');
        break;
      case 'quote':
        node = doc.createElement('blockquote');
        setInline(node,block.text,doc);
        break;
      case 'list':
        node = doc.createElement(block.ordered ? 'ol' : 'ul');
        for (const item of block.items) {
          const li = doc.createElement('li');
          setInline(li,item,doc);
          node.append(li);
        }
        break;
      case 'code': {
        node = doc.createElement('pre');
        const code = doc.createElement('code');
        code.textContent = block.text;
        node.append(code);
        break;
      }
      default:
        node = doc.createElement('p');
        setInline(node,block.text,doc);
    }
    nodes.push(node);
  }
  container.replaceChildren(...nodes);
}

/**
 * A read-only accessible outline of the *same* supported headings as preview.
 * Links point to generated local DOM IDs. Raw author text is never HTML.
 * No network, browser storage, automatic save or publication.
 */
export function renderPreviewOutline(container,markdown,doc=document) {
 if(!container || typeof container.replaceChildren!=='function' ||
   !doc || typeof doc.createElement!=='function')throw new TypeError('Outline DOM required');
 const headings=parsePreviewBlocks(markdown).filter(block=>block.type==='heading');
 if(!headings.length){container.replaceChildren();return 0;}
 const list=doc.createElement('ol');
 headings.forEach((block,index)=>{
  const item=doc.createElement('li');
  item.className='outline-level-'+block.level;
  const link=doc.createElement('a');
  link.setAttribute('href','#draft-section-'+(index+1));
  link.textContent=block.text;
  item.append(link);
  list.append(item);
 });
 container.replaceChildren(list);
 return headings.length;
}
