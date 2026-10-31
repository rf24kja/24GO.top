// Offline editorial hand-off. SHA-256 proves byte integrity only, NOT
// author identity, license ownership, editorial approval or publication.
import {formatDraft,parseDraftFile} from './draft-lab-logic.js';

export const REVIEW_PACK_KIND='24gotop-editorial-review-pack';
export const MAX_REVIEW_PACK_BYTES=65536;
const PATTERN=/^[a-f0-9]{64}$/;
const expectedFields=['kind','version','document','sha256'];
function assertText(value){
 if(typeof value!=='string'||value.length>30000||
   /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value))
  throw new TypeError('Invalid manuscript text');
 return value;
}
const utf8=value=>new TextEncoder().encode(assertText(value));
async function checksum(text,subtle=globalThis.crypto?.subtle){
 if(!subtle||typeof subtle.digest!=='function')
  throw new TypeError('Local SHA-256 is unavailable in this browser');
 const bytes=await subtle.digest('SHA-256',utf8(text));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function createEditorialReviewPack(draft,{subtle}={}){
 const document=formatDraft(draft);
 const sha256=await checksum(document,subtle);
 const pack={kind:REVIEW_PACK_KIND,version:1,document,sha256};
 const data=JSON.stringify(pack,null,2)+'\n';
 if(utf8(data).byteLength>MAX_REVIEW_PACK_BYTES)
  throw new RangeError('Review package exceeds local file limit');
 return data;
}
export async function verifyEditorialReviewPack(text,{subtle}={}){
 if(typeof text!=='string'||utf8(text).byteLength>MAX_REVIEW_PACK_BYTES)
  throw new TypeError('Invalid review package length');
 let pack;
 try{pack=JSON.parse(text);}
 catch{throw new TypeError('Review package is not valid JSON');}
 if(!pack||typeof pack!=='object'||Array.isArray(pack)||
   Object.keys(pack).sort().join(',')!==expectedFields.slice().sort().join(',')||
   pack.kind!==REVIEW_PACK_KIND||pack.version!==1||
   typeof pack.document!=='string'||!PATTERN.test(pack.sha256))
  throw new TypeError('Unrecognized review package');
 const manuscript=assertText(pack.document);
 let draft;
 try{
  draft=parseDraftFile(manuscript);
  if(formatDraft(draft)!==manuscript)
   throw new TypeError('Noncanonical manuscript');
 }catch{throw new TypeError('Invalid packaged Draft Lab manuscript');}
 const actual=await checksum(manuscript,subtle);
 if(actual!==pack.sha256)throw new TypeError('Review package checksum mismatch');
 // Return data only to the deliberate caller, never log it.
 return {draft,sha256:actual,bytes:utf8(manuscript).byteLength};
}
export async function readEditorialReviewPackFile(file,{subtle}={}){
 if(!file||typeof file.name!=='string'||file.name.length>255||
   !/\.json$/i.test(file.name)||/[\/\\\u0000-\u001f\u007f]/.test(file.name)||
   !Number.isSafeInteger(file.size)||file.size<30||
   file.size>MAX_REVIEW_PACK_BYTES||typeof file.arrayBuffer!=='function')
  throw new TypeError('Unsupported review package file');
 let buffer;
 try{buffer=await file.arrayBuffer();}
 catch{throw new TypeError('Review package cannot be read');}
 if(Object.prototype.toString.call(buffer)!=='[object ArrayBuffer]'||
   buffer.byteLength!==file.size)throw new TypeError('Review package byte count mismatch');
 let text;
 try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
 catch{throw new TypeError('Review package must use valid UTF-8');}
 return verifyEditorialReviewPack(text,{subtle});
}
