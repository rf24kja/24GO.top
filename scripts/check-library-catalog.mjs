/** CI publication gate: first-party reviewed static apps only.
 * Validates the full on-disk catalog; no execution, uploads or deployment.
 */
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateStaticDirectory} from '../packages/library/validator.mjs';
import {validateLibraryCatalog} from '../site/library/library-core.mjs';
const APPS=resolve(fileURLToPath(new URL('../site/library/apps/',import.meta.url)));
const CATALOG=resolve(fileURLToPath(new URL('../site/library/catalog.json',import.meta.url)));
const validSlug=/^[a-z][a-z0-9-]{2,39}$/;
const error=message=>{throw new TypeError('Library release gate: '+message);};

export async function auditReviewedLibrary({
 appRoot=APPS,catalogPath=CATALOG
}={}){
 const contents=await readFile(catalogPath,'utf8');
 if(Buffer.byteLength(contents,'utf8')>32768)
  error('public app catalog exceeds limit');
 let metadata;
 try{metadata=validateLibraryCatalog(JSON.parse(contents));}
 catch{error('invalid app catalog');}
 const entries=await readdir(appRoot,{withFileTypes:true});
 const seen=new Set(),approved=new Set(metadata.apps.map(x=>x.id));
 for(const entry of entries){
  if(!entry.isDirectory()||!validSlug.test(entry.name)||!approved.has(entry.name))
   error('unlisted or unsafe app directory: '+entry.name);
  if(seen.has(entry.name))error('duplicate app directory');
  seen.add(entry.name);
 }
 if(seen.size!==approved.size)error('catalog references missing source directories');
 const verified=[];
 for(const app of metadata.apps){
  const dir=join(appRoot,app.id);
  const report=await validateStaticDirectory(dir);
  if(report.reviewRequired!==true||report.automaticHosting!==false||
     report.entry!=='index.html')error('invalid static package checks for '+app.id);
  const entry=await readFile(join(dir,'index.html'),'utf8');
  const match=entry.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  if(!match)error('missing no-network inline CSP: '+app.id);
  const policy=match[1];
  for(const directive of [
   "default-src 'none'","connect-src 'none'","form-action 'none'",
   "base-uri 'none'","object-src 'none'"
  ])if(!policy.includes(directive))error('unsafe CSP '+app.id+': '+directive);
  if(!entry.includes('<title>'+app.name+' — 24GOTOP Library</title>'))
   error('app HTML title must match catalog: '+app.id);
  if(!/<html(?:\s|>)/i.test(entry)||!/<h1(?:\s|>)/i.test(entry))
   error('app is missing meaningful semantic document: '+app.id);
  verified.push(Object.freeze({
   id:app.id,version:app.version,entry:app.entry,files:report.files.length,
   expandedBytes:report.totalBytes,
   indexSha256:report.files.find(x=>x.path==='index.html')?.sha256
  }));
 }
 return Object.freeze({
  reviewedBy:'source-review-required',count:verified.length,
  apps:Object.freeze(verified)
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const arg=process.argv[2];
 if(arg!=='--check'){process.stderr.write('Usage: node scripts/check-library-catalog.mjs --check\n');process.exitCode=2;}
 else auditReviewedLibrary().then(report=>{
  process.stdout.write('PASS Library publication gate: '+report.count+
   ' catalog entries, no unlisted executable app dirs; every source validated and CSP-checked\n');
 }).catch(()=>{
  process.stderr.write('FAIL Library app publication gate: check app catalog, source files and package integrity\n');
  process.exitCode=1;
 });
}
