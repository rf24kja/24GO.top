/** Read-only release audit for the PUBLIC static 24GOTOP site, without CI providers.
 * A PASS proves that the sampled/source-listed files served by canonical HTTPS
 * match the local checkout byte-for-byte at audit time. It is NOT deployment,
 * authentication, uptime, indexing, or provenance of unlisted assets.
 */
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const ORIGIN='https://24go.top';
export const FIXED_ROUTES=Object.freeze([
 '/', '/landing.css', '/localized.css', '/interior.css',
 '/draft-lab.css', '/contribute.css', '/progress.css',
 '/engineering/notes.css', '/engineering/paths.css',
 '/draft-lab.html', '/draft-lab.js', '/draft-lab-logic.js',
 '/draft-lab-preview.js', '/draft-lab-vault.js', '/contribute.html',
 '/contribute-board.js', '/engineering/', '/engineering/feed.xml',
 '/engineering/feed.json', '/engineering/search-index.json',
 '/engineering/search.js', '/engineering/reading-paths/',
 '/engineering/paths.js', '/sitemap.xml', '/robots.txt'
]);
const SAFE_ROUTE=/^\/(?:[a-z0-9-]+\/)*(?:[a-z0-9-]+\.(?:html|css|js|mjs|xml|json|txt))?$/;
const MAX_ASSET_BYTES=512*1024;
const MAX_CHUNKS=256;

export function sourcePath(route){
 if(typeof route!=='string'||!SAFE_ROUTE.test(route)||route.includes('//'))
  throw new TypeError('Unsafe static release route');
 return new URL('../site/'+(route.endsWith('/')?route.slice(1)+'index.html':route.slice(1)),import.meta.url);
}

export function sitemapRoutes(xml){
 if(typeof xml!=='string'||xml.length>256*1024||
    !xml.includes('<urlset ')||!xml.includes('</urlset>'))
  throw new TypeError('Invalid source sitemap');
 const matched=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
 if(matched.length<10||matched.length>200||
    (xml.match(/<loc>/g)||[]).length!==matched.length)
  throw new TypeError('Invalid source sitemap routes');
 const seen=new Set();
 return Object.freeze(matched.map(href=>{
  if(!href.startsWith(ORIGIN+'/'))throw new TypeError('Non-canonical source sitemap URL');
  const route=href.slice(ORIGIN.length);
  sourcePath(route);
  if(seen.has(route))throw new TypeError('Duplicate source sitemap route');
  seen.add(route);
  return route;
 }));
}

export function releaseRoutes(sitemap){
 const paths=new Set([...FIXED_ROUTES,...sitemapRoutes(sitemap)]);
 return Object.freeze([...paths]);
}

async function readBoundedBody(response,maxBytes=MAX_ASSET_BYTES){
 if(response?.status!==200||!response.body?.getReader)
  throw new Error('HTTP response not available');
 const reader=response.body.getReader();
 const chunks=[];let bytes=0,count=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array)||++count>MAX_CHUNKS||
      bytes+value.byteLength>maxBytes){
    await reader.cancel().catch(()=>{});
    throw new Error('HTTP response exceeded audit budget');
   }
   chunks.push(value);bytes+=value.byteLength;
  }
 }finally{reader.releaseLock();}
 const body=new Uint8Array(bytes);let offset=0;
 for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
 return body;
}

/** Dependency injection is for isolated tests; CLI always targets canonical HTTPS. */
export async function verifyPublicStatic({
 fetchImpl=globalThis.fetch,
 readSource=route=>readFile(sourcePath(route)),
 sitemap=null,
 concurrency=3
}={}){
 if(typeof fetchImpl!=='function'||typeof readSource!=='function'||
    !Number.isInteger(concurrency)||concurrency<1||concurrency>4)
  throw new TypeError('Invalid static audit configuration');
 const sitemapText=sitemap??await readFile(sourcePath('/sitemap.xml'),'utf8');
 const routes=releaseRoutes(sitemapText);
 // Before making a network request, verify all expected source bytes exist.
 const expected=new Map();
 for(const route of routes){
  const data=await readSource(route);
  if(!(data instanceof Uint8Array)||data.byteLength>MAX_ASSET_BYTES||!data.byteLength)
   throw new TypeError('Invalid local static release file: '+route);
  expected.set(route,data);
 }
 let next=0;
 async function worker(){
  for(;;){
   const index=next++;
   if(index>=routes.length)return;
   const route=routes[index];
   const url=ORIGIN+route+(route.includes('?')?'&':'?')+'release_audit=1';
   let response;
   try{
    response=await fetchImpl(url,{
     method:'GET',redirect:'error',cache:'no-store',credentials:'omit',
     referrerPolicy:'no-referrer',headers:{'cache-control':'no-cache'},
     signal:AbortSignal.timeout(15000)
    });
    const actual=await readBoundedBody(response);
    const source=expected.get(route);
    if(actual.byteLength!==source.byteLength||
       !actual.every((byte,i)=>byte===source[i]))
     throw new Error('Content differs from reviewed source');
   }catch{
    throw new Error('Public HTTPS release is missing or stale at '+route);
   }
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,routes.length)},worker));
 return Object.freeze({verified:true,origin:ORIGIN,checked:routes.length});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  if(process.argv.length!==2)throw new TypeError('No URL or credentials accepted');
  const result=await verifyPublicStatic();
  console.log('PASS canonical HTTPS exact static source audit: '+result.checked+' routes');
  console.log('Scope: static source delivery only; not signed deployment or hosted publishing.');
 }catch(error){console.error('FAIL static release audit:',error.message);process.exitCode=1;}
}
