// Browser-driven test of the actual PUBLIC Draft Lab JavaScript and CSS.
// Runs entirely against loopback on a fresh headless Chromium profile.
// Nothing reaches hosted Core, production drafts or external endpoints.
import {createServer} from 'node:http';
import {readFile,rm} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChromium} from './chromium-startup.mjs';
import {UI_LOCALES,UI_STRINGS} from '../site/draft-lab-i18n.js';

const ROOT=resolve(fileURLToPath(new URL('../site/',import.meta.url)));
const MIME={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',
 js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',
 svg:'image/svg+xml',ico:'image/x-icon',png:'image/png',json:'application/json; charset=utf-8'};
function localServer(){
 return createServer(async(req,res)=>{
  try{
   if(req.method!=='GET'){res.writeHead(405).end();return;}
   const pathname=new URL(req.url,'http://localhost').pathname;
   const page=pathname==='/'?'/index.html':pathname.endsWith('/')?pathname+'index.html':pathname;
   const path=resolve(ROOT,'.'+page);
   if(!path.startsWith(ROOT+sep)){res.writeHead(403).end();return;}
   const type=path.slice(path.lastIndexOf('.')+1);
   if(!Object.hasOwn(MIME,type)){res.writeHead(415).end();return;}
   const body=await readFile(path);
   res.writeHead(200,{'content-type':MIME[type],'cache-control':'no-store'});
   res.end(body);
  }catch{res.writeHead(404).end();}
 });
}
const chromium=()=>launchChromium({profilePrefix:'24gotop-draft-e2e-'});
class CDP{
 constructor(ws){
  this.ws=ws;this.id=0;this.pending=new Map();this.exceptions=[];this.external=[];
  ws.addEventListener('message',event=>{
   const m=JSON.parse(event.data);
   if(m.method==='Runtime.exceptionThrown')this.exceptions.push(m.params.exceptionDetails.text);
   if(m.method==='Network.requestWillBeSent' &&
      !m.params.request.url.startsWith('http://127.0.0.1:'))
    this.external.push(m.params.request.url);
   if(!m.id)return;
   const pending=this.pending.get(m.id);
   if(!pending)return;
   this.pending.delete(m.id);
   if(m.error)pending.reject(Error(m.error.message));
   else pending.resolve(m.result);
  });
 }
 send(method,params={},sessionId){
  return new Promise((resolve,reject)=>{
   const id=++this.id;
   const timeout=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timeout: '+method));},18000);
   this.pending.set(id,{resolve:v=>{clearTimeout(timeout);resolve(v);},
    reject:e=>{clearTimeout(timeout);reject(e);}});
   this.ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
 }
 async call(fn,sessionId,...args){
  const expr='('+fn.toString()+')('+args.map(x=>JSON.stringify(x)).join(',')+')';
  const r=await this.send('Runtime.evaluate',
   {expression:expr,awaitPromise:true,returnByValue:true},sessionId);
  if(r.exceptionDetails)throw Error('Browser threw: '+r.exceptionDetails.text);
  return r.result?.value;
 }
}
function exerciseEditor(){
 function inspectError(id){
 const field=document.getElementById(id),e=document.getElementById(id+'Error');
 return {invalid:field.getAttribute('aria-invalid'),
  desc:field.getAttribute('aria-describedby'),
  msg:field.getAttribute('aria-errormessage'),
  visible:!e.hidden,text:e.textContent,focused:document.activeElement===field};
}

 const $=id=>document.getElementById(id);
 const save=()=>$('downloadDraft').click();
 const set=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new Event('input',{bubbles:true}));};
 save();
 const title=inspectError('postTitle');
 set('postTitle','Real technical guide about safe and accessible publishing');
 const titleCleared=inspectError('postTitle');
 save();
 const body=inspectError('postBody');
 set('postBody','A reproducible technical demonstration of the user flow, including expected errors, browser behavior and limits.');
 const bodyCleared=inspectError('postBody');
 set('postSource','javascript:alert(1)');
 save();
 const source=inspectError('postSource');
 return {title,titleCleared,body,bodyCleared,source,draft:$('postBody').value,
  locale:$('uiLocale').value,storage:localStorage.length,
  width:document.documentElement.clientWidth,
  scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
  offenders:[...document.body.querySelectorAll('*')].map(el=>{
   const r=el.getBoundingClientRect();
   return {tag:el.tagName.toLowerCase(),className:typeof el.className==='string'?el.className:'',
    id:el.id,left:Math.round(r.left),right:Math.round(r.right)};
  }).filter(x=>x.right>document.documentElement.clientWidth+1&&x.left<document.documentElement.clientWidth).slice(0,15)};
}
function switchLanguage(locale){
 const $=id=>document.getElementById(id);
 $('uiLocale').value=locale;
 $('uiLocale').dispatchEvent(new Event('change',{bubbles:true}));
 return {value:$('uiLocale').value,text:$('postSourceError').textContent,
  visible:!$('postSourceError').hidden,
  invalid:$('postSource').getAttribute('aria-invalid'),
  draft:$('postBody').value,
  width:document.documentElement.clientWidth,
  scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
  offenders:[...document.body.querySelectorAll('*')].map(el=>{
   const r=el.getBoundingClientRect();return {tag:el.tagName.toLowerCase(),id:el.id,cls:typeof el.className==='string'?el.className:'',left:Math.round(r.left),right:Math.round(r.right)};
  }).filter(x=>x.right>document.documentElement.clientWidth+1&&x.left<document.documentElement.clientWidth).slice(0,12),
  scrollContainers:[...document.body.querySelectorAll('*')].map(el=>{
   const r=el.getBoundingClientRect(),computed=getComputedStyle(el);
   return {tag:el.tagName.toLowerCase(),id:el.id,cls:typeof el.className==='string'?el.className:'',
    left:Math.round(r.left),right:Math.round(r.right),internal:el.scrollWidth,client:el.clientWidth,
    overflowX:computed.overflowX};
  }).filter(x=>x.client>0&&x.left+x.internal>document.documentElement.clientWidth+1&&
    x.internal>x.client+1&&x.left<document.documentElement.clientWidth).slice(0,16)};
}
function correctSource(){
 const input=document.getElementById('postSource');
 input.value='https://example.org/manual';
 input.dispatchEvent(new Event('input',{bubbles:true}));
 return {hidden:document.getElementById('postSourceError').hidden,
  invalid:input.getAttribute('aria-invalid'),
  aria:input.getAttribute('aria-errormessage')};
}
async function waitForEditor(){
 const limit=Date.now()+12000;
 while(Date.now()<limit){
  if(document.getElementById('savedBrowserDraft')?.options.length &&
   document.getElementById('uiLocale')?.value==='ru' &&
   document.querySelector('h1')?.textContent!=='Make knowledge worth sharing.')return true;
  await new Promise(ok=>setTimeout(ok,50));
 }
 throw Error('Editor module failed to initialize');
}

async function waitForArchive(){
 const limit=Date.now()+12000;
 while(Date.now()<limit){
  const form=document.querySelector('[data-engineering-search]');
  const count=document.getElementById('engineering-search-status')?.textContent;
  const index=document.getElementById('engineering-index-status')?.textContent||'';
  if(form&&!form.hidden&&count&&
    (index.includes('Full article text is searchable')||index.includes('Full-text search unavailable')))
   return true;
  await new Promise(done=>setTimeout(done,50));
 }
 throw Error('Engineering article search failed to initialize');
}
function exerciseArchive(){
 const f=id=>document.getElementById(id);
 const input=f('engineering-filter');
 const all=[...document.querySelectorAll('[data-note-card]')];
 const slash=new KeyboardEvent('keydown',{key:'/',bubbles:true,cancelable:true});
 document.body.dispatchEvent(slash);
 const keyboardFocused=document.activeElement===input;
 const keyboardPrevented=slash.defaultPrevented;
 input.value='mobile horizontal overflow';
 input.dispatchEvent(new Event('input',{bubbles:true}));
 const visible=all.filter(card=>!card.hidden);
 const first=visible[0]?.querySelector('h3 a');
 const submit=new Event('submit',{bubbles:true,cancelable:true});
 f('engineering-filter').focus();
 document.querySelector('[data-engineering-search]').dispatchEvent(submit);
 const resultFocused=Boolean(first&&document.activeElement===first);
 const resultsStatus=f('engineering-search-status').textContent;
 const urlHasQuery=new URL(window.location.href).searchParams.get('q')==='mobile horizontal overflow';
 input.value='unmatchabletechnicalwordzzzw123987';
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.focus();
 const beforeNoResultsFocus=document.activeElement===input;
 document.querySelector('[data-engineering-search]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 const zeroFocusStayed=document.activeElement===input;
 const zero=all.filter(card=>!card.hidden).length===0;
 const emptyShown=!f('engineering-no-results').hidden;
 const zeroStatus=f('engineering-search-status').textContent;
 const escaped=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});
 input.dispatchEvent(escaped);
 const escapedQueryCleared=input.value===''&&escaped.defaultPrevented;
 const security=document.querySelector('[data-engineering-topic="security"]');
 security.click();
 const topicPressed=security.getAttribute('aria-pressed')==='true';
 const urlTopic=new URL(window.location.href).searchParams.get('topic')==='security';
 security.focus();
 const ctrlSlash=new KeyboardEvent('keydown',{key:'/',ctrlKey:true,bubbles:true,cancelable:true});
 document.body.dispatchEvent(ctrlSlash);
 const shortcutIgnored=document.activeElement===security&&!ctrlSlash.defaultPrevented;
 const inButtonSlash=new KeyboardEvent('keydown',{key:'/',bubbles:true,cancelable:true});
 security.dispatchEvent(inButtonSlash);
 const buttonIgnored=document.activeElement===security&&!inButtonSlash.defaultPrevented;
 return {total:all.length,keyboardFocused,keyboardPrevented,
  matches:visible.length,firstTitle:first?.textContent||'',
  resultFocused,resultsStatus,urlHasQuery,submitPrevented:submit.defaultPrevented,
  beforeNoResultsFocus,zeroFocusStayed,zero,emptyShown,zeroStatus,
  escapedQueryCleared,topicPressed,urlTopic,shortcutIgnored,buttonIgnored,
  width:document.documentElement.clientWidth,
  scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)};
}


async function exerciseArchiveDownload(){
 const button=document.getElementById('engineering-download-results');
 const cards=[...document.querySelectorAll('[data-note-card]')].filter(card=>!card.hidden);
 const originalCreate=URL.createObjectURL;
 const originalClick=HTMLAnchorElement.prototype.click;
 const savedBefore=localStorage.getItem('24gotop-public-reading-list-v1');
 let blob=null,download=null,clicks=0;
 try{
  URL.createObjectURL=function(data){blob=data;return originalCreate.call(URL,data);};
  HTMLAnchorElement.prototype.click=function(){
   downloadsPreventedFromNavigating=true;
   download=this;clicks++;
  };
  // Store no network state and prevent a real CI download prompt.
  var downloadsPreventedFromNavigating=false;
  const visible=!button.hidden;
  const height=button.getBoundingClientRect().height;
  button.click();
  const text=blob?await blob.text():'';
  const expected=cards.map(card=>{
   const anchor=card.querySelector('h3 a');
   const file=card.dataset.noteFile;
   const label=(anchor?.textContent?.trim()||file.slice(0,-5).replaceAll('-',' '))
    .replace(/[\r\n\[\]\\]/g,' ').slice(0,180);
   return '- ['+label+'](https://24go.top/engineering/'+file+')';
  }).join('\n')+'\n';
  return {visible,height,count:cards.length,clicks,
   prevented:downloadsPreventedFromNavigating,
   filename:download?.download,hasBlob:download?.href.startsWith('blob:'),
   detached:download?!download.isConnected:false,
   validContents:text===expected,onlyPublicLinks:
    text.split('\n').filter(Boolean).every(line=>
     /^\- \[[^\]\r\n]+\]\(https:\/\/24go\.top\/engineering\/[a-z0-9-]+\.html\)$/.test(line)),
   bytes:blob?.size,
   feedback:document.getElementById('engineering-share-status').textContent,
   sameStorage:localStorage.getItem('24gotop-public-reading-list-v1')===savedBefore,
   viewport:document.documentElement.clientWidth,
   scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)};
 }finally{
  URL.createObjectURL=originalCreate;
  HTMLAnchorElement.prototype.click=originalClick;
 }
}

function exerciseSavedLinks(){
 const key='24gotop-public-reading-list-v1';
 const list=document.getElementById('reading-list-items');
 const heading=document.getElementById('reading-list-heading');
 const filter=document.getElementById('reading-list-filter');
 document.querySelector('[data-engineering-topic="all"]').click();
 const cards=[...document.querySelectorAll('[data-note-card]')];
 const toggles=cards.slice(0,2).map(card=>card.querySelector('.reading-list__toggle'));
 const before=localStorage.getItem(key);
 toggles[0].focus();toggles[0].click();
 const first=JSON.parse(localStorage.getItem(key)).files;
 const pressed=toggles[0].getAttribute('aria-pressed');
 toggles[1].click();
 const two=JSON.parse(localStorage.getItem(key)).files;
 filter.value='mobile horizontal';
 filter.dispatchEvent(new Event('input',{bubbles:true}));
 const count=document.getElementById('reading-list-filter-status');
 const filterFeedback={text:count.textContent,role:count.getAttribute('role'),
  live:count.getAttribute('aria-live'),visible:list.children.length};
 filter.value='';filter.dispatchEvent(new Event('input',{bubbles:true}));
 const firstRemove=list.querySelector('.reading-list__remove');
 firstRemove.focus();firstRemove.click();
 const nextRemove=list.querySelector('.reading-list__remove');
 const nextFocused=Boolean(nextRemove&&document.activeElement===nextRemove);
 const afterFirst=JSON.parse(localStorage.getItem(key)).files;
 nextRemove?.click();
 const headingFocused=document.activeElement===heading;
 const afterLast=JSON.parse(localStorage.getItem(key)).files;
 return {before,first,pressed,two,filterFeedback,nextFocused,
  afterFirst,headingFocused,afterLast,
  width:document.documentElement.clientWidth,
  scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)};
}


async function waitForReadingPaths(){
 for(let attempt=0;attempt<100;attempt++){
  const ready=document.querySelectorAll('#path-catalog .path-catalog-item');
  const status=document.getElementById('path-status')?.textContent||'';
  if(ready.length>=5&&status.includes('Choose from '))return ready.length;
  if(status.includes('catalog is unavailable'))throw Error('Reading path feed unavailable');
  await new Promise(resolve=>setTimeout(resolve,40));
 }
 throw Error('Reading path catalog failed to initialize');
}
function exerciseReadingPaths(){
 const savedKey='24gotop-public-reading-list-v1';
 const storedBefore=localStorage.getItem(savedKey);
 const catalog=document.getElementById('path-catalog');
 const chosen=document.getElementById('path-selected');
 const initial=catalog.querySelectorAll('.path-catalog-item').length;
 const first= catalog.querySelectorAll('.path-catalog-item button')[0];
 first.focus();first.click();
 const firstHref=catalog.querySelector('.path-catalog-item .path-article-link')?.href;
 const addFocus=Boolean(document.activeElement?.classList.contains('path-article-link')&&
  document.activeElement.href===firstHref);
 const second=catalog.querySelectorAll('.path-catalog-item button')[1];
 second.focus();second.click();
 const firstOrder=[...chosen.querySelectorAll('.path-selected-item .path-article-link')]
  .map(link=>link.href);
 const move=chosen.querySelectorAll('.path-selected-item')[1]
  ?.querySelectorAll('.path-item-actions button')[0];
 move?.focus();move?.click();
 const reordered=[...chosen.querySelectorAll('.path-selected-item .path-article-link')]
  .map(link=>link.href);
 const reorderFocus=document.activeElement?.href===firstOrder[1];
 const remove=chosen.querySelectorAll('.path-selected-item')[0]
  ?.querySelectorAll('.path-item-actions button')[2];
 remove?.focus();remove?.click();
 const remaining=[...chosen.querySelectorAll('.path-selected-item .path-article-link')]
  .map(link=>link.href);
 const removeFocus=document.activeElement?.href===firstOrder[0];
 const search=document.getElementById('path-search');
 // A visible title in the reviewed corpus includes the literal 'mobile'.
 search.value='mobile';
 search.dispatchEvent(new Event('input',{bubbles:true}));
 const filtered=Number.parseInt(document.getElementById('catalog-count').textContent,10);
 search.value='';
 search.dispatchEvent(new Event('input',{bubbles:true}));
 const title=document.getElementById('path-title');
 title.value='安全 • ภาษาไทย • Русский';
 title.dispatchEvent(new Event('input',{bubbles:true}));
 const copiedBefore=document.getElementById('path-copy-link').disabled;
 const actions=[...document.querySelectorAll('.path-panel button')];
 const minimumActionHeight=Math.min(...actions.map(button=>button.getBoundingClientRect().height));
 const viewport=document.documentElement.clientWidth;
 const scroll=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
 const header=document.querySelector('header.interior-header');
 return {initial,addFocus,firstOrder,reordered,reorderFocus,remaining,removeFocus,
  filtered,minimumActionHeight,copiedBefore,
  count:document.getElementById('selected-count').textContent,
  viewport,scroll,headerPosition:header?getComputedStyle(header).position:null,
  storedUnchanged:localStorage.getItem(savedKey)===storedBefore,
  locationUnchanged:window.location.hash==='',
  statusRole:document.getElementById('path-status').getAttribute('role')};
}

// Real browser clipboard permission races on the currently rendered reading
// path. Run after the responsive add/reorder/remove interaction per viewport.
async function exerciseReadingPathsClipboardRace(){
 const copyLink=document.getElementById('path-copy-link');
 const copyMarkdown=document.getElementById('path-copy-markdown');
 const reset=document.getElementById('path-reset');
 const title=document.getElementById('path-title');
 const status=document.getElementById('path-copy-status');
 const manual=document.getElementById('path-manual-copy');
 const label=document.getElementById('path-manual-label');
 const pending=[];
 const original=Object.getOwnPropertyDescriptor(navigator,'clipboard');
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
  writeText(value){return new Promise((resolve,reject)=>pending.push({value,resolve,reject}));}
 }});
 const tick=()=>new Promise(ok=>setTimeout(ok,0));
 try{
  copyLink.click();copyMarkdown.click();
  if(pending.length!==2)throw Error('Two clipboard attempts did not start');
  pending[1].resolve();await tick();
  pending[0].reject(Error('Obsolete clipboard rejection'));await tick();
  const newestSuccess=status.textContent.startsWith('Copied.')&&manual.hidden&&
   label.hidden&&manual.value==='';
  copyLink.click();
  if(pending.length!==3)throw Error('Third clipboard attempt did not start');
  title.value='Updated title while permission is pending';
  title.dispatchEvent(new Event('input',{bubbles:true}));
  title.focus();
  pending[2].reject(Error('Stale permission after path title edit'));await tick();
  const staleTitleSafe=manual.hidden&&label.hidden&&manual.value===''&&
   status.textContent===''&&document.activeElement===title;
  copyMarkdown.click();
  if(pending.length!==4)throw Error('Fourth clipboard attempt did not start');
  pending[3].reject(Error('Current browser clipboard denial'));await tick();
  const currentFallback=!manual.hidden&&!label.hidden&&manual.value.startsWith('# ')&&
   document.activeElement===manual&&
   status.textContent.includes('Select and copy');
  copyLink.click();
  if(pending.length!==5)throw Error('Fifth clipboard attempt did not start');
  reset.click();
  pending[4].reject(Error('Stale permission after clearing path'));await tick();
  const staleResetSafe=manual.hidden&&label.hidden&&manual.value===''&&
   status.textContent===''&&reset.disabled&&copyLink.disabled;
  const viewport=document.documentElement.clientWidth;
  const scroll=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
  return {newestSuccess,staleTitleSafe,currentFallback,staleResetSafe,viewport,scroll,
   requests:pending.length};
 }finally{
  if(original)Object.defineProperty(navigator,'clipboard',original);
  else delete navigator.clipboard;
 }
}

// Exercise the actual browser Blob download path on each responsive viewport.
// Intercept only the final anchor activation so CI never downloads files.
async function exerciseReadingPathsDownload(){
 const button=document.getElementById('path-download-markdown');
 const selected=document.querySelector('#path-selected .path-article-link');
 const title=document.getElementById('path-title').value;
 const before=localStorage.getItem('24gotop-public-reading-list-v1');
 const create=URL.createObjectURL;
 const click=HTMLAnchorElement.prototype.click;
 let blob=null,anchor=null,clicks=0;
 try{
  URL.createObjectURL=function(file){
   blob=file;return create.call(URL,file);
  };
  HTMLAnchorElement.prototype.click=function(){
   anchor=this;clicks++;
  };
  const originallyEnabled=!button.disabled;
  button.click();
  const content=blob?await blob.text():'';
  const link=selected?.href||'';
  const result={
   originallyEnabled,clicks,
   filename:anchor?.download,
   objectUrl:anchor?.href.startsWith('blob:'),
   cleanedUp:anchor?!anchor.isConnected:false,
   validContents:content.startsWith('# '+title+'\n\n1. [') &&
    content.includes(']('+link+')\n') && content.endsWith('\n') &&
    content.split('\n').length===4,
   mime:blob?.type,
   bytes:blob?.size,
   status:document.getElementById('path-copy-status').textContent,
   noStorageWrite:localStorage.getItem('24gotop-public-reading-list-v1')===before,
   width:document.documentElement.clientWidth,
   scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)
  };
  return result;
 }finally{
  URL.createObjectURL=create;
  HTMLAnchorElement.prototype.click=click;
 }
}


function exerciseDraftImageGate(){
 const body=document.getElementById('postBody');
 const preview=document.getElementById('previewBody');
 const src='https://images.example.org/diagram.png';
 body.value='## Diagram\n\n![Technical architecture](https://images.example.org/diagram.png)';
 body.dispatchEvent(new Event('input',{bubbles:true}));
 const gate=preview.querySelector('.preview-image-gate');
 const button=gate?.querySelector('button');
 const image=gate?.querySelector('img');
 if(!gate||!button||!image)throw Error('Image gate was not rendered');
 const before={
  noSrc:!image.hasAttribute('src'),hidden:image.hidden,
  domain:button.textContent.includes('images.example.org'),
  alt:image.getAttribute('alt'),
  anonymous:image.getAttribute('crossorigin')==='anonymous',
  noReferrer:image.getAttribute('referrerpolicy')==='no-referrer',
  privateNote:document.querySelector('.preview-image-privacy')?.textContent?.length>30,
  height:button.getBoundingClientRect().height,
  overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-
    document.documentElement.clientWidth
 };
 let requested=null;
 const originalSet=image.setAttribute.bind(image);
 image.setAttribute=(name,value)=>{
  // Inspect opt-in request without fetching an external host in CI.
  if(name==='src'){requested=value;return;}
  originalSet(name,value);
 };
 button.focus();
 button.click();
 const after={
  requested,shown:!image.hidden,consentHidden:button.hidden,
  imageFocused:document.activeElement===image,noAutomaticSrc:!image.hasAttribute('src')
 };
 image.dispatchEvent(new Event('error'));
 const fallback={
  restored:!button.hidden&&image.hidden,
  buttonFocused:document.activeElement===button,
  retryLabel:button.textContent.includes('images.example.org')
 };
 // Unsafe local target remains literal source; it must never create an image.
 body.value='Private URL: ![Forbidden](https://127.0.0.1/private.png)';
 body.dispatchEvent(new Event('input',{bubbles:true}));
 const invalid={
  noGate:!preview.querySelector('.preview-image-gate'),
  literal:preview.textContent.includes('![Forbidden](https://127.0.0.1/private.png)'),
  overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-
   document.documentElement.clientWidth
 };
 return {before,after,fallback,invalid};
}

// Exercise the real insertion control (no mocks for validation or preview).
// Every source image remains unloaded until its separate consent button click.
function exerciseDraftImageInsertion(){
 const $=id=>document.getElementById(id);
 const body=$('postBody'),url=$('imageUrl'),alt=$('imageAlt');
 const button=$('insertImage'),preview=$('previewBody');
 const beforeStorage=localStorage.length;
 body.value='A reproducible system architecture review.';
 body.dispatchEvent(new Event('input',{bubbles:true}));
 body.setSelectionRange(body.value.length,body.value.length);
 url.value='https://images.example.org/architecture(v3).png';
 alt.value='Architecture diagram of the reviewed system';
 const buttonHeight=button.getBoundingClientRect().height;
 const fieldWidths=[url,alt].map(el=>el.getBoundingClientRect().width);
 button.focus();
 button.click();
 const expected='![Architecture diagram of the reviewed system]'+
  '(https://images.example.org/architecture%28v3%29.png)';
 const generated=body.value.endsWith(expected);
 const gate=preview.querySelector('.preview-image-gate');
 const image=gate?.querySelector('img');
 const fileStatus=$('formStatus').textContent;
 const focused=document.activeElement===body;
 const undoPos=body.selectionStart===body.value.length&&
  body.selectionEnd===body.selectionStart;
 const noSrc=Boolean(image&&!image.hasAttribute('src'));
 const first=body.value;
 // Invalid remote URL may not alter a manuscript or trigger an image load.
 url.value='http://127.0.0.1/private.png';
 alt.value='Forbidden local endpoint';
 button.click();
 const invalidSafe=body.value===first&&$('formStatus').dataset.error==='true';
 // A valid URL with no alt/selection must also be rejected.
 url.value='https://images.example.org/another.png';
 alt.value='';
 body.setSelectionRange(first.length,first.length);
 button.click();
 const emptyAltSafe=body.value===first&&
  document.activeElement===alt;
 // A selected phrase is usable alt text even when the separate alt field
 // is empty; selected text is replaced via native setRangeText.
 const phrase='system architecture';
 const at=body.value.indexOf(phrase);
 body.focus();body.setSelectionRange(at,at+phrase.length);
 button.click();
 const selectedAltUsed=body.value.includes(
  '![system architecture](https://images.example.org/another.png)');
 const noUploads=localStorage.length===beforeStorage;
 const originalConfirm=window.confirm;
 window.confirm=()=>true;
 try{$('clearDraft').click();}finally{window.confirm=originalConfirm;}
 const reset=body.value===''&&url.value===''&&alt.value===''&&
  document.activeElement===$('postTitle');
 const viewport=document.documentElement.clientWidth;
 const scroll=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
 return {generated,noSrc,focused,undoPos,fileStatus:!!fileStatus,invalidSafe,
  emptyAltSafe,selectedAltUsed,noUploads,reset,buttonHeight,fieldWidths,viewport,scroll};
}

async function main(){
 const site=localServer();
 let browser,ws;
 try{
  await new Promise((ok,bad)=>{site.once('error',bad);site.listen(0,'127.0.0.1',ok);});
  const origin='http://127.0.0.1:'+site.address().port;
  browser=await chromium();
  ws=new WebSocket(browser.address);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true});});
  const c=new CDP(ws);
  const {targetId}=await c.send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await c.send('Target.attachToTarget',{targetId,flatten:true});
  await c.send('Page.enable',{},sessionId);
  await c.send('Runtime.enable',{},sessionId);
  await c.send('Network.enable',{},sessionId);
  await c.send('Emulation.setDeviceMetricsOverride',{width:320,height:850,deviceScaleFactor:1,mobile:true},sessionId);
  await c.send('Page.navigate',{url:origin+'/draft-lab.html?ui=ru'},sessionId);
  await c.call(waitForEditor,sessionId);
  const result=await c.call(exerciseEditor,sessionId);
  const assert=(condition,what)=>{if(!condition)throw Error(what+': '+JSON.stringify(result));};
  for(const [id,field] of [['postTitle',result.title],['postBody',result.body],['postSource',result.source]]){
   assert(field.invalid==='true'&&field.desc===id+'Error'&&field.msg===id+'Error'&&
    field.visible&&field.text&&field.focused,'Invalid field not accessible: '+id);
  }
  assert(result.titleCleared.invalid===null&&!result.titleCleared.visible &&
   result.bodyCleared.invalid===null&&!result.bodyCleared.visible,'Old error not cleared');
  assert(result.locale==='ru'&&result.storage===0,'UI locale or private storage changed');
  assert(result.scroll<=result.width+1,'320px editor overflows horizontally');
  for(const locale of UI_LOCALES){
   const state=await c.call(switchLanguage,sessionId,locale);
   assert(state.value===locale&&state.text===UI_STRINGS[locale].invalidSource &&
    state.visible&&state.invalid==='true'&&state.draft===result.draft,
    'Active error is not translated safely: '+locale);
   assert(state.scroll<=state.width+1,'Localized error widens page: '+locale+' '+JSON.stringify(state));
  }
  const cleared=await c.call(correctSource,sessionId);
  assert(cleared.hidden&&cleared.invalid===null&&cleared.aria===null,'Corrected source still invalid');
  for(const profile of [
   {name:'compact-280',width:280,height:600,mobile:true,dpr:2},
   {name:'phone-390',width:390,height:844,mobile:true,dpr:3},
   {name:'landscape-844',width:844,height:390,mobile:true,dpr:3},
   {name:'tablet-768',width:768,height:1024,mobile:true,dpr:2},
   {name:'desktop-1440',width:1440,height:900,mobile:false,dpr:1}
  ]){
   await c.send('Emulation.setDeviceMetricsOverride',{
    width:profile.width,height:profile.height,
    deviceScaleFactor:profile.dpr,mobile:profile.mobile
   },sessionId);
   await c.send('Emulation.setTouchEmulationEnabled',{
    enabled:profile.mobile,maxTouchPoints:profile.mobile?5:1
   },sessionId);
   const photo=await c.call(exerciseDraftImageGate,sessionId);
   if(!photo.before.noSrc||!photo.before.hidden||!photo.before.domain||
      photo.before.alt!=='Technical architecture'||!photo.before.anonymous||
      !photo.before.noReferrer||!photo.before.privateNote||
      photo.before.height<43.5||photo.before.overflow>1||
      photo.after.requested!=='https://images.example.org/diagram.png'||
      !photo.after.shown||!photo.after.consentHidden||
      !photo.after.imageFocused||!photo.after.noAutomaticSrc||
      !photo.fallback.restored||!photo.fallback.buttonFocused||
      !photo.fallback.retryLabel||!photo.invalid.noGate||
      !photo.invalid.literal||photo.invalid.overflow>1)
    throw Error('Markdown opt-in image preview '+profile.name+': '+JSON.stringify(photo));
   const insertion=await c.call(exerciseDraftImageInsertion,sessionId);
   if(!insertion.generated||!insertion.noSrc||!insertion.focused||
      !insertion.undoPos||!insertion.fileStatus||!insertion.invalidSafe||
      !insertion.emptyAltSafe||!insertion.selectedAltUsed||
      !insertion.noUploads||!insertion.reset||insertion.buttonHeight<43.5||
      insertion.fieldWidths.some(width=>width<70)||
      insertion.scroll>insertion.viewport+1)
    throw Error('Markdown image insertion '+profile.name+': '+JSON.stringify(insertion));
  }
  await c.send('Emulation.setDeviceMetricsOverride',{
   width:320,height:850,deviceScaleFactor:1,mobile:true
  },sessionId);
  await c.send('Emulation.setTouchEmulationEnabled',{
   enabled:true,maxTouchPoints:5
  },sessionId);
  console.log('PASS Chromium Draft Lab images: opt-in previews, inserted Markdown, negative cases and focus on 280/390/844/768/1440 responsive layouts');
  assert(!c.exceptions.length,'Unexpected browser JS exception '+c.exceptions.join('; '));
  assert(!c.external.length,'External network request '+c.external.join('; '));
  console.log('PASS Chromium Draft Lab: 3 invalid fields, 8 locales, accessible focus and no page overflow');
  await c.send('Page.navigate',{url:origin+'/engineering/'},sessionId);
  await c.call(waitForArchive,sessionId);
  const archive=await c.call(exerciseArchive,sessionId);
  const requireArchive=(condition,what)=>{
    if(!condition)throw Error('Reader E2E: '+what+' '+JSON.stringify(archive));
  };
  requireArchive(archive.total===12,'12 reviewed public articles expected');
  requireArchive(archive.keyboardFocused&&archive.keyboardPrevented,'/ must focus article search from page');
  requireArchive(archive.matches>=1&&archive.firstTitle&&archive.resultFocused&&
    archive.urlHasQuery&&archive.submitPrevented,'Enter must focus a matching article');
  requireArchive(archive.zero&&archive.emptyShown&&archive.zeroStatus.startsWith('0 of ')&&
    archive.beforeNoResultsFocus&&archive.zeroFocusStayed,'empty search must preserve input focus');
  requireArchive(archive.escapedQueryCleared&&archive.topicPressed&&archive.urlTopic,
    'Escape must clear query and topic filter must remain accessible');
  requireArchive(archive.shortcutIgnored&&archive.buttonIgnored,'/ must not hijack interactive input');
  requireArchive(archive.scroll<=archive.width+1,'320px article search must not overflow page');
  assert(!c.exceptions.length,'Unexpected browser JS exception '+c.exceptions.join('; '));
  assert(!c.external.length,'External network request '+c.external.join('; '));
  console.log('PASS Chromium reader search: 12 cards, / shortcut, Enter result focus, empty-state and 320px viewport');
  const saved=await c.call(exerciseSavedLinks,sessionId);
  requireArchive(saved.before===null&&saved.first.length===1&&saved.two.length===2&&
    saved.pressed==='true','saved public links must be explicit and limited to filenames');
  requireArchive(saved.filterFeedback.role==='status'&&saved.filterFeedback.live==='polite'&&
    saved.filterFeedback.visible===1,'saved-title filtering must announce result count');
  requireArchive(saved.afterFirst.length===1&&saved.nextFocused&&
    saved.afterLast.length===0&&saved.headingFocused,
    'removing saved links must preserve keyboard focus');
  requireArchive(saved.scroll<=saved.width+1,'320px saved reading list must not overflow page');
  console.log('PASS Chromium saved reading list: explicit save, live filtered count, next-item/heading focus at 320px');
  // Verify real opt-in Blob export and mobile action height in each display mode.
  for(const profile of [
   {name:'compact',width:280,height:600,mobile:true,dpr:2},
   {name:'phone',width:390,height:844,mobile:true,dpr:3},
   {name:'landscape',width:844,height:390,mobile:true,dpr:3},
   {name:'tablet',width:768,height:1024,mobile:true,dpr:2},
   {name:'desktop',width:1440,height:900,mobile:false,dpr:1}
  ]){
   await c.send('Emulation.setDeviceMetricsOverride',{
    width:profile.width,height:profile.height,
    deviceScaleFactor:profile.dpr,mobile:profile.mobile
   },sessionId);
   await c.send('Emulation.setTouchEmulationEnabled',{
    enabled:profile.mobile,maxTouchPoints:profile.mobile?5:1
   },sessionId);
   const result=await c.call(exerciseArchiveDownload,sessionId);
   if(!result.visible||result.height<43.5||result.count!==12||
      result.clicks!==1||!result.prevented||
      result.filename!=='24gotop-search-results.md'||
      !result.hasBlob||!result.detached||!result.validContents||
      !result.onlyPublicLinks||!result.sameStorage||
      result.bytes<100||!result.feedback.includes('download requested')||
      result.scroll>result.viewport+1)
    throw Error('Responsive article-result Markdown export '+profile.name+': '+
      JSON.stringify(result));
  }
  console.log('PASS Chromium article search Markdown downloads: 280/390/844 landscape/768 tablet/1440 desktop, canonical links and no browser storage');
  // Exercise real dynamic reading-path DOM, not only the initial static HTML.
  // Each device is a fresh reload of the public feed and selected controls.
  const pathProfiles=[
   {name:'compact-280',width:280,height:600,dpr:2,mobile:true},
   {name:'phone-390',width:390,height:844,dpr:3,mobile:true},
   {name:'phone-landscape',width:844,height:390,dpr:3,mobile:true,shortLandscape:true},
   {name:'desktop',width:1440,height:900,dpr:1,mobile:false}
  ];
  for(const profile of pathProfiles){
   await c.send('Emulation.setDeviceMetricsOverride',{
    width:profile.width,height:profile.height,
    deviceScaleFactor:profile.dpr,mobile:profile.mobile
   },sessionId);
   await c.send('Emulation.setTouchEmulationEnabled',{
    enabled:profile.mobile,maxTouchPoints:profile.mobile?5:1
   },sessionId);
   await c.send('Page.navigate',{url:origin+'/engineering/reading-paths/'},sessionId);
   await c.call(waitForReadingPaths,sessionId);
   const path=await c.call(exerciseReadingPaths,sessionId);
   const valid=path.initial===12&&path.addFocus&&path.firstOrder.length===2&&
    path.reordered.length===2&&path.reordered[0]===path.firstOrder[1]&&
    path.reordered[1]===path.firstOrder[0]&&path.reorderFocus&&
    path.remaining.length===1&&path.remaining[0]===path.firstOrder[0]&&
    path.removeFocus&&path.filtered>=1&&path.filtered<=12&&
    path.count==='1 / 10'&&!path.copiedBefore&&path.storedUnchanged&&
    path.locationUnchanged&&path.statusRole==='status'&&
    path.minimumActionHeight>=43.5&&path.scroll<=path.viewport+1&&
    (!profile.shortLandscape||path.headerPosition!=='sticky');
   if(!valid)throw Error('Reading path responsive E2E '+profile.name+': '+JSON.stringify(path));
   const downloaded=await c.call(exerciseReadingPathsDownload,sessionId);
   if(!downloaded.originallyEnabled||downloaded.clicks!==1||
      downloaded.filename!=='24gotop-reading-path.md'||!downloaded.objectUrl||
      !downloaded.cleanedUp||!downloaded.validContents||
      downloaded.mime!=='text/markdown;charset=utf-8'||downloaded.bytes<50||
      !downloaded.status.includes('download requested')||!downloaded.noStorageWrite||
      downloaded.scroll>downloaded.width+1)
    throw Error('Reading path local Markdown download '+profile.name+': '+
      JSON.stringify(downloaded));
   const copyRace=await c.call(exerciseReadingPathsClipboardRace,sessionId);
   if(!copyRace.newestSuccess||!copyRace.staleTitleSafe||
      !copyRace.currentFallback||!copyRace.staleResetSafe||
      copyRace.requests!==5||copyRace.scroll>copyRace.viewport+1)
    throw Error('Reading path clipboard focus/permission race '+profile.name+': '+
      JSON.stringify(copyRace));
  }
  assert(!c.exceptions.length,'Unexpected browser JS exception '+c.exceptions.join('; '));
  assert(!c.external.length,'External network request '+c.external.join('; '));
  console.log('PASS Chromium reading-path builder: touch layouts and real clipboard permission/focus races on 280/390/844 landscape/1440 desktop');
 }finally{
  if(ws)ws.close();
  if(browser){
   browser.proc.kill('SIGKILL');
   await new Promise(ok=>{
    if(browser.proc.exitCode!==null||browser.proc.signalCode!==null)return ok();
    browser.proc.once('exit',ok);
   });
   await rm(browser.profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
  await new Promise(ok=>site.close(ok));
 }
}
main().catch(error=>{console.error('FAIL PUBLIC UI browser E2E:',error.message);process.exitCode=1;});
