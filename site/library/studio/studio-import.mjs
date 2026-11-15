/**
 * Read only a VALIDATED single-file Studio-generated ZIP32 archive.
 * Never extract files, execute app code or accept arbitrary third-party bundles.
 */
import {buildStudioHtml,validateStudioDraft,STUDIO_LIMITS} from './studio-core.mjs';

const invalid=()=>{throw new TypeError('This is not a supported App Studio ZIP');};
const marker=Object.freeze({
 name:'Studio Template Name',
 css:'STUDIO_CSS_PLACEHOLDER',
 html:'STUDIO_HTML_PLACEHOLDER',
 js:'STUDIO_JS_PLACEHOLDER'
});
const generated=buildStudioHtml(marker);
const parts=generated.split(
 /Studio Template Name|STUDIO_CSS_PLACEHOLDER|STUDIO_HTML_PLACEHOLDER|STUDIO_JS_PLACEHOLDER/
);
if(parts.length!==5)throw new Error('App Studio source template changed');

/** Fail closed on every alteration to the canonical Studio HTML envelope. */
export function parseStudioHtml(source){
 if(typeof source!=='string'||source.length>STUDIO_LIMITS.packagedBytes||
    !source.startsWith(parts[0]))invalid();
 let rest=source.slice(parts[0].length);
 const readPart=separator=>{
  const pos=rest.indexOf(separator);
  if(pos<0)invalid();
  const value=rest.slice(0,pos);
  rest=rest.slice(pos+separator.length);
  return value;
 };
 const name=readPart(parts[1]);
 const css=readPart(parts[2]);
 const html=readPart(parts[3]);
 if(!rest.endsWith(parts[4]))invalid();
 const js=rest.slice(0,-parts[4].length);
 let draft;
 try{draft=validateStudioDraft({name,html,css,js});}
 catch{invalid();}
 if(buildStudioHtml(draft)!==source)invalid();
 return draft;
}
/** Called AFTER validateBrowserZip succeeds with real CRC32, SHA256 and paths. */
export function readValidatedStudioZip(raw,report){
 const bytes=raw instanceof Uint8Array?raw:
  raw instanceof ArrayBuffer?new Uint8Array(raw):null;
 if(!bytes||!report||report.reviewRequired!==true||
    report.automaticHosting!==false||
    !Array.isArray(report.files)||report.files.length!==1||
    report.files[0].path!=='index.html'||
    !Number.isSafeInteger(report.files[0].size)||
    bytes.byteLength<80||bytes.byteLength>4*1024*1024)invalid();
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(v.getUint32(0,true)!==0x04034b50||
    v.getUint16(8,true)!==0||v.getUint16(6,true)!==0)invalid();
 const nameSize=v.getUint16(26,true),extra=v.getUint16(28,true),
  size=v.getUint32(18,true),expanded=v.getUint32(22,true);
 const offset=30+nameSize+extra;
 if(nameSize!==10||offset+size>bytes.byteLength||
    size!==expanded||size!==report.files[0].size||
    size>STUDIO_LIMITS.packagedBytes)invalid();
 const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(30,30+nameSize));
 if(name!=='index.html')invalid();
 let html;
 try{html=new TextDecoder('utf-8',{fatal:true})
  .decode(bytes.subarray(offset,offset+size));}
 catch{invalid();}
 return parseStudioHtml(html);
}
