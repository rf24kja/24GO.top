// Actual PUBLIC Library and first-party app interactions in local Chromium.
import {createServer} from 'node:http';
import {readFile,rm} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChromium} from './chromium-startup.mjs';
const root=resolve(fileURLToPath(new URL('../site/',import.meta.url)));
const types={html:'text/html',css:'text/css',js:'text/javascript',
 mjs:'text/javascript',json:'application/json',svg:'image/svg+xml'};
const server=()=>createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(req.method!=='GET'||!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const type=types[file.split('.').at(-1)];
  if(!type){res.writeHead(415).end();return;}
  const data=await readFile(file);
  res.writeHead(200,{'content-type':type,'cache-control':'no-store'}).end(data);
 }catch{res.writeHead(404).end();}
});
class CDP{
 constructor(ws){
  this.ws=ws;this.seq=0;this.pending=new Map();this.errors=[];this.external=[];
  ws.addEventListener('message',event=>{
   const v=JSON.parse(event.data);
   if(v.method==='Runtime.exceptionThrown')this.errors.push(v.params.exceptionDetails.text);
   if(v.method==='Network.requestWillBeSent'&&
     !v.params.request.url.startsWith('http://127.0.0.1:'))this.external.push(v.params.request.url);
   const req=this.pending.get(v.id);if(!req)return;
   this.pending.delete(v.id);
   if(v.error)req.reject(Error(v.error.message));else req.resolve(v.result);
  });
 }
 request(method,params={},sessionId){
  return new Promise((resolve,reject)=>{
   const id=++this.seq,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timeout'));},15000);
   this.pending.set(id,{
    resolve:x=>{clearTimeout(timer);resolve(x)},
    reject:e=>{clearTimeout(timer);reject(e)}
   });
   this.ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
 }
 async evaluate(fn,sessionId){
  const result=await this.request('Runtime.evaluate',{
   expression:'('+fn.toString()+')()',awaitPromise:true,returnByValue:true
  },sessionId);
  if(result.exceptionDetails)throw Error('Browser evaluation failed');
  return result.result?.value;
 }
}
async function waitForLibrary(){
 for(let i=0;i<160;i++){
  if(document.getElementById('library-status')?.textContent.startsWith('Showing'))
   return true;
  await new Promise(ok=>setTimeout(ok,35));
 }
 throw Error('Catalog did not initialize');
}
async function exerciseLibrary(){
 const cards=()=>[...document.querySelectorAll('.library-card')];
 const input=document.getElementById('library-search'),cat=document.getElementById('library-category');
 const storageBefore=localStorage.length;
 const initial=cards().length===2;
 input.value='JSON';input.dispatchEvent(new Event('input',{bubbles:true}));
 const searched=cards().length===1&&cards()[0].querySelector('h3').textContent==='JSON Inspector';
 input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
 cat.value='Accessibility';cat.dispatchEvent(new Event('change',{bubbles:true}));
 const category=cards().length===1&&cards()[0].querySelector('h3').textContent==='Contrast Checker';
 cat.value='all';cat.dispatchEvent(new Event('change',{bubbles:true}));
 const select=[...document.querySelectorAll('[data-library-select]')];
 select[0].focus();select[0].click();select[1].click();
 const selected=document.getElementById('compare-count').textContent==='2 of 2 selected'&&
  select[0].getAttribute('aria-pressed')==='true'&&select[1].getAttribute('aria-pressed')==='true';
 document.getElementById('compare-open').click();
 const rows=[...document.querySelectorAll('#compare-body tr')];
 const compared=!document.getElementById('compare-result').hidden&&rows.length===6&&
  rows.some(x=>x.textContent.includes('WCAG 2.2'))&&
  document.getElementById('compare-a').textContent==='JSON Inspector'&&
  document.getElementById('compare-b').textContent==='Contrast Checker';
 const launch=cards()[0].querySelector('button');
 const frame=document.getElementById('library-frame'),preview=document.getElementById('preview-area');
 launch.click();
 const launched=!preview.hidden&&frame.getAttribute('src')==='/library/apps/json-inspector/'&&
  frame.getAttribute('sandbox')==='allow-scripts'&&
  !frame.sandbox.contains('allow-same-origin')&&
  !frame.sandbox.contains('allow-top-navigation')&&
  frame.referrerPolicy==='no-referrer';
 let opaque=false;
 await new Promise(ok=>setTimeout(ok,250));
 try{opaque=frame.contentDocument===null;}catch{opaque=true;}
 document.getElementById('preview-close').click();
 const closed=preview.hidden&&!frame.hasAttribute('src');
 document.getElementById('compare-reset').click();
 const cleared=document.getElementById('compare-open').disabled&&
  document.getElementById('compare-count').textContent==='0 of 2 selected';
 const width=document.documentElement.clientWidth;
 return {initial,searched,category,selected,compared,launched,opaque,closed,cleared,
  width,scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
  actionHeight:launch.getBoundingClientRect().height,
  noStorage:localStorage.length===storageBefore};
}
function exerciseJsonApp(){
 const input=document.getElementById('source'),inspect=document.getElementById('inspect');
 input.value='{"title":"Hello","data":[1,true,null]}';
 inspect.click();
 const valid=document.getElementById('nodes').textContent==='6'&&
  document.getElementById('depth').textContent==='3'&&
  document.getElementById('result').textContent.includes('"title": "Hello"')&&
  document.getElementById('status').textContent.includes('Valid JSON');
 input.value='{broken';inspect.click();
 const refused=document.getElementById('status').dataset.error==='true'&&
  document.getElementById('result').textContent==='No output.';
 return {valid,refused,width:document.documentElement.clientWidth,
  scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)};
}
function exerciseContrast(){
 const f=document.getElementById('foreground'),b=document.getElementById('background');
 f.value='#000000';b.value='#ffffff';
 f.dispatchEvent(new Event('input',{bubbles:true}));
 b.dispatchEvent(new Event('input',{bubbles:true}));
 const high=document.getElementById('ratio').textContent.startsWith('21.00:1')&&
  document.getElementById('aaa-normal').textContent==='PASS';
 b.value='#000000';b.dispatchEvent(new Event('input',{bubbles:true}));
 const low=document.getElementById('ratio').textContent.startsWith('1.00:1')&&
  document.getElementById('aa-normal').textContent==='FAIL';
 return {high,low,width:document.documentElement.clientWidth,
  scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)};
}
async function main(){
 const http=server();let browser,ws;
 try{
  await new Promise((ok,bad)=>{http.once('error',bad);http.listen(0,'127.0.0.1',ok);});
  const origin='http://127.0.0.1:'+http.address().port;
  browser=await launchChromium({profilePrefix:'24gotop-library-e2e-'});
  ws=new WebSocket(browser.address);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true});});
  const c=new CDP(ws);
  const {targetId}=await c.request('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await c.request('Target.attachToTarget',{targetId,flatten:true});
  for(const method of ['Page.enable','Runtime.enable','Network.enable'])
   await c.request(method,{},sessionId);
  for(const width of [280,390,844,1440]){
   await c.request('Emulation.setDeviceMetricsOverride',{
    width,height:width===844?390:850,mobile:width<1000,deviceScaleFactor:1
   },sessionId);
   await c.request('Page.navigate',{url:origin+'/library/'},sessionId);
   await c.evaluate(waitForLibrary,sessionId);
   const result=await c.evaluate(exerciseLibrary,sessionId);
   if(!result||Object.entries(result).some(([key,value])=>
      ['initial','searched','category','selected','compared','launched','opaque','closed','cleared','noStorage'].includes(key)&&!value)||
      result.scroll>result.width+1||result.actionHeight<43.5)
    throw Error('Library catalog Chromium '+width+': '+JSON.stringify(result));
  }
  for(const width of [280,390,844,1440]){
   await c.request('Emulation.setDeviceMetricsOverride',{
    width,height:width===844?390:850,mobile:width<1000,deviceScaleFactor:1
   },sessionId);
   await c.request('Page.navigate',{url:origin+'/library/apps/json-inspector/'},sessionId);
   await new Promise(ok=>setTimeout(ok,200));
   const json=await c.evaluate(exerciseJsonApp,sessionId);
   if(!json.valid||!json.refused||json.scroll>json.width+1)
    throw Error('JSON Inspector '+width+': '+JSON.stringify(json));
   await c.request('Page.navigate',{url:origin+'/library/apps/contrast-checker/'},sessionId);
   await new Promise(ok=>setTimeout(ok,200));
   const contrast=await c.evaluate(exerciseContrast,sessionId);
   if(!contrast.high||!contrast.low||contrast.scroll>contrast.width+1)
    throw Error('Contrast Checker '+width+': '+JSON.stringify(contrast));
  }
  if(c.errors.length||c.external.length)
   throw Error('Browser errors or external requests: '+c.errors.join(';')+'; '+c.external.join(';'));
  console.log('PASS Library Chromium: 2 actual apps, ZIP-reviewed catalogue, search, comparison, opaque sandbox, 280/390/844/1440, working JSON and WCAG tools');
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
  await new Promise(ok=>http.close(ok));
 }
}
main().catch(e=>{console.error('FAIL Library browser E2E:',e.message);process.exitCode=1;});
