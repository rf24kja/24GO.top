// Browser-driven test of the actual PUBLIC Draft Lab JavaScript and CSS.
// Runs entirely against loopback on a fresh headless Chromium profile.
// Nothing reaches hosted Core, production drafts or external endpoints.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
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
async function chromium(){
 const profile=await mkdtemp(join(tmpdir(),'24gotop-draft-e2e-'));
 const proc=spawn(process.env.CHROME_BIN||'google-chrome',[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-background-networking','--no-first-run','--no-default-browser-check',
  '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
 ],{stdio:['ignore','ignore','pipe']});
 try{
  const address=await Promise.race([
   new Promise((ok,bad)=>{
    let output='';
    proc.once('error',bad);
    proc.once('exit',code=>bad(Error('Chrome exited '+code)));
    proc.stderr.on('data',chunk=>{
     output=(output+chunk.toString()).slice(-8000);
     const found=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
     if(found)ok(found[1]);
    });
   }),
   delay(12000).then(()=>{throw Error('Chrome debugging endpoint unavailable');})
  ]);
  return {proc,profile,address};
 }catch(error){
  proc.kill('SIGKILL');
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  throw error;
 }
}
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
