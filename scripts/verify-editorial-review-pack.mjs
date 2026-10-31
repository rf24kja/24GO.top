// Local-only verification of an explicit user-supplied editorial review package.
// No network, no publishing, no raw manuscript data in terminal output.
import {lstat,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {readEditorialReviewPackFile,MAX_REVIEW_PACK_BYTES}
 from '../site/draft-lab-review-pack.js';
export async function verifyReviewPackAtPath(path){
 if(typeof path!=='string'||!path||path.startsWith('-'))
  throw new TypeError('Specify a local review package JSON file');
 const stats=await lstat(path);
 if(!stats.isFile()||stats.isSymbolicLink()||
   stats.size<30||stats.size>MAX_REVIEW_PACK_BYTES)
  throw new TypeError('Invalid local review package file');
 const bytes=await readFile(path);
 if(bytes.byteLength!==stats.size)throw new TypeError('Review package changed while reading');
 const file={
  name:'local-review-pack.json',
  size:bytes.byteLength,
  async arrayBuffer(){return Uint8Array.from(bytes).buffer;}
 };
 const verified=await readEditorialReviewPackFile(file);
 return {bytes:verified.bytes,checksum:verified.sha256};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3){
  console.error('Usage: npm run review:verify -- /path/to/24gotop-editorial-review-pack.json');
  process.exitCode=2;
 }else{
  try{
   const result=await verifyReviewPackAtPath(process.argv[2]);
   console.log('PASS: local unpublished editorial review package integrity verified');
   console.log('Manuscript bytes:',result.bytes);
   console.log('SHA-256:',result.checksum);
   console.log('This does NOT verify authorship, copyright, moderation approval or publication.');
  }catch{
   console.error('FAIL: invalid, changed or unsupported local review package');
   process.exitCode=1;
  }
 }
}
