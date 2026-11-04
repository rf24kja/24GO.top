// Same-origin, read-only source of the already reviewed public article
// catalog. No user query, fragment, browser storage, publishing key or
// credential ever leaves this page. Decode a bounded stream, not .json().
import {approvedReadingArticles} from './paths-logic.mjs';

const MAX_FEED_BYTES=512*1024,MAX_FEED_CHUNKS=512;
const JSON_MIME=/^(?:application\/json|application\/feed\+json)(?:\s*;|$)/i;
function fail(){throw new Error('public_reading_catalog_unavailable');}

export async function loadStaticReadingPathCatalog({
 fetchImpl=globalThis.fetch
}={}){
 if(typeof fetchImpl!=='function')fail();
 let response;
 try{
  response=await fetchImpl('../feed.json',{
   method:'GET',credentials:'omit',redirect:'error',cache:'no-store',
   referrerPolicy:'no-referrer',
   headers:{accept:'application/feed+json, application/json'},
   signal:AbortSignal.timeout(8000)
  });
 }catch{fail();}
 if(response?.status!==200||response.redirected===true||
    !JSON_MIME.test(response.headers?.get?.('content-type')||'')||
    !response.body?.getReader)fail();
 const declared=response.headers.get('content-length');
 if(declared!==null&&
    (!/^\d+$/.test(declared)||!Number.isSafeInteger(Number(declared))||
     Number(declared)>MAX_FEED_BYTES))fail();
 const reader=response.body.getReader(),chunks=[];
 let total=0,count=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array)||++count>MAX_FEED_CHUNKS||
      total+value.byteLength>MAX_FEED_BYTES)fail();
   total+=value.byteLength;
   chunks.push(value);
  }
 }catch{try{await reader.cancel();}catch{}fail();}
 finally{try{reader.releaseLock();}catch{}}
 const bytes=new Uint8Array(total);
 let offset=0;
 for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}
 try{
  const data=JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes));
  return approvedReadingArticles(data);
 }catch{fail();}
}
