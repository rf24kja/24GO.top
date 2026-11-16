// Actual PUBLIC Library and first-party app interactions in local Chromium.
import {createServer} from 'node:http';
import {readFile,rm} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateRawSync} from 'node:zlib';
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
 async evaluate(fn,sessionId,...args){
  const result=await this.request('Runtime.evaluate',{
   expression:'('+fn.toString()+')('+args.map(x=>JSON.stringify(x)).join(',')+')',awaitPromise:true,returnByValue:true
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
 const initial=cards().length===3;
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
 // Exercise the real Blob download without letting Chromium write a test file.
 let downloadable=false;
 const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
 const oldClick=HTMLAnchorElement.prototype.click;
 let blob=null,downloads=0,revoked=0,filename='';
 try{
  URL.createObjectURL=value=>{blob=value;return 'blob:http://127.0.0.1/library-test';};
  URL.revokeObjectURL=url=>{if(url==='blob:http://127.0.0.1/library-test')revoked++;};
  HTMLAnchorElement.prototype.click=function(){
   if(this.download){downloads++;filename=this.download;}
  };
  const button=document.getElementById('compare-download');
  const ready=!button.disabled&&button.getBoundingClientRect().height>=43.5;
  button.click();
  await new Promise(done=>setTimeout(done,35));
  const markdown=blob&&await blob.text();
  downloadable=ready&&downloads===1&&
   filename==='24gotop-library-comparison.md'&&
   blob.type==='text/markdown;charset=utf-8'&&
   markdown.startsWith('# 24GOTOP Library — static app comparison')&&
   markdown.includes('## JSON Inspector')&&
   markdown.includes('## Contrast Checker')&&
   markdown.includes('https://github.com/rf24kja/24GO.top/tree/main/site/library/apps/contrast-checker')&&
   !markdown.includes('Authorization: Bearer')&&
   revoked===1&&document.getElementById('compare-export-status').textContent.includes('download requested');
 }finally{
  URL.createObjectURL=oldCreate;
  URL.revokeObjectURL=oldRevoke;
  HTMLAnchorElement.prototype.click=oldClick;
 }
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
  document.getElementById('compare-download').disabled&&
  document.getElementById('compare-count').textContent==='0 of 2 selected';
 const width=document.documentElement.clientWidth;
 return {initial,searched,category,selected,compared,downloadable,launched,opaque,closed,cleared,
  width,scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
  actionHeight:launch.getBoundingClientRect().height,
  noStorage:localStorage.length===storageBefore};
}

function demoZipFixture(){
 const name=Buffer.from('index.html');
 const source=Buffer.from('<html lang="en"><head><title>Browser ZIP Test App</title></head><body>Offline app</body></html>');
 let crc=0xffffffff;
 for(const v of source){crc^=v;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 crc=(crc^0xffffffff)>>>0;
 const compressed=deflateRawSync(source);
 const local=Buffer.alloc(30);
 local.writeUInt32LE(0x04034b50,0);
 local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);
 local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);
 local.writeUInt32LE(source.length,22);local.writeUInt16LE(name.length,26);
 const central=Buffer.alloc(46);
 central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);
 central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);
 central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);
 central.writeUInt32LE(source.length,24);central.writeUInt16LE(name.length,28);
 const offset=local.length+name.length+compressed.length;
 const eocd=Buffer.alloc(22);
 eocd.writeUInt32LE(0x06054b50,0);
 eocd.writeUInt16LE(1,8);eocd.writeUInt16LE(1,10);
 eocd.writeUInt32LE(central.length+name.length,12);eocd.writeUInt32LE(offset,16);
 return Buffer.concat([local,name,compressed,central,name,eocd]).toString('base64');
}
async function exerciseIntakeBrowser(validBase64){
 const $=id=>document.getElementById(id);
 const zip=$('library-zip'),status=$('library-intake-status');
 const beforeStorage=localStorage.length;
 const bytes=Uint8Array.from(atob(validBase64),c=>c.charCodeAt(0));
 const put=(blob,name)=>{
  const transfer=new DataTransfer();
  transfer.items.add(new File([blob],name,{type:'application/zip'}));
  zip.files=transfer.files;
  zip.dispatchEvent(new Event('change',{bubbles:true}));
 };
 const waitFor=async(fn)=>{
  for(let i=0;i<220;i++){
   if(fn())return true;
   await new Promise(done=>setTimeout(done,35));
  }
  return false;
 };
 const originally=$('library-intake-results').hidden;
 put(bytes,'good.zip');
 $('library-validate').click();
 const succeeded=await waitFor(()=>$('library-intake-results').hidden===false||
  status.dataset.error==='true');
 const accepted=succeeded&&!$('library-intake-results').hidden&&
  status.textContent.includes('passed')&&
  $('library-intake-files').children.length===1&&
  /[a-f0-9]{64}/.test($('library-intake-summary').textContent);
 const original=Object.getOwnPropertyDescriptor(navigator,'clipboard');
 let manual=false;
 try{
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
   async writeText(){throw Error('Denied in test');}
  }});
  $('library-copy-report').click();
  manual=await waitFor(()=>$('library-copy-fallback').hidden===false)&&
   $('library-copy-fallback').value.includes('LOCAL SOURCE CHECK ONLY')&&
   document.activeElement===$('library-copy-fallback');
 }finally{
  if(original)Object.defineProperty(navigator,'clipboard',original);
  else delete navigator.clipboard;
 }
 const name=$('library-app-name'),source=$('library-app-source');
 name.value='Browser Test Utility';
 source.value='https://github.com/example/utility';
 name.dispatchEvent(new Event('input',{bubbles:true}));
 source.dispatchEvent(new Event('input',{bubbles:true}));
 const link=$('library-review-link'),parsed=!link.hidden?new URL(link.href):null;
 const body=parsed?.searchParams.get('body')||'';
 const reviewReady=parsed?.origin==='https://github.com'&&
  parsed.pathname==='/rf24kja/24GO.top/issues/new'&&
  body.includes('Browser Test Utility')&&
  body.includes('https://github.com/example/utility')&&
  !body.includes('Offline app')&&
  body.includes('No ZIP was uploaded')&&
  link.target==='_blank';
 source.value='javascript:alert(1)';
 source.dispatchEvent(new Event('input',{bubbles:true}));
 const badSource=link.hidden;
 // Corrupt the accepted ZIP by changing one CRC byte (central directory).
 const tampered=new Uint8Array(bytes);
 const centralAt=tampered.findIndex((v,i)=>i>0&&
  v===0x50&&tampered[i+1]===0x4b&&tampered[i+2]===0x01&&tampered[i+3]===0x02);
 if(centralAt>0)tampered[centralAt+16]^=1;
 put(tampered,'tampered.zip');
 $('library-validate').click();
 const rejected=await waitFor(()=>status.dataset.error==='true')&&
  $('library-intake-results').hidden&&link.hidden;
 $('library-intake-clear').click();
 const reset=zip.value===''&&$('library-validate').disabled&&
  $('library-intake-results').hidden&&!$('library-review-link').hasAttribute('href');
 const viewport=document.documentElement.clientWidth;
 const overflow=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
 return {originally,accepted,manual,reviewReady,badSource,rejected,reset,
  noStorage:localStorage.length===beforeStorage,
  buttonHeight:$('library-intake-clear').getBoundingClientRect().height,
  viewport,overflow};
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
function exerciseTextDiff(){
 const left=document.getElementById('before'),right=document.getElementById('after');
 const originalStorage=localStorage.length;
 left.value='alpha\n<script>window.hacked=true</script>\nremoved';
 right.value='alpha\n<script>window.hacked=true</script>\nadded';
 document.getElementById('compare').click();
 const diff=document.getElementById('diff');
 const added=document.getElementById('added-count').textContent;
 const removed=document.getElementById('removed-count').textContent;
 const same=document.getElementById('same-count').textContent;
 const compared=added==='1'&&removed==='1'&&same==='2'&&
  diff.children.length===4&&
  diff.textContent.includes('window.hacked=true')&&
  !diff.querySelector('script')&&window.hacked!==true;
 document.getElementById('swap').click();
 const swapped=left.value.includes('added')&&right.value.includes('removed')&&
  document.getElementById('added-count').textContent==='1'&&
  document.getElementById('removed-count').textContent==='1';
 document.getElementById('clear').click();
 const cleared=diff.children.length===0&&left.value===''&&right.value===''&&
  document.activeElement===left;
 left.value=new Array(121).fill('over-limit').join('\n');
 document.getElementById('compare').click();
 const bounded=document.getElementById('status').dataset.error==='true'&&
  !diff.children.length;
 const width=document.documentElement.clientWidth;
 return {compared,swapped,cleared,bounded,noStorage:localStorage.length===originalStorage,
  width,scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
  height:document.getElementById('compare').getBoundingClientRect().height};
}
async function exerciseStudio(){
 const $=id=>document.getElementById(id);
 // Browser tests explicitly accept ordinary destructive changes, then verify
 // that cancelling each confirmation preserves real in-tab author source.
 const realConfirm=window.confirm;
 let confirmations=0;
 window.confirm=()=>{confirmations++;return true;};
 const beforeStorage=localStorage.length,front=$('studio-frame');
 const initial=front.hidden&&$('studio-preview-placeholder').hidden===false&&
  $('studio-name').value==='Counter Lab'&&
  $('studio-html').value.includes('id="increase"')&&
  $('studio-css').value.includes('.count')&&
  $('studio-js').value.includes("getElementById('increase')");
 $('studio-tab-css').click();
 const tab=$('studio-source-css').hidden===false&&
  $('studio-tab-css').getAttribute('aria-pressed')==='true'&&
  $('studio-source-html').hidden===true;
 $('studio-tab-js').click();
 const js=$('studio-js');
 js.value+="\nwindow.addEventListener('message', function(event) {\n"+
  " if (event.data !== 'studio-probe') return;\n"+
  " document.getElementById('increase').click();\n"+
  " event.source.postMessage({studioProbe: document.getElementById('count').textContent}, '*');\n"+
  "});";
 js.dispatchEvent(new Event('input',{bubbles:true}));
 $('studio-preview-run').click();
 const waitFor=async(fn)=>{
  for(let i=0;i<160;i++){
   if(fn())return true;
   await new Promise(done=>setTimeout(done,30));
  }
  return false;
 };
 const running=await waitFor(()=>$('studio-status').textContent.includes('Isolated preview running'));
 const frame=front;
 const sandbox=running&&!frame.hidden&&
  frame.getAttribute('sandbox')==='allow-scripts'&&
  !frame.sandbox.contains('allow-same-origin')&&
  !frame.sandbox.contains('allow-top-navigation')&&
  !frame.sandbox.contains('allow-popups')&&
  !frame.sandbox.contains('allow-forms')&&
  frame.referrerPolicy==='no-referrer'&&
  frame.getAttribute('srcdoc').includes("connect-src 'none'")&&
  frame.getAttribute('srcdoc').includes("default-src 'none'");
 let opaque=false;
 try{opaque=frame.contentDocument===null;}catch{opaque=true;}
 let interactive=false,childOrigin='';
 if(running){
  for(let attempt=0;attempt<3&&!interactive;attempt++){
   const result=await new Promise(resolve=>{
    const timer=setTimeout(()=>{window.removeEventListener('message',onMessage);resolve(null)},550);
    function onMessage(event){
     if(event.source!==frame.contentWindow||event.data?.studioProbe!=='1')return;
     clearTimeout(timer);
     window.removeEventListener('message',onMessage);
     resolve({count:event.data.studioProbe,origin:event.origin});
    }
    window.addEventListener('message',onMessage);
    frame.contentWindow.postMessage('studio-probe','*');
   });
   if(result){interactive=result.count==='1';childOrigin=result.origin;}
  }
 }
 let blob=null,filename='',revoked=false;
 const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL,
  originalClick=HTMLAnchorElement.prototype.click;
 try{
  URL.createObjectURL=next=>{blob=next;return 'blob:studio-zip-test'};
  URL.revokeObjectURL=url=>{revoked=url==='blob:studio-zip-test'};
  HTMLAnchorElement.prototype.click=function(){filename=this.download;};
  $('studio-download').click();
  await waitFor(()=>$('studio-status').textContent.includes('download requested'));
 }finally{
  URL.createObjectURL=originalCreate;
  URL.revokeObjectURL=originalRevoke;
  HTMLAnchorElement.prototype.click=originalClick;
 }
 const archive=blob?new Uint8Array(await blob.arrayBuffer()):null;
 const exported=filename==='counter-lab.zip'&&revoked&&
  blob.type==='application/zip'&&archive.length>100&&
  archive[0]===0x50&&archive[1]===0x4b&&archive[2]===0x03&&archive[3]===0x04&&
  $('studio-status').textContent.includes('SHA-256');
 const downloadedStillDirty=$('studio-save-status').dataset.unsaved==='true';
 const width=document.documentElement.clientWidth;
 const overflow=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
 const touch=$('studio-preview-run').getBoundingClientRect().height>=43.5&&
  $('studio-download').getBoundingClientRect().height>=43.5&&
  $('studio-tab-js').getBoundingClientRect().height>=43.5;
 $('studio-html').value='<script>window.bad=true</script>';
 $('studio-html').dispatchEvent(new Event('input',{bubbles:true}));
 const stopped=frame.hidden&&$('studio-close').disabled;
 $('studio-preview-run').click();
 const rejected=await waitFor(()=>$('studio-status').dataset.error==='true')&&
  frame.hidden&&!frame.hasAttribute('srcdoc')&&window.bad!==true;
 $('studio-reset').click();
 const restored=$('studio-name').value==='Counter Lab'&&
  $('studio-html').value.includes('id="increase"')&&
  $('studio-tab-html').getAttribute('aria-pressed')==='true';
 const importFile=$('studio-import-file');
 function putStudioZip(bytes,name='previous-studio.zip'){
  const transfer=new DataTransfer();
  transfer.items.add(new File([bytes],name,{type:'application/zip'}));
  importFile.files=transfer.files;
  importFile.dispatchEvent(new Event('change',{bubbles:true}));
 }
 $('studio-name').value='Temporary Draft';
 putStudioZip(archive);
 const importEnabled=!$('studio-import-check').disabled;
 $('studio-import-check').click();
 const imported=await waitFor(()=>$('studio-import-status').textContent.includes('Imported Counter Lab'))&&
  $('studio-name').value==='Counter Lab'&&
  $('studio-js').value.includes('studio-probe')&&
  frame.hidden&&$('studio-close').disabled&&
  $('studio-status').textContent.includes('Preview is stopped');
 const beforeCorrupt=$('studio-js').value;
 const corrupted=new Uint8Array(archive);
 corrupted[65]^=1;
 putStudioZip(corrupted);
 $('studio-import-check').click();
 const corruptRejected=await waitFor(()=>$('studio-import-status').dataset.error==='true')&&
  $('studio-js').value===beforeCorrupt&&frame.hidden;
 // A deliberately delayed real File read must never replace newer author edits.
 const originalRead=File.prototype.arrayBuffer;
 let importRaceEdit=false,importRaceReset=false;
 try{
  for(const mode of ['edit','reset']){
   let release;
   File.prototype.arrayBuffer=function(){
    if(this.name==='race-studio.zip')return new Promise(resolve=>{
     release=()=>resolve(archive.buffer.slice(archive.byteOffset,archive.byteOffset+archive.byteLength));
    });
    return originalRead.call(this);
   };
   putStudioZip(archive,'race-studio.zip');
   $('studio-import-check').click();
   if(!await waitFor(()=>typeof release==='function'))throw Error('Delayed ZIP read not entered');
   if(mode==='edit'){
    $('studio-name').value='New Author Edits';
    $('studio-name').dispatchEvent(new Event('input',{bubbles:true}));
   }else $('studio-reset').click();
   const cancelled=$('studio-import-status').textContent.includes('import cancelled');
   release();
   await new Promise(done=>setTimeout(done,90));
   const preserved=mode==='edit'?
    $('studio-name').value==='New Author Edits':
    $('studio-name').value==='Counter Lab'&&!$('studio-js').value.includes('studio-probe');
   const safe=cancelled&&preserved&&
    $('studio-import-check').disabled===false&&front.hidden;
   if(mode==='edit')importRaceEdit=safe;
   else importRaceReset=safe;
  }
 }finally{File.prototype.arrayBuffer=originalRead;}
 // The no-JavaScript static example is a real author path, not just a unit fixture.
 $('studio-static').click();
 const staticReady=$('studio-name').value==='Static Resource Card'&&
  $('studio-js').value===''&&$('studio-css').value.length>0&&
  $('studio-html').value.includes('Useful resources')&&front.hidden;
 $('studio-preview-run').click();
 const staticRunning=await waitFor(()=>$('studio-status').textContent.includes('Isolated preview running'));
 const staticPreview=staticRunning&&!front.hidden&&front.sandbox.length===1&&
  front.sandbox.contains('allow-scripts')&&
  !front.sandbox.contains('allow-same-origin')&&
  front.getAttribute('srcdoc').includes('<script></script>')&&
  front.getAttribute('srcdoc').includes('Useful resources')&&
  front.getAttribute('srcdoc').includes("connect-src 'none'");
 let staticBlob=null,staticName='';
 const staticCreate=URL.createObjectURL,staticRevoke=URL.revokeObjectURL,
  staticClick=HTMLAnchorElement.prototype.click;
 try{
  URL.createObjectURL=value=>{staticBlob=value;return 'blob:studio-static-e2e';};
  URL.revokeObjectURL=()=>{};
  HTMLAnchorElement.prototype.click=function(){staticName=this.download;};
  $('studio-download').click();
  await waitFor(()=>$('studio-status').textContent.includes('download requested'));
 }finally{
  URL.createObjectURL=staticCreate;
  URL.revokeObjectURL=staticRevoke;
  HTMLAnchorElement.prototype.click=staticClick;
 }
 const staticZip=staticBlob?new Uint8Array(await staticBlob.arrayBuffer()):null;
 const staticExported=staticName==='static-resource-card.zip'&&staticZip?.length>100&&
  staticZip[0]===0x50&&staticZip[1]===0x4b;
 if(staticZip)putStudioZip(staticZip,'static-page.zip');
 $('studio-import-check').click();
 const staticImported=await waitFor(()=>$('studio-import-status').textContent.includes('Imported Static Resource Card'))&&
  $('studio-js').value===''&&$('studio-css').value.length>0&&
  front.hidden&&$('studio-close').disabled;
 // Import is a recoverable baseline, unlike a mere ZIP download request.
 const cleanImport=$('studio-save-status').dataset.unsaved==='false';
 const cleanEvent=new Event('beforeunload',{cancelable:true});
 window.dispatchEvent(cleanEvent);
 const cleanNavigation=!cleanEvent.defaultPrevented;
 const originalCss=$('studio-css').value;
 $('studio-css').value+=' /* in-progress change */';
 $('studio-css').dispatchEvent(new Event('input',{bubbles:true}));
 const dirtyNotice=$('studio-save-status').dataset.unsaved==='true'&&
  $('studio-save-status').textContent.includes('Unsaved source');
 const dirtyEvent=new Event('beforeunload',{cancelable:true});
 window.dispatchEvent(dirtyEvent);
 const dirtyNavigation=dirtyEvent.defaultPrevented;
 // Replacing a dirty template must be opt-in, and cancellation must not
 // stop a correctly running opaque preview or alter any source.
 $('studio-preview-run').click();
 const previewReady=await waitFor(()=>$('studio-status').textContent.includes('Isolated preview running'));
 const previewHtml=front.getAttribute('srcdoc');
 let denies=0;
 window.confirm=()=>{denies++;return false;};
 $('studio-reset').click();
 const declinedTemplate=previewReady&&!front.hidden&&
  front.getAttribute('srcdoc')===previewHtml&&
  $('studio-css').value===originalCss+' /* in-progress change */'&&
  $('studio-save-status').dataset.unsaved==='true'&&
  $('studio-status').textContent.includes('cancelled');
 putStudioZip(archive,'confirm-studio.zip');
 $('studio-import-check').click();
 const declinedImport=await waitFor(()=>$('studio-import-status').textContent.includes('ZIP import cancelled'))&&
  !front.hidden&&front.getAttribute('srcdoc')===previewHtml&&
  $('studio-css').value===originalCss+' /* in-progress change */'&&
  $('studio-save-status').dataset.unsaved==='true';
 // A confirmation callback that re-enters editor input must never allow the
 // validated, now stale ZIP to replace newer text.
 window.confirm=()=>{
  $('studio-css').value+=' /* newest author change */';
  $('studio-css').dispatchEvent(new Event('input',{bubbles:true}));
  return true;
 };
 putStudioZip(archive,'reentrant-studio.zip');
 $('studio-import-check').click();
 const reentrantProtected=await waitFor(()=>
  $('studio-import-status').textContent.includes('import cancelled'))&&
  $('studio-css').value.includes('newest author change')&&front.hidden&&
  $('studio-name').value==='Static Resource Card';
 // Reverting the exact changed field restores the imported-file baseline.
 $('studio-css').value=originalCss;
 $('studio-css').dispatchEvent(new Event('input',{bubbles:true}));
 const reverted=$('studio-save-status').dataset.unsaved==='false';
 const revertedEvent=new Event('beforeunload',{cancelable:true});
 window.dispatchEvent(revertedEvent);
 const revertNavigation=!revertedEvent.defaultPrevented;
 window.confirm=()=>true;
 $('studio-reset').click();
 const resetClean=$('studio-name').value==='Counter Lab'&&
  $('studio-save-status').dataset.unsaved==='false';
 window.confirm=realConfirm;
 const staticButtonHeight=$('studio-static').getBoundingClientRect().height;
 const importButtonHeight=$('studio-import-check').getBoundingClientRect().height;
 return {initial,tab,running,sandbox,opaque,interactive,
  childOrigin,exported,touch,stopped,rejected,restored,
  importEnabled,imported,corruptRejected,importRaceEdit,importRaceReset,
  staticReady,staticPreview,staticExported,staticImported,
  cleanImport,cleanNavigation,dirtyNotice,dirtyNavigation,declinedTemplate,
  declinedImport,reentrantProtected,downloadedStillDirty,reverted,revertNavigation,resetClean,
  consentInvoked:confirmations>0&&denies===2,staticButtonHeight,importButtonHeight,
  noStorage:localStorage.length===beforeStorage,
  width,overflow};
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
      ['initial','searched','category','selected','compared','downloadable','launched','opaque','closed','cleared','noStorage'].includes(key)&&!value)||
      result.scroll>result.width+1||result.actionHeight<43.5)
    throw Error('Library catalog Chromium '+width+': '+JSON.stringify(result));
   const intake=await c.evaluate(exerciseIntakeBrowser,sessionId,demoZipFixture());
   if(!intake||Object.entries(intake).some(([key,value])=>
      ['originally','accepted','manual','reviewReady','badSource','rejected','reset','noStorage'].includes(key)&&!value)||
      intake.buttonHeight<43.5||intake.overflow>intake.viewport+1)
    throw Error('Library ZIP browser intake '+width+': '+JSON.stringify(intake));
  }
  for(const width of [280,390,844,1440]){
   await c.request('Emulation.setDeviceMetricsOverride',{
    width,height:width===844?390:850,mobile:width<1000,deviceScaleFactor:1
   },sessionId);
   await c.request('Page.navigate',{url:origin+'/library/studio/'},sessionId);
   await new Promise(ok=>setTimeout(ok,160));
   const studio=await c.evaluate(exerciseStudio,sessionId);
   if(!studio||Object.entries(studio).some(([key,value])=>
      ['initial','tab','running','sandbox','opaque','interactive',
       'exported','touch','stopped','rejected','restored','noStorage',
       'importEnabled','imported','corruptRejected','importRaceEdit','importRaceReset',
       'staticReady','staticPreview','staticExported','staticImported',
       'cleanImport','cleanNavigation','dirtyNotice','dirtyNavigation',
       'declinedTemplate','declinedImport','reentrantProtected','downloadedStillDirty',
       'reverted','revertNavigation','resetClean','consentInvoked'].includes(key)&&!value)||
      studio.childOrigin!=='null'||studio.staticButtonHeight<43.5||studio.importButtonHeight<43.5||studio.overflow>studio.width+1)
    throw Error('Library App Studio Chromium '+width+': '+JSON.stringify(studio));
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
   await c.request('Page.navigate',{url:origin+'/library/apps/text-diff/'},sessionId);
   await new Promise(ok=>setTimeout(ok,200));
   const diff=await c.evaluate(exerciseTextDiff,sessionId);
   if(!diff.compared||!diff.swapped||!diff.cleared||!diff.bounded||
      !diff.noStorage||diff.scroll>diff.width+1||diff.height<43.5)
    throw Error('Text Diff '+width+': '+JSON.stringify(diff));
  }
  if(c.errors.length||c.external.length)
   throw Error('Browser errors or external requests: '+c.errors.join(';')+'; '+c.external.join(';'));
  console.log('PASS Library Chromium: catalog, three real apps and App Studio at 280/390/844/1440; actual opaque iframe counter execution, ZIP32 export/reimport, no-JavaScript static page, cancelled stale imports, unsaved-change confirm/leave guards, CRC corruption rejection, and no uploads');
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
