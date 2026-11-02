// Read-only, post-deployment proof for the PUBLIC GitHub Pages build.
// Runs on GitHub-hosted Actions AFTER deploy-pages. No secrets, no writes.
import {pathToFileURL} from 'node:url';
import {readFile,appendFile} from 'node:fs/promises';

const SHA=/^[0-9a-f]{40}$/;
const RUN=/^[1-9][0-9]{0,19}$/;
const ORIGIN='https://24go.top/release.json';
const MAX_RECEIPT_BYTES=256;
const MAX_CHUNKS=32;

export function expectedReceipt(sha,runId){
 if(typeof sha!=='string'||!SHA.test(sha)||
    typeof runId!=='string'||!RUN.test(runId))
  throw new TypeError('Invalid public Pages release identity');
 return JSON.stringify({commit:sha,pages_run_id:runId})+'\n';
}

export async function verifyPagesDelivery({
 sha,runId,fetchImpl=globalThis.fetch,
 attempts=12,pauseMs=8000,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
}={}){
 const expected=expectedReceipt(sha,runId);
 if(!Number.isSafeInteger(attempts)||attempts<1||attempts>12||
    !Number.isSafeInteger(pauseMs)||pauseMs<0||pauseMs>15000||
    typeof fetchImpl!=='function'||typeof wait!=='function')
  throw new TypeError('Invalid Pages verification configuration');
 const url=ORIGIN+'?pages_audit='+runId;
 for(let attempt=1;attempt<=attempts;attempt++){
  try{
   const response=await fetchImpl(url,{
    method:'GET',redirect:'error',cache:'no-store',
    headers:{accept:'application/json','cache-control':'no-cache'},
    signal:AbortSignal.timeout(20000)
   });
   if(response?.status!==200||!response.body?.getReader)
    throw new Error('Release response unavailable');
   const reader=response.body.getReader();
   const chunks=[];let bytes=0,count=0;
   try{
    for(;;){
     const {done,value}=await reader.read();
     if(done)break;
     if(!(value instanceof Uint8Array)||++count>MAX_CHUNKS||
        bytes+value.byteLength>MAX_RECEIPT_BYTES){
      await reader.cancel().catch(()=>{});
      throw new Error('Release response exceeds size budget');
     }
     bytes+=value.byteLength;
     chunks.push(value);
    }
   }finally{reader.releaseLock();}
   const data=new Uint8Array(bytes);let offset=0;
   for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
   const receipt=new TextDecoder('utf-8',{fatal:true}).decode(data);
   if(receipt===expected){
    return Object.freeze({verified:true,sha,runId,attempt});
   }
  }catch{/* Invalid/unavailable CDN state: do not print its body. */}
  if(attempt<attempts)await wait(pauseMs);
 }
 throw new Error('Public Pages CDN does not serve this exact commit and workflow run');
}


// Static-only, deliberately fixed paths. The receipt alone cannot prove the
// homepage, editor and article discovery assets reached the public CDN.
export const ESSENTIAL_PUBLIC_ROUTES=Object.freeze([
 Object.freeze({path:'/',marker:'OPEN SOURCE · PRE-LAUNCH',source:'../site/index.html'}),
 Object.freeze({path:'/draft-lab.html',marker:'id="postTitle"',source:'../site/draft-lab.html'}),
 Object.freeze({path:'/draft-lab.js',marker:'reviewExportGate.canApply(ticket)',source:'../site/draft-lab.js'}),
 Object.freeze({path:'/engineering/',marker:'<h1>Engineering notes</h1>',source:'../site/engineering/index.html'}),
 Object.freeze({path:'/engineering/search.js',marker:'INDEX_MAX_BYTES=512000',source:'../site/engineering/search.js'})
]);

// Check the COMPLETE five deployed assets against the checked-out public
// commit, not just a stable marker left over in an older CDN-cached file.
// Paths are source-authored fixed allowlist entries, never request inputs.
export async function loadEssentialPublicAssets(){
 const entries=await Promise.all(ESSENTIAL_PUBLIC_ROUTES.map(async entry=>{
  const text=await readFile(new URL(entry.source,import.meta.url),'utf8');
  if(Buffer.byteLength(text,'utf8')>65536)
   throw new RangeError('Critical source file exceeds public audit budget: '+entry.path);
  if(!text.includes(entry.marker))
   throw new Error('Reviewed source lacks essential public marker: '+entry.path);
  return [entry.path,text];
 }));
 return Object.freeze(Object.fromEntries(entries));
}

async function readBoundedPage(response){
 if(response?.status!==200||!response.body?.getReader)
  throw new Error('Public page response unavailable');
 const reader=response.body.getReader();
 const chunks=[];let bytes=0,count=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array)||++count>256||bytes+value.byteLength>65536){
    await reader.cancel().catch(()=>{});
    throw new Error('Public page response exceeds safe budget');
   }
   bytes+=value.byteLength;chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const data=new Uint8Array(bytes);let offset=0;
 for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder('utf-8',{fatal:true}).decode(data);
}

export async function verifyEssentialPublicPages({
 runId,fetchImpl=globalThis.fetch,attempts=2,pauseMs=1500,
 wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),expectedAssets=null
}={}){
 if(typeof runId!=='string'||!RUN.test(runId)||
    typeof fetchImpl!=='function'||typeof wait!=='function'||
    !Number.isSafeInteger(attempts)||attempts<1||attempts>3||
    !Number.isSafeInteger(pauseMs)||pauseMs<0||pauseMs>5000)
  throw new TypeError('Invalid Pages smoke verification inputs');
 if(expectedAssets!==null &&
   (typeof expectedAssets!=='object'||Array.isArray(expectedAssets)||
    Object.keys(expectedAssets).length!==ESSENTIAL_PUBLIC_ROUTES.length||
    ESSENTIAL_PUBLIC_ROUTES.some(entry=>
     typeof expectedAssets[entry.path]!=='string'||
     Buffer.byteLength(expectedAssets[entry.path],'utf8')>65536||
     !expectedAssets[entry.path].includes(entry.marker))))
  throw new TypeError('Invalid exact Pages asset expectations');
 for(const entry of ESSENTIAL_PUBLIC_ROUTES){
  let matched=false;
  for(let attempt=1;attempt<=attempts;attempt++){
   try{
    const response=await fetchImpl('https://24go.top'+entry.path+
      '?pages_audit='+runId,{
       method:'GET',redirect:'error',cache:'no-store',
       headers:{accept:'text/html,application/javascript;q=0.9',
        'cache-control':'no-cache'},
       signal:AbortSignal.timeout(20000)
      });
    const data=await readBoundedPage(response);
    if(data.includes(entry.marker)&&
       (expectedAssets===null||data===expectedAssets[entry.path])){
      matched=true;break;
    }
   }catch{/* No untrusted response bytes or URL query logged. */}
   if(attempt<attempts)await wait(pauseMs);
  }
  if(!matched)
   throw new Error('Public Pages asset unavailable or outdated: '+entry.path);
 }
 return Object.freeze({verified:true,checked:ESSENTIAL_PUBLIC_ROUTES.length});
}

// This is written to GitHub's Actions job summary ONLY after exact-SHA receipt
// and all five byte-for-byte public CDN checks pass. It is an audit record,
// not a guarantee of continuous uptime, indexing or hosted publishing.
export function formatPagesEvidenceSummary(sha,runId,checked){
 expectedReceipt(sha,runId);
 if(checked!==ESSENTIAL_PUBLIC_ROUTES.length)
  throw new TypeError('Incomplete Pages asset proof');
 const repo='https://github.com/rf24kja/24GO.top';
 return '## Verified static 24GOTOP Pages delivery\n\n'+
  '- Deployed commit: [`'+sha+'`]('+repo+'/commit/'+sha+')\n'+
  '- GitHub Pages run: [`'+runId+'`]('+repo+'/actions/runs/'+runId+')\n'+
  '- External HTTPS provenance: **exact commit + workflow receipt**\n'+
  '- Five essential live routes: **5/5 exact source-content matches**\n'+
  '- Scope: PUBLIC static assets only, not accounts, publishing, user data or uptime.\n';
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const result=await verifyPagesDelivery({
   sha:process.env.EXPECTED_PAGES_SHA,runId:process.env.EXPECTED_PAGES_RUN_ID
  });
  const expectedAssets=await loadEssentialPublicAssets();
  const assets=await verifyEssentialPublicPages({
   runId:result.runId,expectedAssets
  });
  console.log('PASS external HTTPS Pages release: '+result.sha+
   ', workflow '+result.runId+', attempt '+result.attempt+
   ', essential byte-exact public assets '+assets.checked+'/'+assets.checked);
  if(process.env.GITHUB_STEP_SUMMARY)
   await appendFile(process.env.GITHUB_STEP_SUMMARY,
    formatPagesEvidenceSummary(result.sha,result.runId,assets.checked),'utf8');
 }catch(error){
  console.error('::error::'+error.message);
  process.exitCode=1;
 }
}
