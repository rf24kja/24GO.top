// Progressive enhancement for reviewed PUBLIC editorial pages only.
// No network requests, storage, tracking, credentials, AI, publication or writes.
const CANONICAL=/^https:\/\/24go\.top\/engineering\/[a-z0-9-]+\.html$/;
const SECTION=/^section-[a-z0-9-]+$/;
const plain=text=>typeof text==='string'&&text.length>0&&text.length<=250&&
  !/[\u0000-\u001f\u007f\u2028\u2029]/u.test(text)&&!!text.trim();
const safeTitle=text=>text.replace(/[[\]\\]/g,'\\$&');
const safeBib=text=>text.replace(/[{}\\]/g,' ').replace(/\s+/g,' ').trim();

/** Canonical metadata from the already reviewed, static Article JSON-LD. */
export function validatedReaderMetadata(json,canonical,visibleTitle){
 if(!json||json['@context']!=='https://schema.org'||json['@type']!=='Article'||
    typeof canonical!=='string'||!CANONICAL.test(canonical)||
    json.mainEntityOfPage?.['@id']!==canonical||
    !plain(json.headline)||json.headline!==visibleTitle||
    !plain(json.author?.name)||json.author.name.length>120||
    !['Person','Organization'].includes(json.author?.['@type'])||
    json.inLanguage!=='en'||typeof json.datePublished!=='string'||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d)$/.test(json.datePublished)||
    !Number.isFinite(Date.parse(json.datePublished))||
    new Date(json.datePublished.slice(0,10)+'T12:00:00Z').toISOString().slice(0,10)!==
      json.datePublished.slice(0,10)){
  throw new TypeError('Invalid public article metadata');
 }
 return Object.freeze({
  url:canonical,title:json.headline,author:json.author.name,
  date:json.datePublished.slice(0,10)
 });
}

/** A real reference to a public page, never a fake DOI or user article. */
export function articleCitations(meta){
 if(!meta||!CANONICAL.test(meta.url)||!plain(meta.title)||
    !plain(meta.author)||!/^\d{4}-\d\d-\d\d$/.test(meta.date))
  throw new TypeError('Invalid article reference');
 const slug=meta.url.slice('https://24go.top/engineering/'.length,-5);
 const author=safeBib(meta.author),title=safeBib(meta.title);
 return Object.freeze({
  markdown:'['+safeTitle(meta.title)+']('+meta.url+') — '+meta.author+' ('+meta.date+')',
  plain:meta.author+'. ('+meta.date+'). '+meta.title+'. 24GOTOP. '+meta.url,
  bibtex:'@online{24gotop-'+slug+',\n  author = {'+author+'},\n  title = {'+
    title+'},\n  date = {'+meta.date+'},\n  url = {'+meta.url+'}\n}'
 });
}

/**
 * Mount only on canonical reviewed article pages. Existing article HTML and
 * indexed prose remain untouched: additions are in a sibling before article.
 */
export function mountArticleReader(doc,view){
 const article=doc.querySelector('article.article');
 const main=article?.parentNode;
 const canonical=doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
 const scripts=doc.querySelectorAll('script[type="application/ld+json"]');
 if(!article||!main||!canonical||scripts.length!==1||
    doc.getElementById('article-reader-tools'))return false;
 let meta;
 try{
  const json=JSON.parse(scripts[0].textContent);
  const visible=article.querySelector('h1')?.textContent?.trim();
  meta=validatedReaderMetadata(json,canonical,visible);
 }catch{return false;}
 const headers=[...article.querySelectorAll('h2[id],h3[id]')];
 const ids=new Set();
 if(!headers.length||headers.length>50||headers.some(node=>{
  const id=node.getAttribute('id');
  if(!SECTION.test(id)||ids.has(id))return true;
  ids.add(id);return false;
 }))return false;
 const citations=articleCitations(meta);
 const create=(tag,cls,text)=>{
  const el=doc.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=text;
  return el;
 };
 const tools=create('section','article-reader');
 tools.id='article-reader-tools';
 tools.setAttribute('aria-label','Article navigation and references');
 const progress=create('progress','article-reader__progress');
 progress.max=100;progress.value=0;
 progress.setAttribute('aria-label','Article reading progress');
 tools.append(progress);
 const actions=create('div','article-reader__actions');
 const menu=create('details','article-reader__menu');
 const summary=create('summary','','On this page');
 menu.append(summary);
 const nav=create('nav','');
 nav.setAttribute('aria-label','Article sections');
 const ol=create('ol','article-reader__toc');
 for(const header of headers){
  const id=header.getAttribute('id');
  const label=header.textContent.trim().slice(0,200);
  const li=create('li',header.tagName.toLowerCase()==='h3'?'article-reader__sub':'');
  const anchor=create('a','',label);
  anchor.setAttribute('href','#'+id);
  li.append(anchor);ol.append(li);
  const link=create('button','article-reader__section','§');
  link.type='button';
  link.setAttribute('aria-label','Copy link to section: '+label);
  link.addEventListener('click',()=>copyText(meta.url+'#'+id));
  header.append(link);
 }
 nav.append(ol);menu.append(nav);actions.append(menu);
 const status=create('p','article-reader__status');
 status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 const manual=create('textarea','article-reader__manual');
 manual.readOnly=true;manual.hidden=true;
 manual.setAttribute('aria-label','Select and copy this public citation or section link manually');
 const copyText=async value=>{
  manual.hidden=true;
  try{
   if(!view.navigator?.clipboard?.writeText)throw Error('Clipboard unavailable');
   await view.navigator.clipboard.writeText(value);
   status.textContent='Copied to clipboard.';
  }catch{
   manual.value=value;
   manual.hidden=false;
   manual.focus();
   manual.select();
   status.textContent='Clipboard unavailable. The text is selected below for manual copying.';
  }
 };
 for(const [label,value] of [
  ['Copy Markdown citation',citations.markdown],
  ['Copy text reference',citations.plain],
  ['Copy BibTeX',citations.bibtex]]){
  const button=create('button','article-reader__button',label);
  button.type='button';
  button.addEventListener('click',()=>copyText(value));
  actions.append(button);
 }
 const print=create('button','article-reader__button','Print article');
 print.type='button';
 print.addEventListener('click',()=>{if(typeof view.print==='function')view.print();});
 actions.append(print);
 tools.append(actions,status,manual);
 main.insertBefore(tools,article);
 // Scroll progress is a transient in-page visualization. No persistence.
 const update=()=>{
  const viewport=Number(view.innerHeight)||800;
  const start=article.getBoundingClientRect().top+(Number(view.scrollY)||0);
  const height=article.getBoundingClientRect().height;
  const end=Math.max(1,height-viewport*.65);
  const consumed=Math.max(0,(Number(view.scrollY)||0)-start+viewport*.15);
  progress.value=Math.min(100,Math.max(0,Math.round(consumed/end*100)));
 };
 view.addEventListener?.('scroll',update,{passive:true});
 view.addEventListener?.('resize',update);
 update();
 return true;
}
if(typeof document!=='undefined'&&typeof window!=='undefined')
 mountArticleReader(document,window);
