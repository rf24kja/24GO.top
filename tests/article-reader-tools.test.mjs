import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {articleCitations,validatedReaderMetadata,mountArticleReader,
 validatedPublicReadingList,PUBLIC_READING_LIST_KEY,PUBLIC_READING_FILES}
 from '../site/engineering/article-reader.mjs';

const dir=new URL('../site/engineering/',import.meta.url);
const articles=readdirSync(dir).filter(x=>x.endsWith('.html')&&x!=='index.html').sort();
const parse=file=>{
 const html=readFileSync(new URL(file,dir),'utf8');
 const json=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 return {html,json,url:'https://24go.top/engineering/'+file};
};

test('every canonical original published article has stable deep links and an opt-in reader enhancement',()=>{
 assert.equal(articles.length,10);
 for(const file of articles){
  const {html,json,url}=parse(file);
  const heading=html.match(/<h1>([^<]+)<\/h1>/)?.[1];
  const meta=validatedReaderMetadata(json,url,heading);
  assert.equal(meta.url,url);
  const sectionIds=[...html.matchAll(/<h[23] id="(section-[a-z0-9-]+)">/g)].map(x=>x[1]);
  assert.ok(sectionIds.length>=3,file);
  assert.equal(new Set(sectionIds).size,sectionIds.length,file);
  assert.match(html,/<script type="module" src="\.\/article-reader\.mjs"><\/script>/);
  assert.ok(!html.includes('data-hosted-publish-enabled'));
  const citations=articleCitations(meta);
  assert.match(citations.markdown,/^.+\]\(https:\/\/24go\.top\/engineering\/[a-z0-9-]+\.html\) — /);
  assert.ok(citations.plain.includes(meta.title));
  assert.match(citations.bibtex,/^@online\{24gotop-[a-z0-9-]+,/);
  assert.ok(citations.bibtex.includes('date = {'+meta.date+'}'));
  assert.ok(citations.bibtex.includes('url = {'+url+'}'));
 }
});

test('untrusted or inconsistent metadata cannot produce an authoritative citation',()=>{
 const {json,url}=parse(articles[0]);
 const ok=()=>validatedReaderMetadata(json,url,json.headline);
 assert.ok(ok());
 for(const bad of [
  [{...json,headline:'Forged title'},url,json.headline],
  [{...json,mainEntityOfPage:{'@id':'https://external.example'}},url,json.headline],
  [{...json,author:{name:'Unknown','@type':'Bot'}},url,json.headline],
  [{...json,datePublished:'invalid'},url,json.headline],
  [{...json,inLanguage:'other'},url,json.headline],
  [json,'https://evil.example/article.html',json.headline],
  [json,url+'?token=secret',json.headline],
  [json,url,'Different heading']
 ]){
  assert.throws(()=>validatedReaderMetadata(...bad),TypeError);
 }
 assert.throws(()=>articleCitations({url:'https://evil.example/',title:'x',author:'y',date:'2026-11-01'}),TypeError);
});

test('citation helpers escape Markdown and BibTeX syntax without injecting external URLs',()=>{
 const x=articleCitations({
  url:'https://24go.top/engineering/markdown-preview-safety.html',
  title:'[Draft] {XSS} \\ caution',author:'24GOTOP {Engineering}',
  date:'2026-10-31'
 });
 assert.match(x.markdown,/\\\[Draft\\\]/);
 assert.ok(x.plain.includes('Draft'));
 assert.doesNotMatch(x.bibtex,/author = \{24GOTOP \{Engineering\}\}/);
 assert.ok(x.bibtex.includes('title = {'));
});

function el(tag,text=''){
 const node={
  tagName:tag.toUpperCase(),textContent:text,children:[],attributes:{},listeners:{},
  id:null,className:'',hidden:false,clicked:false,focused:false,selected:false,
  setAttribute(k,v){this.attributes[k]=v;},
  getAttribute(k){return this.attributes[k]??null;},
  append(...items){this.children.push(...items);},
  addEventListener(event,fn){this.listeners[event]=fn;},
  focus(){this.focused=true;},
  select(){this.selected=true;}
 };
 return node;
}
function stub({clipboard=true,malformed=false,codeText='const result = "<script>alert(1)</script>";',
 storageAccess=true,storageWritable=true,storedRaw=null}={}){
 const canonical='https://24go.top/engineering/markdown-preview-safety.html';
 const json={
  '@context':'https://schema.org','@type':'Article',
  headline:'A safe technical guide',inLanguage:'en',
  datePublished:'2026-10-31T08:00:00Z',
  author:{'@type':'Organization',name:'24GOTOP Engineering'},
  mainEntityOfPage:{'@id':canonical}
 };
 const h1=el('h1',json.headline);
 const headings=[el('h2','Reproducible steps'),el('h3','Strict UTF-8')];
 headings[0].attributes.id='section-reproducible-steps';
 headings[1].attributes.id='section-strict-utf-8';
 const article=el('article');
 const pre=el('pre'),code=el('code',codeText);
 const codeParent={inserted:[],insertBefore(node,target){
  if(target!==pre)throw Error('Wrong code block');
  this.inserted.push(node);
 }};
 pre.parentNode=codeParent;
 code.parentNode=pre;
 article.querySelector=selector=>selector==='h1'?h1:null;
 article.querySelectorAll=selector=>selector==='h2[id],h3[id]'?headings:
  selector==='pre > code'?[code]:[];
 article.getBoundingClientRect=()=>({top:200-(Number(view.scrollY)||0),height:2400});
 const main={
  inserted:[],insertBefore(node,target){
   if(target!==article)throw Error('Wrong article');
   this.inserted.push(node);
  }
 };
 article.parentNode=main;
 const jsonScript=el('script',JSON.stringify({...json,...(malformed?{headline:'Fake'}:{})}));
 const metaLink={getAttribute(k){return k==='href'?canonical:null;}};
 const doc={
  createElement:tag=>el(tag),
  getElementById:id=>id==='article-reader-tools'?main.inserted[0]??null:null,
  querySelector:s=>s==='article.article'?article:
   s==='link[rel="canonical"]'?metaLink:null,
  querySelectorAll:s=>s==='script[type="application/ld+json"]'?[jsonScript]:[]
 };
 const copied=[],listeners={},prints=[];
 const stored=new Map(),writes=[];
 if(storedRaw!==null)stored.set(PUBLIC_READING_LIST_KEY,storedRaw);
 const storage={
  getItem(key){return stored.get(key)??null;},
  setItem(key,value){
   if(!storageWritable)throw new Error('Storage quota denied');
   writes.push([key,value]);stored.set(key,value);
  }
 };
 const view={
  navigator:clipboard?{clipboard:{async writeText(v){copied.push(v);}}}:{},
  get localStorage(){if(!storageAccess)throw new Error('Storage blocked');return storage;},
  innerHeight:800,scrollY:0,
  addEventListener(event,fn){listeners[event]=fn;},
  print(){prints.push('print');}
 };
 return {doc,view,main,article,headings,listeners,copied,prints,code,pre,codeParent,storage,stored,writes};
}
test('render safe TOC and interactive citations without changing the reviewed article data',async()=>{
 const env=stub();
 assert.equal(mountArticleReader(env.doc,env.view),true);
 assert.equal(env.main.inserted.length,1);
 const tools=env.main.inserted[0];
 assert.equal(tools.id,'article-reader-tools');
 assert.equal(env.headings[0].children.length,1,'each source heading receives a section-link control');
 assert.equal(env.headings[0].textContent,'Reproducible steps','article text is not rewritten');
 const actions=tools.children[1];
 const toc=actions.children[0].children[1].children[0];
 assert.equal(toc.children.length,2);
 assert.equal(toc.children[0].children[0].attributes.href,'#section-reproducible-steps');
 assert.equal(toc.children[1].children[0].attributes.href,'#section-strict-utf-8');
 const buttons=actions.children.filter(x=>x.tagName==='BUTTON');
 assert.deepEqual(buttons.map(b=>b.textContent),
  ['Copy Markdown citation','Copy text reference','Copy BibTeX','Print article','Save for later']);
 await buttons[0].listeners.click();
 assert.equal(env.copied.length,1);
 assert.match(env.copied[0],/A safe technical guide/);
 await env.headings[0].children[0].listeners.click();
 assert.equal(env.copied[1],
  'https://24go.top/engineering/markdown-preview-safety.html#section-reproducible-steps');
 buttons[3].listeners.click();
 assert.equal(env.prints.length,1);
 env.view.scrollY=2300;env.listeners.scroll();
 assert.ok(tools.children[0].value>0);
 assert.equal(mountArticleReader(env.doc,env.view),false,'cannot mount twice');
});

test('denied clipboard reveals a selectable manual copy field, never sends a request',async()=>{
 const env=stub({clipboard:false});
 assert.equal(mountArticleReader(env.doc,env.view),true);
 const tools=env.main.inserted[0],actions=tools.children[1];
 await actions.children[1].listeners.click();
 const manual=tools.children[3];
 assert.equal(manual.hidden,false);
 assert.equal(manual.selected,true);
 assert.equal(manual.focused,true);
 assert.ok(manual.value.includes('https://24go.top/engineering/markdown-preview-safety.html'));
 assert.match(tools.children[2].textContent,/Clipboard unavailable/);
});

test('mismatched JSON-LD fails closed without a bogus reference UI',()=>{
 const env=stub({malformed:true});
 assert.equal(mountArticleReader(env.doc,env.view),false);
 assert.equal(env.main.inserted.length,0);
});

test('code copy preserves literal reviewed code and does not change the article',async()=>{
 const source='curl --header "X-Literal: <img src=x onerror=alert(1)>" \\n--data "{pass:true}"';
 const env=stub({codeText:source});
 assert.equal(mountArticleReader(env.doc,env.view),true);
 const [button]=env.codeParent.inserted;
 assert.equal(env.codeParent.inserted.length,1);
 assert.equal(button.tagName,'BUTTON');
 assert.equal(button.type,'button');
 assert.equal(button.textContent,'Copy code');
 assert.equal(button.attributes['aria-label'],'Copy this public code example');
 assert.equal(env.code.textContent,source);
 await button.listeners.click();
 assert.deepEqual(env.copied,[source]);
 assert.equal(env.code.textContent,source,'copying cannot rewrite the published code');
 assert.equal(env.main.inserted[0].children[2].textContent,'Copied to clipboard.');
});

test('code copy has a keyboard-selectable fallback when the browser denies clipboard',async()=>{
 const env=stub({clipboard:false,codeText:'const safe = true;'});
 assert.equal(mountArticleReader(env.doc,env.view),true);
 await env.codeParent.inserted[0].listeners.click();
 const tools=env.main.inserted[0];
 assert.equal(tools.children[3].value,'const safe = true;');
 assert.equal(tools.children[3].selected,true);
 assert.equal(tools.children[3].focused,true);
 assert.match(tools.children[2].textContent,/Clipboard unavailable/);
});

test('huge or empty code samples do not get a copy control or alter source',()=>{
 for(const input of ['', 'x'.repeat(8193)]){
  const env=stub({codeText:input});
  assert.equal(mountArticleReader(env.doc,env.view),true);
  assert.equal(env.codeParent.inserted.length,0);
  assert.equal(env.code.textContent,input);
 }
});

test('code-copy feature remains static, keyboard focusable and absent on printed pages',()=>{
 const css=readFileSync(new URL('../site/engineering/notes.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('../site/engineering/article-reader.mjs',import.meta.url),'utf8');
 assert.match(css,/\.article-reader__copy-code:focus-visible/);
 assert.match(css,/@media print\{[^}]*\.article-reader__copy-code\{display:none!important/);
 assert.match(js,/article\.querySelectorAll\('pre > code'\)/);
 assert.doesNotMatch(js,/fetch\(|sendBeacon|localStorage|sessionStorage|innerHTML|eval\(/);
});

test('article Save for later allowlist matches exactly the public archive cards',()=>{
 const html=readFileSync(new URL('index.html',dir),'utf8');
 const listed=[...html.matchAll(/data-note-file="([a-z0-9-]+\\.html)"/g)]
  .map(match=>match[1]);
 assert.equal(listed.length,10);
 assert.equal(new Set(listed).size,listed.length);
 assert.deepEqual([...PUBLIC_READING_FILES].sort(),listed.sort());
 assert.equal(PUBLIC_READING_LIST_KEY,'24gotop-public-reading-list-v1');
});

test('article page save and remove use the existing local reading list with no initial write',()=>{
 const env=stub();
 assert.equal(mountArticleReader(env.doc,env.view),true);
 const tools=env.main.inserted[0];
 const actions=tools.children[1],button=actions.children.at(-1);
 assert.deepEqual(env.writes,[]);
 assert.equal(button.textContent,'Save for later');
 assert.equal(button.type,'button');
 assert.equal(button.disabled,false);
 assert.equal(button.attributes['aria-pressed'],'false');
 assert.match(button.attributes['aria-label'],/Save A safe technical guide for later/);
 button.listeners.click();
 assert.equal(env.writes.length,1);
 assert.deepEqual(JSON.parse(env.stored.get(PUBLIC_READING_LIST_KEY)),{
  version:1,files:['markdown-preview-safety.html']
 });
 assert.equal(button.attributes['aria-pressed'],'true');
 assert.equal(button.textContent,'Remove from reading list');
 assert.match(tools.children[2].textContent,/Saved this public article/);
 assert.match(tools.children[4].textContent,/unencrypted/);
 button.listeners.click();
 assert.equal(button.attributes['aria-pressed'],'false');
 assert.deepEqual(JSON.parse(env.stored.get(PUBLIC_READING_LIST_KEY)),{
  version:1,files:[]
 });
 assert.equal(env.writes.length,2);
 assert.ok(!env.writes.some(([key])=>key!==PUBLIC_READING_LIST_KEY));
});

test('article-page button mirrors newer cross-tab saved changes without writes',()=>{
 const env=stub();
 assert.equal(mountArticleReader(env.doc,env.view),true);
 const button=env.main.inserted[0].children[1].children.at(-1);
 assert.equal(button.attributes['aria-pressed'],'false');
 env.stored.set(PUBLIC_READING_LIST_KEY,JSON.stringify({
  version:1,files:['markdown-preview-safety.html']
 }));
 env.listeners.storage({key:PUBLIC_READING_LIST_KEY,storageArea:env.storage});
 assert.equal(button.attributes['aria-pressed'],'true');
 assert.deepEqual(env.writes,[]);
 env.stored.set(PUBLIC_READING_LIST_KEY,JSON.stringify({version:1,files:[]}));
 env.listeners.storage({key:null,storageArea:env.storage});
 assert.equal(button.attributes['aria-pressed'],'false');
 env.listeners.storage({key:'unrelated',storageArea:env.storage});
 assert.deepEqual(env.writes,[]);
});

test('damaged or inaccessible browser list fails closed without overwriting bookmarks',()=>{
 for(const options of [
  {storedRaw:JSON.stringify({version:1,files:['unknown.html']})},
  {storedRaw:'{malformed'},
  {storageAccess:false}
 ]){
  const env=stub(options);
  assert.equal(mountArticleReader(env.doc,env.view),true);
  const button=env.main.inserted[0].children[1].children.at(-1);
  assert.equal(button.disabled,true);
  assert.equal(button.attributes['aria-pressed'],'false');
  button.listeners.click();
  assert.deepEqual(env.writes,[]);
  assert.match(env.main.inserted[0].children[2].textContent,/Cannot update/);
 }
 const readOnly=stub({storageWritable:false});
 assert.equal(mountArticleReader(readOnly.doc,readOnly.view),true);
 readOnly.main.inserted[0].children[1].children.at(-1).listeners.click();
 assert.deepEqual(readOnly.writes,[]);
 assert.match(readOnly.main.inserted[0].children[2].textContent,/Cannot update/);
});

test('public reading-list decoder accepts only the reviewed static corpus and bounded v1 schema',()=>{
 assert.deepEqual(validatedPublicReadingList(null),[]);
 const ok=JSON.stringify({version:1,files:['markdown-preview-safety.html']});
 assert.deepEqual(validatedPublicReadingList(ok),['markdown-preview-safety.html']);
 for(const raw of [
  'not json',
  JSON.stringify({version:2,files:[]}),
  JSON.stringify({version:1,files:['not-in-archive.html']}),
  JSON.stringify({version:1,files:['../secret.html']}),
  JSON.stringify({version:1,files:['markdown-preview-safety.html','markdown-preview-safety.html']}),
  JSON.stringify({version:1,files:'not an array'}),
  JSON.stringify({version:1,files:['markdown-preview-safety.html',1]}),
  'x'.repeat(16385)
 ])assert.throws(()=>validatedPublicReadingList(raw));
});

test('article saving is visibly local and source copy remains independent',()=>{
 const css=readFileSync(new URL('notes.css',dir),'utf8');
 assert.match(css,/\\.article-reader__local-note/);
 const env=stub({clipboard:false});
 assert.equal(mountArticleReader(env.doc,env.view),true);
 const tools=env.main.inserted[0];
 assert.match(tools.children[4].textContent,/Nothing is uploaded/);
 assert.equal(env.writes.length,0);
 tools.children[1].children.at(-1).listeners.click();
 assert.equal(env.writes.length,1);
 assert.equal(tools.children[3].hidden,true);
});
