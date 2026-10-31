import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {articleCitations,validatedReaderMetadata,mountArticleReader}
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
function stub({clipboard=true,malformed=false}={}){
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
 article.querySelector=selector=>selector==='h1'?h1:null;
 article.querySelectorAll=selector=>selector==='h2[id],h3[id]'?headings:[];
 article.getBoundingClientRect=()=>({top:200,height:2400});
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
 const view={
  navigator:clipboard?{clipboard:{async writeText(v){copied.push(v);}}}:{},
  innerHeight:800,scrollY:0,
  addEventListener(event,fn){listeners[event]=fn;},
  print(){prints.push('print');}
 };
 return {doc,view,main,article,headings,listeners,copied,prints};
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
  ['Copy Markdown citation','Copy text reference','Copy BibTeX','Print article']);
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
