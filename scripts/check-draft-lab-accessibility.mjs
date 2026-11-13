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
  }
  assert(!c.exceptions.length,'Unexpected browser JS exception '+c.exceptions.join('; '));
  assert(!c.external.length,'External network request '+c.external.join('; '));
  console.log('PASS Chromium reading-path builder: add/reorder/remove, keyboard focus, touch targets and layout on 280/390/844 landscape/1440 desktop');
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
