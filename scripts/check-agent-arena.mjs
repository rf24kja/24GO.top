// Real local Chromium test of the public Agent Arena session-review journey.
import {createServer} from 'node:http';
import {readFile,rm} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChromium} from './chromium-startup.mjs';
const root=resolve(fileURLToPath(new URL('../site/',import.meta.url)));
const mime={html:'text/html',js:'text/javascript',mjs:'text/javascript',
 css:'text/css',svg:'image/svg+xml'};
function local(){
 return createServer(async(req,res)=>{
  try{
   const pathname=new URL(req.url,'http://127.0.0.1').pathname;
   const path=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
   if(req.method!=='GET'||!path.startsWith(root+sep)){res.writeHead(403).end();return;}
   const ext=path.split('.').at(-1);
   if(!mime[ext]){res.writeHead(415).end();return;}
   const body=await readFile(path);
   res.writeHead(200,{'content-type':mime[ext],'cache-control':'no-store'}).end(body);
  }catch{res.writeHead(404).end();}
 });
}
class CDP{
 constructor(ws){
  this.ws=ws;this.seq=0;this.pending=new Map();this.errors=[];this.external=[];
  ws.addEventListener('message',event=>{
   const m=JSON.parse(event.data);
   if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params.exceptionDetails.text);
   if(m.method==='Network.requestWillBeSent'&&
       !m.params.request.url.startsWith('http://127.0.0.1:'))this.external.push(m.params.request.url);
   const entry=this.pending.get(m.id);
   if(!entry)return;
   this.pending.delete(m.id);
   if(m.error)entry.reject(Error(m.error.message));else entry.resolve(m.result);
  });
 }
 send(method,params={},sessionId){
  return new Promise((resolve,reject)=>{
   const id=++this.seq;
   const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timeout'));},12000);
   this.pending.set(id,{
    resolve:v=>{clearTimeout(timer);resolve(v)},
    reject:e=>{clearTimeout(timer);reject(e)}
   });
   this.ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
 }
 async evaluate(code,sessionId){
  const response=await this.send('Runtime.evaluate',{
   expression:'('+code.toString()+')()',awaitPromise:true,returnByValue:true
  },sessionId);
  if(response.exceptionDetails)throw Error('Browser JS exception');
  return response.result?.value;
 }
}
async function examine(){
 const file=document.getElementById('arena-file'),
  status=document.getElementById('arena-status'),
  results=document.getElementById('arena-results');
 const answerA='<script>window.hacked = true</script>';
 const session={
  version:1,source:'local-byok',createdAt:'2026-11-15T09:15:00.000Z',
  prompt:'Compare public API isolation methods.',
  agents:[{id:'a',name:'Agent Zero',model:'test-model-A'},
   {id:'b',name:'Agent One',model:'test-model-B'}],
  rounds:[{number:1,responses:[
   {agentId:'a',text:answerA,durationMs:101},
   {agentId:'b',text:'Use nonces and isolation.',durationMs:102}
  ]},{number:2,responses:[
   {agentId:'a',text:'Use scope-aware signed challenges.',durationMs:201},
   {agentId:'b',text:'Use server-owned public keys.',durationMs:202}
  ]}]
 };
 const choose=raw=>{
  const files=new DataTransfer();
  files.items.add(new File([raw],'arena.json',{type:'application/json'}));
  file.files=files.files;
  file.dispatchEvent(new Event('change',{bubbles:true}));
 };
 const pause=async(fn)=>{
  for(let i=0;i<150;i++){
   if(fn())return true;
   await new Promise(ok=>setTimeout(ok,25));
  }
  return false;
 };
 const before=results.hidden&&status.textContent.includes('No session loaded.');
 const storageBefore=localStorage.length;
 choose(JSON.stringify(session));
 const loaded=await pause(()=>!results.hidden);
 const reveal=document.getElementById('arena-reveal');
 const blind=loaded&&document.getElementById('arena-a-name').textContent==='Response A'&&
  document.getElementById('arena-a-model').textContent.includes('hidden')&&
  document.getElementById('arena-a-meta').textContent.includes('hidden')&&
  document.getElementById('arena-b-name').textContent==='Response B'&&
  reveal.getAttribute('aria-pressed')==='false'&&
  document.getElementById('arena-identity-status').textContent.includes('hidden');
 const safe=loaded&&document.getElementById('arena-a-text').textContent===answerA&&
  !document.getElementById('arena-a-text').querySelector('script')&&
  window.hacked!==true&&document.getElementById('arena-a-name').textContent==='Response A';
 const select=document.getElementById('arena-round');
 select.value='2';select.dispatchEvent(new Event('change',{bubbles:true}));
 const next=document.getElementById('arena-a-text').textContent===
  'Use scope-aware signed challenges.';
 const button=document.querySelector('[data-arena-vote="b"]');
 button.focus();button.click();
 const voted=button.getAttribute('aria-pressed')==='true'&&
  document.getElementById('arena-vote-status').textContent.includes('Agent B')&&
  document.activeElement===button;
 select.value='1';select.dispatchEvent(new Event('change',{bubbles:true}));
 const isolated=document.querySelector('[data-arena-vote="b"]').getAttribute('aria-pressed')==='false';
 select.value='2';select.dispatchEvent(new Event('change',{bubbles:true}));
 const remembered=document.querySelector('[data-arena-vote="b"]').getAttribute('aria-pressed')==='true';
 reveal.focus();reveal.click();
 const revealed=reveal.getAttribute('aria-pressed')==='true'&&
  document.activeElement===reveal&&
  document.getElementById('arena-a-name').textContent==='Agent Zero'&&
  document.getElementById('arena-a-model').textContent==='test-model-A'&&
  document.getElementById('arena-a-meta').textContent.includes('201 ms')&&
  document.getElementById('arena-b-name').textContent==='Agent One';
 select.value='1';select.dispatchEvent(new Event('change',{bubbles:true}));
 const independentBlind=document.getElementById('arena-a-name').textContent==='Response A'&&
  reveal.getAttribute('aria-pressed')==='false';
 select.value='2';select.dispatchEvent(new Event('change',{bubbles:true}));
 const rememberedReveal=document.getElementById('arena-a-name').textContent==='Agent Zero';
 reveal.click();
 const reblinded=document.getElementById('arena-a-name').textContent==='Response A'&&
  document.getElementById('arena-a-meta').textContent.includes('hidden')&&
  reveal.getAttribute('aria-pressed')==='false';
 const actionHeight=button.getBoundingClientRect().height;
 const revealHeight=reveal.getBoundingClientRect().height;
 const inputHeight=file.getBoundingClientRect().height;
 const width=document.documentElement.clientWidth;
 const overflow=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
 choose('{"version":2,"verified":true}');
 const invalid=await pause(()=>results.hidden&&status.dataset.error==='true');
 const safeStorage=localStorage.length===storageBefore;
 return {before,loaded,safe,blind,next,voted,isolated,remembered,
  revealed,independentBlind,rememberedReveal,reblinded,
  actionHeight,revealHeight,inputHeight,width,overflow,invalid,safeStorage};
}
async function exerciseTournament(){
 const source=document.getElementById('arena-tournament-files');
 const status=document.getElementById('arena-tournament-status');
 const exportBtn=document.getElementById('arena-tournament-export');
 const clear=document.getElementById('arena-tournament-clear');
 const oldStorage=localStorage.length;
 const make=(textA,textB,day)=>({
  version:1,source:'local-byok',
  createdAt:'2026-11-'+day+'T09:15:00.000Z',
  prompt:'Real locally produced comparison of two agents',
  agents:[{id:'a',name:'Model Alpha',model:'model-a'},
   {id:'b',name:'Model Bravo',model:'model-b'}],
  rounds:[{number:1,responses:[
   {agentId:'a',text:textA,durationMs:12},
   {agentId:'b',text:textB,durationMs:16}
  ]}]
 });
 function choose(raw){
  const transfer=new DataTransfer();
  for(const text of raw)transfer.items.add(new File([text],'match.json',
   {type:'application/json'}));
  source.files=transfer.files;
  source.dispatchEvent(new Event('change',{bubbles:true}));
 }
 async function until(fn){
  for(let i=0;i<120;i++){
   if(fn())return true;
   await new Promise(ok=>setTimeout(ok,25));
  }
  return false;
 }
 const first=JSON.stringify(make('A initial real model answer','B initial real model answer','14'));
 const second=JSON.stringify(make('A corrected answer','B corrected answer','15'));
 const before=exportBtn.disabled&&clear.disabled&&
  status.textContent.includes('Choose two to eight');
 choose([first,second]);
 const loaded=await until(()=>document.querySelectorAll('.arena-tournament-match').length===2);
 const nodes=[...document.querySelectorAll('.arena-tournament-match')];
 const one=nodes[0].querySelectorAll('button');
 one[0].focus();one[0].click();
 const firstVote=document.querySelectorAll('.arena-tournament-match')[0]
  .querySelectorAll('button')[0].getAttribute('aria-pressed')==='true';
 const secondRow=document.querySelectorAll('.arena-tournament-match')[1];
 secondRow.querySelectorAll('button')[1].click();
 const secondVote=document.querySelectorAll('.arena-tournament-match')[1]
  .querySelectorAll('button')[1].getAttribute('aria-pressed')==='true';
 const scoreboard=document.querySelector('.arena-tournament-table');
 const scored=scoreboard?.querySelectorAll('tbody tr').length===2&&
  status.textContent.includes('Human decisions: 2')&&
  [...scoreboard.querySelectorAll('tbody tr')].every(row=>
   row.textContent.includes('50.0%'));
 const oldURL=URL.createObjectURL,oldRevoke=URL.revokeObjectURL,
  oldClick=HTMLAnchorElement.prototype.click;
 let fileBlob=null,filename='',revoked=false;
 URL.createObjectURL=blob=>{fileBlob=blob;return 'blob:local-review-test'};
 URL.revokeObjectURL=url=>{revoked=url==='blob:local-review-test'};
 HTMLAnchorElement.prototype.click=function(){filename=this.download;};
 try{exportBtn.click();}
 finally{
  URL.createObjectURL=oldURL;
  URL.revokeObjectURL=oldRevoke;
  HTMLAnchorElement.prototype.click=oldClick;
 }
 const markdown=fileBlob?await fileBlob.text():'';
 const exported=filename==='24gotop-local-arena-review.md'&&revoked&&
  markdown.includes('Human-reviewed: 2')&&
  markdown.includes('Agent Arena review')&&
  !markdown.includes('A initial real model answer')&&
  !markdown.includes('Real locally produced comparison');
 const touch=document.querySelector('.arena-tournament-match button').getBoundingClientRect().height>=43.5&&
  source.getBoundingClientRect().height>=43.5;
 const width=document.documentElement.clientWidth,
  scroll=Math.max(document.body.scrollWidth,document.documentElement.scrollWidth);
 choose([first,first]);
 const duplicates=await until(()=>status.dataset.error==='true'&&
  document.querySelectorAll('.arena-tournament-match').length===0);
 const storage=localStorage.length===oldStorage;
 return {before,loaded,firstVote,secondVote,scored,exported,touch,duplicates,
  storage,width,scroll};
}

async function main(){
 const http=local();let browser,ws;
 try{
  await new Promise((done,fail)=>{http.once('error',fail);http.listen(0,'127.0.0.1',done);});
  const origin='http://127.0.0.1:'+http.address().port;
  browser=await launchChromium({profilePrefix:'24gotop-agent-arena-'});
  ws=new WebSocket(browser.address);
  await new Promise((done,fail)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});});
  const c=new CDP(ws);
  const {targetId}=await c.send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await c.send('Target.attachToTarget',{targetId,flatten:true});
  for(const method of ['Page.enable','Runtime.enable','Network.enable'])
   await c.send(method,{},sessionId);
  for(const width of [280,390,844,1440]){
   await c.send('Emulation.setDeviceMetricsOverride',{
    width,height:width===844?390:850,deviceScaleFactor:1,mobile:width<1000
   },sessionId);
   await c.send('Page.navigate',{url:origin+'/arena/'},sessionId);
   // Page load is asynchronous. Wait for the module-installed change listener.
   await new Promise(ok=>setTimeout(ok,150));
   const got=await c.evaluate(examine,sessionId);
   const tournament=await c.evaluate(exerciseTournament,sessionId);
   if(!tournament||Object.entries(tournament).some(([k,v])=>
      ['before','loaded','firstVote','secondVote','scored','exported',
       'touch','duplicates','storage'].includes(k)&&!v)||
      tournament.scroll>tournament.width+1)
    throw Error('Arena local tournament browser E2E '+width+': '+JSON.stringify(tournament));
   if(!got||Object.entries(got).some(([k,v])=>
      ['before','loaded','safe','blind','next','voted','isolated',
       'remembered','revealed','independentBlind','rememberedReveal',
       'reblinded','invalid','safeStorage'].includes(k)&&!v)||
      got.overflow>got.width+1||got.actionHeight<43.5||
      got.revealHeight<43.5||got.inputHeight<43.5)
    throw Error('Arena browser E2E '+width+': '+JSON.stringify(got));
  }
  if(c.errors.length||c.external.length)
   throw Error('Browser errors or external requests: '+c.errors.join(';')+'; '+c.external.join(';'));
  console.log('PASS Arena Chromium: 280/390/844/1440px, blind round review and per-round reveal, individual bouts and local two-match tournament, private votes, scoreboard, Markdown export, duplicate rejection, no upload');
 }finally{
  if(ws)ws.close();
  if(browser){
   browser.proc.kill('SIGKILL');
   await new Promise(resolve=>{
    if(browser.proc.exitCode!==null||browser.proc.signalCode!==null)return resolve();
    browser.proc.once('exit',resolve);
   });
   await rm(browser.profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
  await new Promise(resolve=>http.close(resolve));
 }
}
main().catch(e=>{console.error('FAIL Arena browser E2E:',e.message);process.exitCode=1;});
