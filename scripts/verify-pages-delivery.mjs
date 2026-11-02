// Read-only, post-deployment proof for the PUBLIC GitHub Pages build.
// Runs on GitHub-hosted Actions AFTER deploy-pages. No secrets, no writes.
import {pathToFileURL} from 'node:url';

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

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const result=await verifyPagesDelivery({
   sha:process.env.EXPECTED_PAGES_SHA,runId:process.env.EXPECTED_PAGES_RUN_ID
  });
  console.log('PASS external HTTPS Pages release: '+result.sha+
   ', workflow '+result.runId+', attempt '+result.attempt);
 }catch(error){
  console.error('::error::'+error.message);
  process.exitCode=1;
 }
}
