/** Static Library browser intake. No network, uploads, extraction or code execution.
 * A PASS is a local source check ONLY; approval and hosting remain human gated.
 */
export const LIMITS=Object.freeze({
 archiveBytes:4*1024*1024,expandedBytes:2*1024*1024,
 fileBytes:512*1024,entries:48
});
const SAFE_NAME=/^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*){0,3}$/i;
const STATIC_EXTENSION=/\.(?:html|css|js|mjs|json|png|jpg|jpeg|webp|gif)$/i;
const FORBIDDEN=[
 /<iframe\b/i,/<object\b/i,/<embed\b/i,/<form\b/i,
 /<base\b/i,/<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i,
 /<script\b[^>]*\bsrc\s*=\s*["']?\s*(?:https?:|\/\/|data:)/i,
 /<(?:img|link|source|video|audio)\b[^>]*\b(?:src|href)\s*=\s*["']?\s*(?:https?:|\/\/|data:)/i,
 /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|eval)\s*\(/i,
 /\b(?:localStorage|sessionStorage|indexedDB|serviceWorker|document\.cookie)\b/i,
 /\b(?:window\.top|window\.parent|window\.opener|window\.open)\b/i,
 /new\s+Function\s*\(/i,/@import\b/i,
 /url\s*\(\s*["']?\s*(?:https?:|\/\/|data:)/i
];
const decoder=new TextDecoder('utf-8',{fatal:true});
const error=reason=>{throw new TypeError('Unsafe ZIP: '+reason);};
const u16=(v,o)=>v.getUint16(o,true);
const u32=(v,o)=>v.getUint32(o,true);
function ensure(bytes,position,length,bound=bytes.byteLength){
 if(!Number.isSafeInteger(position)||!Number.isSafeInteger(length)||
    position<0||length<0||position+length>bound)error('truncated archive');
}
function safeName(name,directory=false){
 if(typeof name!=='string'||!SAFE_NAME.test(directory?name.slice(0,-1):name)||
    (!directory&&!STATIC_EXTENSION.test(name))||
    name.split('/').some(x=>x==='..'||x==='.'||x.startsWith('.')))
  error('unsafe or unsupported source path');
 return name;
}
function checksum(bytes){
 let crc=0xffffffff;
 for(const value of bytes){
  crc^=value;
  for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 }
 return (crc^0xffffffff)>>>0;
}
async function sha256(bytes){
 if(!globalThis.crypto?.subtle)error('secure crypto digest unavailable');
 const raw=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(raw)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function imageSignature(name,content){
 if(/\.png$/i.test(name)&&
    ![137,80,78,71,13,10,26,10].every((x,i)=>content[i]===x))
  error('invalid PNG signature');
 if(/\.jpe?g$/i.test(name)&&!(content[0]===255&&content[1]===216))
  error('invalid JPEG signature');
 if(/\.gif$/i.test(name)&&
    !['GIF89a','GIF87a'].includes(new TextDecoder().decode(content.subarray(0,6))))
  error('invalid GIF signature');
 if(/\.webp$/i.test(name)&&!(String.fromCharCode(...content.subarray(0,4))==='RIFF'&&
    String.fromCharCode(...content.subarray(8,12))==='WEBP'))
  error('invalid WEBP signature');
}
async function decompressDeflate(input){
 let decompression;
 try{decompression=new DecompressionStream('deflate-raw');}
 catch{error('this browser cannot safely decompress ZIP deflate; use the CLI validator');}
 const reader=new Blob([input]).stream().pipeThrough(decompression).getReader();
 let total=0,chunks=[];
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>LIMITS.fileBytes){await reader.cancel();error('compressed app file expands beyond limit');}
   chunks.push(value);
  }
  const result=new Uint8Array(total);
  let cursor=0;
  for(const chunk of chunks){result.set(chunk,cursor);cursor+=chunk.byteLength;}
  return result;
 }catch(e){
  if(e instanceof TypeError&&e.message.startsWith('Unsafe ZIP:'))throw e;
  error('invalid or oversized deflate stream');
 }finally{reader.releaseLock();}
}
/**
 * Validate standard ZIP32 bytes already read from an explicitly chosen File.
 * Browser never opens external links, parses HTML into a DOM or executes JS.
 */
export async function validateBrowserZip(raw,{inflate=decompressDeflate}={}){
 const bytes=raw instanceof Uint8Array?raw:
   raw instanceof ArrayBuffer?new Uint8Array(raw):null;
 if(!bytes||bytes.length<22||bytes.length>LIMITS.archiveBytes)
  error('ZIP32 file required (4 MiB maximum)');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let eocd=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
  if(u32(v,i)===0x06054b50&&i+22+u16(v,i+20)===bytes.length){
   eocd=i;break;
  }
 }
 if(eocd<0||u16(v,eocd+4)!==0||u16(v,eocd+6)!==0)
  error('invalid ZIP32 end record or multi-disk archive');
 const entries=u16(v,eocd+10);
 const cdSize=u32(v,eocd+12),cdOffset=u32(v,eocd+16);
 if(entries!==u16(v,eocd+8)||entries<1||entries>LIMITS.entries||
    cdOffset+cdSize!==eocd)error('invalid central directory');
 let at=cdOffset,total=0,rootHTML=null;
 const names=new Set(),files=[];
 for(let i=0;i<entries;i++){
  ensure(bytes,at,46,eocd);
  if(u32(v,at)!==0x02014b50)error('invalid central directory entry');
  const flags=u16(v,at+8),method=u16(v,at+10),
   crc=u32(v,at+16),packed=u32(v,at+20),expanded=u32(v,at+24),
   nameLength=u16(v,at+28),extra=u16(v,at+30),comment=u16(v,at+32),
   disk=u16(v,at+34),mode=u32(v,at+38)>>>16,
   local=u32(v,at+42);
  const end=at+46+nameLength+extra+comment;
  ensure(bytes,at,end-at,eocd);
  if(disk!==0||flags&~0x808||![0,8].includes(method)||
     packed>LIMITS.archiveBytes||expanded>LIMITS.fileBytes||
     packed===0xffffffff||expanded===0xffffffff||local===0xffffffff)
   error('unsupported encryption, ZIP64, compression or file size');
  if(mode&&((mode&0xf000)===0xa000||
     ((mode&0xf000)!==0x8000&&(mode&0xf000)!==0x4000)))
   error('symlink or special file forbidden');
  let name;
  try{name=decoder.decode(bytes.subarray(at+46,at+46+nameLength));}
  catch{error('non-UTF8 filename');}
  at=end;
  const directory=name.endsWith('/');
  safeName(name,directory);
  if(directory){
   if(expanded!==0||packed!==0)error('nonempty directory');
   continue;
  }
  const lower=name.toLowerCase();
  if(names.has(lower))error('duplicate or case-colliding filename');
  names.add(lower);
  total+=expanded;
  if(total>LIMITS.expandedBytes)error('expanded ZIP exceeds 2 MiB');
  ensure(bytes,local,30,cdOffset);
  if(u32(v,local)!==0x04034b50)error('missing local file header');
  const localNameSize=u16(v,local+26),localExtra=u16(v,local+28);
  const dataAt=local+30+localNameSize+localExtra;
  ensure(bytes,local+30,localNameSize+localExtra,cdOffset);
  ensure(bytes,dataAt,packed,cdOffset);
  let localName;
  try{localName=decoder.decode(bytes.subarray(local+30,local+30+localNameSize));}
  catch{error('invalid local filename');}
  if(localName!==name||u16(v,local+8)!==method||
     u16(v,local+6)!==flags)error('local file header mismatch');
  const compressed=bytes.subarray(dataAt,dataAt+packed);
  let content;
  try{content=method===0?compressed:await inflate(compressed);}
  catch(e){
   if(e instanceof TypeError&&e.message.startsWith('Unsafe ZIP:'))throw e;
   error('invalid ZIP deflate data');
  }
  if(!(content instanceof Uint8Array)||content.length!==expanded||
     checksum(content)!==crc)error('file length or CRC32 mismatch');
  if(!content.length)error('empty source file');
  if(/\.(?:html|css|js|mjs|json)$/i.test(name)){
   let code;
   try{code=decoder.decode(content);}catch{error('source text is not UTF-8');}
   if(FORBIDDEN.some(pattern=>pattern.test(code)))error('disallowed active or remote capability');
   if(name==='index.html')rootHTML=code;
  }else imageSignature(name,content);
  files.push({path:name,size:content.length,sha256:await sha256(content)});
 }
 if(at!==eocd)error('unreviewed central directory bytes');
 if(!rootHTML||!/<html(?:\s|>)/i.test(rootHTML)||
    !/<title>[^<]{3,120}<\/title>/i.test(rootHTML))error('root index.html is required');
 files.sort((a,b)=>a.path.localeCompare(b.path));
 return Object.freeze({
  entry:'index.html',files:Object.freeze(files.map(x=>Object.freeze(x))),
  totalBytes:total,archiveSha256:await sha256(bytes),
  reviewRequired:true,automaticHosting:false
 });
}
const github=/^https:\/\/github\.com\/([a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)\/([a-z0-9_.-]{1,100})\/?$/i;
export function validateGitHubSource(raw){
 if(typeof raw!=='string'||raw.length>220)throw new TypeError('Enter a public GitHub repository URL');
 const match=raw.trim().match(github);
 if(!match||match[2]==='.'||match[2]==='..'||match[2].startsWith('.')||
    match[2].endsWith('.'))throw new TypeError('Enter a public HTTPS GitHub repository URL');
 return 'https://github.com/'+match[1]+'/'+match[2];
}
/** Opening this link is a user-initiated GitHub issue, NOT hosted submission. */
export function buildLibraryReviewIssue({name,repository,report}){
 if(typeof name!=='string'||name.trim().length<3||name.length>70||
    /[\u0000-\u001f\u007f<>]/u.test(name))throw new TypeError('Invalid app title');
 const source=validateGitHubSource(repository);
 if(!report||report.reviewRequired!==true||report.automaticHosting!==false||
    !/^[a-f0-9]{64}$/.test(report.archiveSha256)||
    !Array.isArray(report.files)||report.files.length<1||report.files.length>LIMITS.entries||
    !Number.isSafeInteger(report.totalBytes)||report.totalBytes>LIMITS.expandedBytes)
  throw new TypeError('Validate a local ZIP before requesting source review');
 const body=[
  '## Static App Library — source review request',
  '',
  'App: '+name.trim(),
  'Public source: '+source,
  'Archive SHA-256: '+report.archiveSha256,
  'Validated files: '+report.files.length,
  'Expanded bytes: '+report.totalBytes,
  '',
  'Local ZIP validation passed only basic static package checks. This is not publication, security approval or verified ownership.',
  'No ZIP was uploaded by 24GOTOP. The maintainer must review the public GitHub source, license, authorship, sandbox and deployment isolation.',
  '',
  'Checklist: [ ] Source license/rights  [ ] No credentials  [ ] Manual security review  [ ] Separate-origin decision  [ ] CI'
 ].join('\n');
 const params=new URLSearchParams({
  title:'Library app review: '+name.trim(),
  body
 });
 return 'https://github.com/rf24kja/24GO.top/issues/new?'+params.toString();
}
