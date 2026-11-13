// Source-rendered, real Chromium layout check for the PUBLIC 24GOTOP site.
// No npm browser dependency, network requests, credentials or private services.
// Inline only reviewed local CSS so every page can be tested offline.
import {readFile,rm} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChromium} from './chromium-startup.mjs';
import {RESPONSIVE_VIEWPORTS} from './responsive-viewports.mjs';

const ROOT=resolve(fileURLToPath(new URL('../site/',import.meta.url)));
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

const startBrowser=()=>launchChromium({profilePrefix:'24gotop-mobile-'});

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
  for(const profile of RESPONSIVE_VIEWPORTS){
   await c.send('Emulation.setDeviceMetricsOverride',{
    width:profile.width,height:profile.height,
    deviceScaleFactor:profile.dpr,mobile:profile.mobile
   },sessionId);
   await c.send('Emulation.setTouchEmulationEnabled',{
    enabled:profile.mobile,maxTouchPoints:profile.mobile?5:1
   },sessionId);
   await c.send('Emulation.setEmulatedMedia',{
    features:[
     {name:'prefers-color-scheme',value:profile.theme||'dark'},
     {name:'prefers-reduced-motion',value:profile.reducedMotion?'reduce':'no-preference'}
    ]
   },sessionId);
   for(const path of PATHS){
    const html=await inlinePage(path);
    await c.send('Page.setDocumentContent',{frameId:frame,html},sessionId);
    await c.send('Runtime.evaluate',{
     expression:'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',
     awaitPromise:true
    },sessionId);
    const data=await c.send('Runtime.evaluate',{
     expression:"(() => {\n const viewport=document.documentElement.clientWidth;\n const scroll=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);\n const offenders=[...document.body.querySelectorAll('*')].filter(el=>{\n  const rect=el.getBoundingClientRect();\n  return rect.width>0&&rect.right>viewport+1&&getComputedStyle(el).position!=='fixed';\n }).slice(0,5).map(el=>el.tagName.toLowerCase()+'.'+(typeof el.className==='string'?el.className:''));\n const header=document.querySelector('header.site-header, header.interior-header');\n const navigation=[...document.querySelectorAll('header.site-header nav a, header.interior-header .interior-links a')]\n  .filter(link=>{\n   const style=getComputedStyle(link);\n   return style.display!=='none'&&style.visibility!=='hidden';\n  }).map(link=>{\n   const r=link.getBoundingClientRect();\n   return {name:link.textContent.trim().slice(0,40),height:r.height,left:r.left,right:r.right};\n  });\n return {viewport,scroll,offenders,\n  headerPosition:header?getComputedStyle(header).position:null,\n  navigation,themeIsLight:matchMedia('(prefers-color-scheme: light)').matches,\n  reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};\n})()",
     returnByValue:true
    },sessionId);
    const box=data.result?.value;
    if(!box||box.scroll>box.viewport+1)
     throw new Error('Horizontal page overflow for '+profile.name+' '+path+': '+JSON.stringify(box));
    if(!box.navigation.length)
     throw new Error('Primary navigation unavailable for '+profile.name+' '+path);
    if(profile.mobile&&profile.width<=430&&
       box.navigation.some(link=>link.height<43.5||link.left<0||link.right>box.viewport+1))
     throw new Error('Unusable phone navigation target for '+profile.name+' '+path+': '+JSON.stringify(box.navigation));
    if(profile.shortLandscape&&box.headerPosition==='sticky')
     throw new Error('Tall sticky header obscures short landscape viewport: '+profile.name+' '+path);
    if(box.themeIsLight!==(profile.theme==='light')||
       box.reducedMotion!==Boolean(profile.reducedMotion))
     throw new Error('Unexpected emulated color or motion mode: '+profile.name+' '+path);
    passed++;
   }
  }
  console.log('PASS '+passed+' Chromium mobile/tablet layouts and desktop viewports: no horizontal overflow, accessible phone navigation and safe landscape headers');
  console.log('Coverage: '+RESPONSIVE_VIEWPORTS.length+' representative CSS viewports × '+PATHS.length+' public routes; touch, DPR, orientation, desktop mode, light/dark and reduced-motion samples.');
  console.log('Scope: real Chromium with source-rendered public HTML/CSS; not physical iOS/Android/Safari testing, user usability evidence or live network smoke.');
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
