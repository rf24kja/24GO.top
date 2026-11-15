/** ZIP/GitHub-checkout static app intake: inspect only; NEVER execute or extract. */
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {lstat,readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';

export const MAX_ARCHIVE_BYTES=4*1024*1024;
export const MAX_APP_BYTES=2*1024*1024;
export const MAX_FILE_BYTES=512*1024;
export const MAX_APP_FILES=48;
const allowedExt=/\.(?:html|css|js|mjs|json|png|jpg|jpeg|webp|gif)$/i;
const names=/^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*){0,3}$/i;
const forbiddenSource=[
 /<iframe\b/i,/<object\b/i,/<embed\b/i,/<form\b/i,
 /<base\b/i,/<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i,
 /<script\b[^>]*\bsrc\s*=\s*["']?\s*(?:https?:|\/\/|data:)/i,
 /<(?:img|link|source|video|audio)\b[^>]*\b(?:src|href)\s*=\s*["']?\s*(?:https?:|\/\/|data:)/i,
 /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|eval)\s*\(/i,
 /\b(?:localStorage|sessionStorage|indexedDB|serviceWorker|document\.cookie)\b/i,
 /\b(?:window\.top|window\.parent|window\.opener|window\.open)\b/i,
 /new\s+Function\s*\(/i,
 /@import\b/i
];
const invalid=(reason)=>{throw new TypeError('Unsafe static app package: '+reason);};
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
function safePath(name){
 if(typeof name!=='string'||!names.test(name)||
    name.split('/').some(s=>s==='.'||s==='..'||s.endsWith('.')||s.startsWith('.'))||
    !allowedExt.test(name))invalid('unsupported or unsafe file path');
 return name;
}
function crc32(b){
 let c=0xffffffff;
 for(const value of b){
  c^=value;
  for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);
 }
 return (c^0xffffffff)>>>0;
}
function imageSignature(file,b){
 if(/\.png$/i.test(file)&&!b.subarray(0,8).equals(
   Buffer.from([137,80,78,71,13,10,26,10])))invalid('invalid PNG signature');
 if(/\.jpe?g$/i.test(file)&&!(b[0]===255&&b[1]===216))invalid('invalid JPEG signature');
 if(/\.gif$/i.test(file)&&!['GIF89a','GIF87a'].includes(b.toString('ascii',0,6)))
  invalid('invalid GIF signature');
 if(/\.webp$/i.test(file)&&!(b.toString('ascii',0,4)==='RIFF'&&
    b.toString('ascii',8,12)==='WEBP'))invalid('invalid WebP signature');
}
export function validateStaticAppFiles(files){
 if(!(files instanceof Map)||files.size<1||files.size>MAX_APP_FILES||!files.has('index.html'))
  invalid('missing root index.html or file count exceeded');
 let total=0;const seen=new Set(),inventory=[];
 for(const [raw,value] of files){
  const name=safePath(raw),lower=name.toLowerCase();
  if(seen.has(lower))invalid('duplicate case-insensitive filename');
  seen.add(lower);
  if(!Buffer.isBuffer(value)||!value.length||value.byteLength>MAX_FILE_BYTES)
   invalid('empty, invalid or oversized file');
  total+=value.length;
  if(total>MAX_APP_BYTES)invalid('expanded package exceeds 2 MiB');
  if(/\.(?:html|css|js|mjs|json)$/i.test(name)){
   let content;
   try{content=new TextDecoder('utf-8',{fatal:true}).decode(value);}
   catch{invalid('source file is not UTF-8');}
   if(forbiddenSource.some(pattern=>pattern.test(content)))
    invalid('disallowed active capability or remote resource');
  }else imageSignature(name,value);
  inventory.push(Object.freeze({path:name,size:value.length,sha256:sha(value)}));
 }
 const html=files.get('index.html').toString('utf8');
 if(!/<html(?:\s|>)/i.test(html)||!/<title>[^<]{3,120}<\/title>/i.test(html))
  invalid('no HTML document or title');
 inventory.sort((a,b)=>a.path.localeCompare(b.path));
 return Object.freeze({entry:'index.html',files:inventory,totalBytes:total,
  reviewRequired:true,automaticHosting:false});
}
/**
 * Parse ZIP32 central directory, including deflate method 8. Restrict
 * inflated output before allocating and never trust local paths/zip metadata.
 */
export function validateStaticZip(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<22||bytes.length>MAX_ARCHIVE_BYTES)
  invalid('archive must be ZIP32 <=4 MiB');
 let eocd=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
  if(bytes.readUInt32LE(i)===0x06054b50&&
     i+22+bytes.readUInt16LE(i+20)===bytes.length){eocd=i;break;}
 }
 if(eocd<0||bytes.readUInt16LE(eocd+4)!==0||bytes.readUInt16LE(eocd+6)!==0)
  invalid('missing ZIP32 central directory or multi-disk archive');
 const entries=bytes.readUInt16LE(eocd+10);
 const otherCount=bytes.readUInt16LE(eocd+8);
 const cdSize=bytes.readUInt32LE(eocd+12),cdOffset=bytes.readUInt32LE(eocd+16);
 if(entries!==otherCount||entries>MAX_APP_FILES||entries<1||
    cdOffset+cdSize!==eocd)invalid('invalid central directory count or offset');
 const files=new Map();let at=cdOffset;
 for(let i=0;i<entries;i++){
  if(at+46>eocd||bytes.readUInt32LE(at)!==0x02014b50)invalid('corrupt central directory');
  const flags=bytes.readUInt16LE(at+8),method=bytes.readUInt16LE(at+10);
  const checksum=bytes.readUInt32LE(at+16);
  const packed=bytes.readUInt32LE(at+20),unpacked=bytes.readUInt32LE(at+24);
  const filenameLength=bytes.readUInt16LE(at+28),extra=bytes.readUInt16LE(at+30);
  const comment=bytes.readUInt16LE(at+32),disk=bytes.readUInt16LE(at+34);
  const mode=bytes.readUInt32LE(at+38)>>>16,localOffset=bytes.readUInt32LE(at+42);
  if(disk!==0||flags&~0x808||![0,8].includes(method)||
     packed>MAX_ARCHIVE_BYTES||unpacked>MAX_FILE_BYTES||
     localOffset===0xffffffff||packed===0xffffffff||unpacked===0xffffffff)
   invalid('unsupported compression, encryption, ZIP64 or file size');
  if(mode&&((mode&0xf000)===0xa000||
     ((mode&0xf000)!==0x8000&&(mode&0xf000)!==0x4000)))
   invalid('symbolic link or special file in archive');
  const end=at+46+filenameLength+extra+comment;
  if(end>eocd)invalid('truncated central directory entry');
  let name;
  try{name=new TextDecoder('utf-8',{fatal:true}).decode(
   bytes.subarray(at+46,at+46+filenameLength));}
  catch{invalid('non-UTF-8 file path');}
  at=end;
  if(name.endsWith('/')){if(unpacked!==0)invalid('nonempty directory');continue;}
  safePath(name);
  if(files.has(name))invalid('duplicate ZIP file');
  if(localOffset+30>cdOffset||bytes.readUInt32LE(localOffset)!==0x04034b50)
   invalid('missing local file header');
  const localName=bytes.readUInt16LE(localOffset+26);
  const localExtra=bytes.readUInt16LE(localOffset+28);
  const begin=localOffset+30+localName+localExtra;
  if(begin+packed>cdOffset)invalid('file content overlaps central directory');
  const actualName=bytes.toString('utf8',localOffset+30,localOffset+30+localName);
  if(actualName!==name||bytes.readUInt16LE(localOffset+8)!==method)
   invalid('local header disagrees with central directory');
  const compressed=bytes.subarray(begin,begin+packed);
  let expanded;
  try{
   expanded=method===0?Buffer.from(compressed):
    inflateRawSync(compressed,{maxOutputLength:MAX_FILE_BYTES+1});
  }catch{invalid('unsafe or corrupt deflate stream');}
  if(expanded.length!==unpacked||crc32(expanded)!==checksum)
   invalid('content length or checksum mismatch');
  files.set(name,expanded);
 }
 if(at!==eocd)invalid('central directory contains trailing unreviewed records');
 return {...validateStaticAppFiles(files),archiveSha256:sha(bytes)};
}
export async function validateStaticDirectory(root){
 if(typeof root!=='string'||!root)invalid('directory required');
 const files=new Map();
 async function visit(dir,prefix='',depth=0){
  if(depth>4)invalid('directory nesting exceeded');
  for(const entry of await readdir(dir,{withFileTypes:true})){
   if(entry.isSymbolicLink())invalid('symbolic links prohibited');
   if(entry.name.startsWith('.'))invalid('hidden files prohibited');
   if(!/^[a-zA-Z0-9._-]+$/.test(entry.name))invalid('unsupported filename');
   const relative=prefix+entry.name,path=join(dir,entry.name);
   const stat=await lstat(path);
   if(stat.isDirectory())await visit(path,relative+'/',depth+1);
   else if(stat.isFile()){
    if(stat.size>MAX_FILE_BYTES||files.size>=MAX_APP_FILES)invalid('file count or size exceeded');
    files.set(relative,await readFile(path));
   }else invalid('special files prohibited');
  }
 }
 await visit(root);
 return validateStaticAppFiles(files);
}
