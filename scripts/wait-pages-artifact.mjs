// Fail-closed GitHub Pages artifact readiness before actions/deploy-pages.
// Upload success does not guarantee immediate REST API indexing. A rerun of
// the same job can leave duplicate github-pages artifacts in one workflow run.
// This check requires EXACTLY ONE visible artifact in a fresh run, and never
// prints the Actions token, artifact contents or an untrusted response body.
import {pathToFileURL} from 'node:url';

const REPOSITORY=/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const RUN=/^[1-9][0-9]{0,19}$/;
const ARTIFACT='github-pages';
const MAX_BODY_BYTES=65536;

async function readBoundedArtifactList(response){
 if(!response?.body?.getReader)throw new TypeError('GitHub artifact response unavailable');
 if(!/^application\/(?:json|vnd\.github\+json)(?:\s*;|$)/i.test(
     response.headers?.get?.('content-type')||''))
  throw new TypeError('Unsupported GitHub artifact metadata content type');
 const length=response.headers?.get?.('content-length');
 if(length&&/^\d+$/.test(length)&&Number(length)>MAX_BODY_BYTES)
  throw new RangeError('GitHub artifact metadata exceeds budget');
 const reader=response.body.getReader();
 const pieces=[];let total=0,count=0;
 try{
  for(;;){
   const {value,done}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array)||++count>256||
      total+value.byteLength>MAX_BODY_BYTES){
    await reader.cancel().catch(()=>{});
    throw new RangeError('GitHub artifact metadata exceeds budget');
   }
   pieces.push(value);total+=value.byteLength;
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let pos=0;
 for(const piece of pieces){bytes.set(piece,pos);pos+=piece.byteLength;}
 let result;
 try{result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 catch{throw new TypeError('Invalid GitHub artifact metadata');}
 if(!result||!Array.isArray(result.artifacts)||result.artifacts.length>100)
  throw new TypeError('Invalid GitHub artifact list');
 return result.artifacts.filter(a=>a&&a.name===ARTIFACT&&
  a.expired===false&&Number.isSafeInteger(a.id)&&a.id>0).length;
}

export async function waitForUniquePagesArtifact({
 repository,runId,token,fetcher=globalThis.fetch,
 attempts=12,pauseMs=3000,
 wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
}={}){
 if(!REPOSITORY.test(repository||'')||!RUN.test(runId||'')||
    typeof token!=='string'||!token.trim()||
    typeof fetcher!=='function'||typeof wait!=='function'||
    !Number.isSafeInteger(attempts)||attempts<1||attempts>25||
    !Number.isSafeInteger(pauseMs)||pauseMs<0||pauseMs>15000)
  throw new TypeError('Invalid Pages artifact readiness configuration');
 const url='https://api.github.com/repos/'+repository+
  '/actions/runs/'+runId+'/artifacts?per_page=100';
 for(let attempt=1;attempt<=attempts;attempt++){
  let found=0;
  try{
   const response=await fetcher(url,{
    method:'GET',redirect:'error',cache:'no-store',credentials:'omit',
    headers:{accept:'application/vnd.github+json',
     authorization:'Bearer '+token,'x-github-api-version':'2022-11-28'},
    signal:AbortSignal.timeout(10000)
   });
   if(response?.status===200){
    found=await readBoundedArtifactList(response);
   }else if(![429,500,502,503,504].includes(response?.status)){
    throw new Error('GitHub Actions artifact index HTTP '+String(response?.status||'unavailable'));
   }
  }catch(error){
   // Only failed/transient network calls are retryable. Invalid content,
   // authorization errors, duplicate artifacts and exceeded budgets are not.
   if(!(error instanceof TypeError&&
        /fetch|network|timeout/i.test(error.message)) &&
      error?.name!=='TimeoutError')throw error;
  }
  if(found===1)return Object.freeze({ready:true,attempt,artifact:ARTIFACT});
  if(found>1)throw new Error('Duplicate Pages artifacts in this workflow run; use a fresh run');
  if(attempt<attempts)await wait(pauseMs);
 }
 throw new Error('Pages artifact was not indexed before deployment');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 waitForUniquePagesArtifact({
  repository:process.env.GITHUB_REPOSITORY,
  runId:process.env.GITHUB_RUN_ID,
  token:process.env.GITHUB_TOKEN
 }).then(result=>{
  console.log('PASS exactly one GitHub Pages artifact indexed after '+
   result.attempt+' check(s).');
 }).catch(error=>{
  console.error('FAIL Pages artifact readiness: '+error.message);
  process.exitCode=1;
 });
}
