// Transparent, read-only release provenance for the PUBLIC GitHub Pages site.
// Receipt is created during the Pages deployment; do not claim it is a
// signature, hosted publishing proof, or proof of search-engine indexing.
const COMMIT=/^[a-f0-9]{40}$/;
const RUN=/^[1-9][0-9]{0,19}$/;
const REPO='https://github.com/rf24kja/24GO.top';

export function validateReleaseReceipt(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).sort().join(',')!=='commit,pages_run_id'||
    typeof value.commit!=='string'||!COMMIT.test(value.commit)||
    typeof value.pages_run_id!=='string'||!RUN.test(value.pages_run_id)){
  throw new TypeError('Invalid Pages release receipt');
 }
 return Object.freeze({commit:value.commit,pagesRunId:value.pages_run_id});
}

export function releaseEvidenceLinks(receipt){
 const data=validateReleaseReceipt({
  commit:receipt?.commit,pages_run_id:receipt?.pagesRunId
 });
 return Object.freeze({
  commit:REPO+'/commit/'+data.commit,
  workflow:REPO+'/actions/runs/'+data.pagesRunId
 });
}

export async function fetchReleaseReceipt(fetchImpl=globalThis.fetch){
 if(typeof fetchImpl!=='function')throw new TypeError('Fetch unavailable');
 const response=await fetchImpl('./release.json',{
  method:'GET',credentials:'omit',redirect:'error',cache:'no-store',
  headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)
 });
 if(response?.status!==200 || typeof response.text!=='function')
  throw new Error('Pages release receipt unavailable');
 // A declared size is only a hint: compression and chunked transfer can
 // exceed it. Bound decoded response bytes WHILE reading, not after text().
 const maxBytes=256,maxChunks=32;
 const declared=response.headers?.get?.('content-length');
 if(declared && /^\d+$/.test(declared) && Number(declared)>maxBytes)
  throw new Error('Pages release receipt too large');
 if(!response.body || typeof response.body.getReader!=='function')
  throw new TypeError('Pages release receipt body unavailable');
 const reader=response.body.getReader();
 const chunks=[];
 let size=0,chunkCount=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array) || ++chunkCount>maxChunks ||
      size+value.byteLength>maxBytes){
    await reader.cancel().catch(()=>{});
    throw new Error('Pages release receipt exceeded safe stream limit');
   }
   size+=value.byteLength;
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);
 let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{
  const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
  return validateReleaseReceipt(JSON.parse(text));
 }catch{throw new TypeError('Invalid Pages release receipt');}
}

export async function mountReleaseReceipt(doc,fetchImpl=globalThis.fetch){
 const status=doc.getElementById('public-release-status');
 const commitLink=doc.getElementById('public-release-commit');
 const workflowLink=doc.getElementById('public-release-workflow');
 if(!status||!commitLink||!workflowLink)return false;
 commitLink.hidden=true;workflowLink.hidden=true;
 try{
  const receipt=await fetchReleaseReceipt(fetchImpl);
  const links=releaseEvidenceLinks(receipt);
  commitLink.href=links.commit;
  workflowLink.href=links.workflow;
  commitLink.textContent='View deployed commit '+receipt.commit.slice(0,12);
  workflowLink.textContent='GitHub Pages workflow #'+receipt.pagesRunId;
  commitLink.hidden=false;workflowLink.hidden=false;
  status.textContent='Public Pages release receipt loaded. This describes the deployed static build only.';
 }catch{
  status.textContent='Current Pages release cannot be verified from this browser. Check GitHub Actions; this does not imply a new version was deployed.';
 }
 return true;
}

if(typeof document!=='undefined')
 void mountReleaseReceipt(document);
