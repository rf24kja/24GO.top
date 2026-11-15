/**
 * Actual Chromium + loopback HTTP + signed Ed25519 agents + fake provider E2E.
 * Never reaches a paid AI endpoint, production site or private hosted Core.
 */
import {generateKeyPairSync} from 'node:crypto';
import {rm} from 'node:fs/promises';
import {launchChromium} from './chromium-startup.mjs';
import {startLocalArenaConsole} from '../packages/arena/console-server.mjs';

function config(){
 const identity=(name,ownerId,agentId)=>{
  const keys=generateKeyPairSync('ed25519');
  return {ownerId,agentId,privateKeyPem:keys.privateKey.export({
   type:'pkcs8',format:'pem'
  })};
 };
 return {
  agents:[
   {name:'Actual Model Alpha',model:'alpha-v1',
    endpoint:'https://mocked-provider.example/v1/chat/completions',key:'never-visible-alpha-secret'},
   {name:'Actual Model Bravo',model:'bravo-v1',
    endpoint:'https://mocked-provider.example/v1/chat/completions',key:'never-visible-bravo-secret'}
  ],
  identities:[identity('A','owner-alpha','signed-alpha'),
   identity('B','owner-bravo','signed-bravo')]
 };
}
class CDP{
 constructor(ws){
  this.ws=ws;this.id=0;this.pending=new Map();this.exceptions=[];this.external=[];
  ws.addEventListener('message',e=>{
   const msg=JSON.parse(e.data);
   if(msg.method==='Runtime.exceptionThrown')
    this.exceptions.push(msg.params.exceptionDetails.text);
   if(msg.method==='Network.requestWillBeSent'&&
      msg.params.request.url.startsWith('http')&&
      !msg.params.request.url.startsWith('http://127.0.0.1:'))
    this.external.push(msg.params.request.url);
   const wait=this.pending.get(msg.id);
   if(!wait)return;
   this.pending.delete(msg.id);
   if(msg.error)wait.reject(Error(msg.error.message));
   else wait.resolve(msg.result);
  });
 }
 request(method,params={},sessionId){
  return new Promise((resolve,reject)=>{
   const id=++this.id;
   const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timeout'));},20000);
   this.pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},
    reject:e=>{clearTimeout(timer);reject(e)}});
   this.ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
 }
 async evaluate(fn,sessionId){
  const result=await this.request('Runtime.evaluate',{
   expression:'('+fn.toString()+')()',returnByValue:true,awaitPromise:true
  },sessionId);
  if(result.exceptionDetails)throw Error('Browser JS exception');
  return result.result?.value;
 }
}
async function inspectConsole(){
 for(let tries=0;tries<120;tries++){
  const status=document.getElementById('status');
  if(status?.textContent.includes('Local console is ready'))break;
  await new Promise(resolve=>setTimeout(resolve,30));
 }
 const prompt=document.getElementById('question');
 const consent=document.getElementById('cost-consent');
 const form=document.getElementById('console-form');
 const button=document.getElementById('run');
 const status=document.getElementById('status');
 const initial=status.textContent.includes('Local console is ready')&&!button.disabled;
 const credentialHidden=location.hash===''&&
  !document.documentElement.outerHTML.includes('never-visible-alpha-secret')&&
  !document.documentElement.outerHTML.includes('BEGIN PRIVATE KEY')&&
  localStorage.length===0&&sessionStorage.length===0;
 prompt.value='How would you safely sandbox third-party static HTML and JavaScript?';
 document.getElementById('rounds').value='2';
 consent.checked=true;
 form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 let ready=false;
 for(let i=0;i<150;i++){
  if(!document.getElementById('results').hidden){ready=true;break;}
  await new Promise(ok=>setTimeout(ok,30));
 }
 const session=ready&&
  document.getElementById('agent-a-name').textContent==='Actual Model Alpha'&&
  document.getElementById('agent-b-name').textContent==='Actual Model Bravo'&&
  document.getElementById('agent-a-answer').textContent.includes('alpha-v1')&&
  document.getElementById('agent-b-answer').textContent.includes('bravo-v1')&&
  document.getElementById('status').textContent.includes('2 run(s) remain');
 const round=document.getElementById('round-choice');
 round.value='2';
 round.dispatchEvent(new Event('change',{bubbles:true}));
 const second=document.getElementById('agent-a-answer').textContent.includes('round 2')&&
  document.getElementById('round-count').textContent==='Round 2 / 2';
 let blob=null,filename='',revoked=false;
 const origURL=URL.createObjectURL,origRevoke=URL.revokeObjectURL,
  origClick=HTMLAnchorElement.prototype.click;
 URL.createObjectURL=data=>{blob=data;return 'blob:local-console-e2e'};
 URL.revokeObjectURL=url=>{revoked=url==='blob:local-console-e2e'};
 HTMLAnchorElement.prototype.click=function(){filename=this.download;};
 try{document.getElementById('download').click();}
 finally{
  URL.createObjectURL=origURL;URL.revokeObjectURL=origRevoke;
  HTMLAnchorElement.prototype.click=origClick;
 }
 const json=blob?JSON.parse(await blob.text()):null;
 const downloaded=filename==='24gotop-local-agent-arena.json'&&revoked&&
  json?.rounds?.length===2&&json.source==='local-byok'&&
  !JSON.stringify(json).includes('never-visible')&&
  !JSON.stringify(json).includes('owner-');
 const width=document.documentElement.clientWidth;
 const scroll=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
 const touch=button.getBoundingClientRect().height>=43.5&&
  document.getElementById('download').getBoundingClientRect().height>=43.5;
 return {initial,credentialHidden,ready,session,second,downloaded,touch,
  width,scroll,noStorage:localStorage.length===0&&sessionStorage.length===0};
}
async function main(){
 let browser,ws,server;
 try{
  const calls=[];
  server=await startLocalArenaConsole({config:config(),fetcher:async(url,options)=>{
   const data=JSON.parse(options.body);
   calls.push(data);
   return new Response(JSON.stringify({
    choices:[{message:{content:'Real mocked '+data.model+' round '+
     (data.messages[2].content.includes('<previous_self>')?'2':'1')}}]
   }),{status:200});
  }});
  browser=await launchChromium({profilePrefix:'24gotop-local-console-'});
  ws=new WebSocket(browser.address);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});
   ws.addEventListener('error',bad,{once:true});});
  const c=new CDP(ws);
  const {targetId}=await c.request('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await c.request('Target.attachToTarget',{targetId,flatten:true});
  for(const m of ['Page.enable','Runtime.enable','Network.enable'])
   await c.request(m,{},sessionId);
  for(const width of [280,390,844,1440]){
   await c.request('Emulation.setDeviceMetricsOverride',{
    width,height:width===844?390:850,mobile:width<1000,deviceScaleFactor:1
   },sessionId);
   await c.request('Page.navigate',{url:server.launchUrl},sessionId);
   const data=await c.evaluate(inspectConsole,sessionId);
   if(!data||Object.entries(data).some(([key,value])=>
     ['initial','credentialHidden','ready','session','second',
      'downloaded','touch','noStorage'].includes(key)&&!value)||
      data.scroll>data.width+1)
    throw Error('Live loopback Arena Chromium '+width+': '+JSON.stringify(data));
  }
  if(calls.length!==16||calls.some(x=>x.max_tokens!==400))
   throw Error('Unexpected actual model request count or output token budget');
  if(c.exceptions.length||c.external.length)
   throw Error('Browser errors or outbound URLs: '+
    c.exceptions.join(';')+' / '+c.external.join(';'));
  console.log('PASS Chromium loopback Arena: real signed two-model HTTP session, two rounds, private download and 280/390/844/1440 layouts');
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
  if(server)await server.close();
 }
}
main().catch(error=>{console.error('FAIL loopback Arena Chromium:',error.message);process.exitCode=1;});
