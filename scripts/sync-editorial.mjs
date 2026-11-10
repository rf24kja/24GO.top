// One reviewed-source editorial synchronization gate for PUBLIC static articles.
// No network, no user drafts, no backend writes, and no metadata invention.
// Content, rights, canonical Article JSON-LD, RSS and archive cards remain
// human-reviewed input; this tool ONLY regenerates derived discovery files.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {buildEngineeringFeed} from './build-engineering-json-feed.mjs';
import {buildEngineeringSearchIndex} from './build-engineering-search-index.mjs';
import {buildSitemap} from './build-sitemap.mjs';
import {buildRelatedReading} from './build-related-reading.mjs';

const SITE=new URL('../site/',import.meta.url);
const PREFIX='https://24go.top/engineering/';
const READER_PATH='engineering/article-reader.mjs';
const MANIFEST=/^export const PUBLIC_READING_FILES=Object\.freeze\((\[[^\r\n]*\])\);$/gm;
const MAX_MANIFEST=200;

export function regenerateReaderAllowlist(source,items){
 if(typeof source!=='string'||source.length>100000||!Array.isArray(items)||
    !items.length||items.length>MAX_MANIFEST)
  throw new TypeError('Invalid reviewed reader source or feed');
 const matches=[...source.matchAll(MANIFEST)];
 if(matches.length!==1)throw new TypeError('Expected exactly one reviewed reading-list manifest');
 const previous=JSON.parse(matches[0][1]);
 if(!Array.isArray(previous)||previous.length>MAX_MANIFEST||
    previous.some(file=>typeof file!=='string'||!/^[a-z0-9-]+\.html$/.test(file))||
    new Set(previous).size!==previous.length)
  throw new TypeError('Invalid existing reading-list manifest');
 const files=items.map(item=>{
  const url=item?.url;
  if(typeof url!=='string'||!url.startsWith(PREFIX)||
     item.id!==url)throw new TypeError('Untrusted public reading-list item');
  const file=url.slice(PREFIX.length);
  if(!/^[a-z0-9-]+\.html$/.test(file))throw new TypeError('Invalid reading-list path');
  return file;
 });
 if(new Set(files).size!==files.length)throw new TypeError('Duplicate reading-list article');
 return source.replace(matches[0][0],
  'export const PUBLIC_READING_FILES=Object.freeze('+JSON.stringify(files)+');');
}

/** Plan EVERY derived file first. Errors mean no source changes are written. */
export function planEditorialSync({rss,archive,home,readerSource,readPage}){
 if(typeof rss!=='string'||typeof archive!=='string'||
    typeof home!=='string'||typeof readPage!=='function')
  throw new TypeError('Invalid editorial source inputs');
 const feed=buildEngineeringFeed(rss,file=>readPage('engineering/'+file));
 const json=JSON.stringify(feed,null,2)+'\n';
 const search=JSON.stringify(buildEngineeringSearchIndex(
  feed,file=>readPage('engineering/'+file)),null,2)+'\n';
 const sitemap=buildSitemap({home,feed,readPage});
 const related=buildRelatedReading({
  feed,archive,readArticle:file=>readPage('engineering/'+file)
 });
 const reader=regenerateReaderAllowlist(readerSource,feed.items);
 const output=new Map([
  ['engineering/feed.json',json],
  ['engineering/search-index.json',search],
  ['sitemap.xml',sitemap],
  [READER_PATH,reader]
 ]);
 for(const [file,html] of related){
  if(!/^[a-z0-9-]+\.html$/.test(file))throw new TypeError('Invalid related article');
  output.set('engineering/'+file,html);
 }
 return output;
}

export function planFromReviewedSite(){
 const read=path=>readFileSync(new URL(path,SITE),'utf8');
 return planEditorialSync({
  rss:read('engineering/feed.xml'),
  archive:read('engineering/index.html'),
  home:read('index.html'),
  readerSource:read(READER_PATH),
  readPage:read
 });
}

function current(path){return readFileSync(new URL(path,SITE),'utf8');}
export function changedEditorialFiles(plan,read=current){
 if(!(plan instanceof Map)||typeof read!=='function')
  throw new TypeError('Invalid generated editorial plan');
 return [...plan].filter(([path,generated])=>
   typeof generated!=='string'||generated!==read(path)).map(([path])=>path);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  if(process.argv.length!==3||!['--check','--write'].includes(process.argv[2]))
   throw new TypeError('Usage: node scripts/sync-editorial.mjs --check|--write');
  const plan=planFromReviewedSite();
  const stale=changedEditorialFiles(plan);
  if(process.argv[2]==='--check'){
   if(stale.length)throw new Error('Stale derived public editorial files: '+stale.join(', '));
   console.log('PASS editorial sync: '+plan.size+' reviewed and derived public files match');
  }else{
   // Only local reviewed PUBLIC source files. Does not push, publish or upload.
   for(const path of stale)writeFileSync(new URL(path,SITE),plan.get(path),'utf8');
   console.log('Updated '+stale.length+' local derived public editorial files; review git diff before PR.');
  }
 }catch(error){
  console.error('Editorial sync failed:',error.message);
  process.exitCode=1;
 }
}
