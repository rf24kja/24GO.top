// Source-rendered, real Chromium layout check for the PUBLIC 24GOTOP site.
// No npm browser dependency, network requests, credentials or private services.
// Inline only reviewed local CSS so every page can be tested offline.
import {spawn} from 'node:child_process';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join,resolve,dirname,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(fileURLToPath(new URL('../site/',import.meta.url)));
const WIDTHS=[320,360,375,390,430,768,1024];
const PATHS=[
 'index.html','ru/index.html','th/index.html','es/index.html',
 'fr/index.html','de/index.html','pt/index.html','zh/index.html',
 'draft-lab.html','contribute.html','progress.html',
 'engineering/index.html','engineering/reading-paths/index.html',
 'engineering/bounded-github-api-article-proposals.html'
];

async function inlinePage(path){
 const htmlPath=resolve(ROOT,path);
 if(!htmlPath.startsWith(ROOT+sep))throw new Error('Unsafe public page path');
 const html=await readFile(htmlPath,'utf8');
 const styles=[...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"[^>]*>/g)];
 if(!styles.length)throw new Error('Missing stylesheet links in '+path);
 let result=html;
 for(const [tag,href] of styles){
  const ref=href.split('?')[0];
  const cssPath=ref.startsWith('/')?resolve(ROOT,'.'+ref):resolve(dirname(htmlPath),ref);
  if(!cssPath.startsWith(ROOT+sep)||!cssPath.endsWith('.css'))
   throw new Error('Unsafe CSS path in '+path);
  result=result.replace(tag,'<style>'+await readFile(cssPath,'utf8')+'</style>');
 }
 // No scripts or outgoing fetches: measure actual layout of source HTML and CSS.
 return result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
}

async function startBrowser(){
 const profile=await mkdtemp(join(tmpdir(),'24gotop-mobile-'));
 const binary=process.env.CHROME_BIN||'google-chrome';
 const proc=spawn(binary,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-background-networking','--no-first-run','--no-default-browser-check',
  '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
 ],{stdio:['ignore','ignore','pipe']});
 try{
  const address=await Promise.race([
   new Promise((ok,bad)=>{
    let output='';
    proc.once('error',bad);
    proc.once('exit',code=>bad(new Error('Chromium exited '+code)));
    proc.stderr.on('data',data=>{
     output+=data.toString();
     if(output.length>8192)output=output.slice(-4096);
     const match=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
     if(match)ok(match[1]);
    });
   }),
   delay(12000).then(()=>{throw new Error('Chromium debugging endpoint unavailable');})
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
  this.ws=ws;this.id=0;this.pending=new Map();
  ws.addEventListener('message',event=>{
   const msg=JSON.parse(event.data);
   if(!msg.id)return;
   const cb=this.pending.get(msg.id);if(!cb)return;
   this.pending.delete(msg.id);
   if(msg.error)cb.reject(new Error(msg.error.message));
   else cb.resolve(msg.result);
  });
 }
 async send(method,params={},sessionId){
  const id=++this.id;
  return await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{
    this.pending.delete(id);reject(new Error('CDP timed out: '+method));
   },15000);
   this.pending.set(id,{
    resolve:value=>{clearTimeout(timeout);resolve(value);},
    reject:error=>{clearTimeout(timeout);reject(error);}
   });
   this.ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
 }
}

async function main(){
 let browser,ws;
 try{
  browser=await startBrowser();
  ws=new WebSocket(browser.address);
  await new Promise((ok,bad)=>{
   ws.addEventListener('open',ok,{once:true});
   ws.addEventListener('error',bad,{once:true});
  });
  const c=new CDP(ws);
  const {targetId}=await c.send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await c.send('Target.attachToTarget',{targetId,flatten:true});
  await c.send('Page.enable',{},sessionId);
  await c.send('Runtime.enable',{},sessionId);
  const frame=(await c.send('Page.getFrameTree',{},sessionId)).frameTree.frame.id;
  let passed=0;
  for(const width of WIDTHS){
   await c.send('Emulation.setDeviceMetricsOverride',{
    width,height:850,deviceScaleFactor:1,mobile:true
   },sessionId);
   for(const path of PATHS){
    const html=await inlinePage(path);
    await c.send('Page.setDocumentContent',{frameId:frame,html},sessionId);
    await c.send('Runtime.evaluate',{
     expression:'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',
     awaitPromise:true
    },sessionId);
    const data=await c.send('Runtime.evaluate',{
     expression:"(() => {const viewport=document.documentElement.clientWidth;const scroll=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);const offenders=[...document.body.querySelectorAll('*')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.right>viewport+1&&getComputedStyle(el).position!=='fixed';}).slice(0,5).map(el=>el.tagName.toLowerCase()+'.'+(typeof el.className==='string'?el.className:''));return {viewport,scroll,offenders};})()",
     returnByValue:true
    },sessionId);
    const box=data.result?.value;
    if(!box||box.scroll>box.viewport+1)
     throw new Error('Horizontal page overflow at '+width+'px '+path+': '+JSON.stringify(box));
    passed++;
   }
  }
  console.log('PASS '+passed+' Chromium mobile/tablet layouts: no document horizontal overflow');
  console.log('Scope: source-rendered static HTML/CSS; not a physical-device or network smoke test.');
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
 }
}
main().catch(error=>{console.error('FAIL public mobile layout:',error.message);process.exitCode=1;});
