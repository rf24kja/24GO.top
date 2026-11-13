// Discover EVERY static HTML page shipped with PUBLIC GitHub Pages.
// No arbitrary paths, symlink traversal, private files or network access.
import {readdir} from 'node:fs/promises';
import {join} from 'node:path';

const SEGMENT=/^[a-z0-9-]+$/;
const PAGE=/^[a-z0-9-]+\.html$/;
export async function discoverPublicHtmlRoutes(root){
 if(typeof root!=='string'||!root)throw new TypeError('Invalid public site root');
 const pages=[],pending=[{dir:root,prefix:'',depth:0}];
 while(pending.length){
  const {dir,prefix,depth}=pending.pop();
  if(depth>6)throw new RangeError('Public site nesting too deep');
  const entries=await readdir(dir,{withFileTypes:true});
  for(const entry of entries){
   // Reject unsupported filesystem topology rather than silently omitting
   // pages that a deployment might serve differently.
   if(entry.isSymbolicLink())throw new TypeError('Symlink in public site');
   if(entry.isDirectory()){
    if(!SEGMENT.test(entry.name))throw new TypeError('Unexpected public directory');
    pending.push({dir:join(dir,entry.name),prefix:prefix+entry.name+'/',depth:depth+1});
   }else if(entry.isFile()&&PAGE.test(entry.name)){
    pages.push(prefix+entry.name);
    if(pages.length>150)throw new RangeError('Excessive public HTML inventory');
   }else if(!entry.isFile()){
    throw new TypeError('Unexpected public filesystem entry');
   }
  }
 }
 if(!pages.includes('index.html')||!pages.includes('privacy.html')||
    !pages.includes('engineering/index.html')||pages.length<14)
  throw new TypeError('Incomplete public HTML inventory');
 return Object.freeze(pages.sort());
}
