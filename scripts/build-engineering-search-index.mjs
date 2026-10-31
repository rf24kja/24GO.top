// Deterministic read-only full-text index for reviewed static engineering articles.
// Article URLs are allowlisted by the already-validated JSON Feed, never by user input.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const dir=new URL('../site/engineering/',import.meta.url);
const origin='https://24go.top/engineering/';
const decodeEntities=text=>text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/g,(_,name)=>{
  const names={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
  if(Object.hasOwn(names,name))return names[name];
  const n=name[1]==='x'?parseInt(name.slice(2),16):parseInt(name.slice(1),10);
  return n>0&&n<=0x10FFFF&&!(n>=0xD800&&n<=0xDFFF)
    ? String.fromCodePoint(n):' ';
});

export function buildEngineeringSearchIndex(feed,readArticle){
 if(feed?.version!=='https://jsonfeed.org/version/1.1'||
    !Array.isArray(feed.items)||!feed.items.length)throw Error('Invalid reviewed feed');
 const seen=new Set(), articles=[];
 for(const item of feed.items){
  const url=item?.url;
  if(typeof url!=='string'||!url.startsWith(origin))throw Error('Untrusted article URL');
  const file=url.slice(origin.length);
  if(!/^[a-z0-9-]+\.html$/.test(file)||seen.has(file))
    throw Error('Duplicate or noncanonical article path');
  seen.add(file);
  const html=readArticle(file);
  if(typeof html!=='string'||
     !html.includes('<link rel="canonical" href="'+url+'">'))
    throw Error('Missing article or canonical HTML: '+file);
  const block=html.match(/<article class="article">([\s\S]*?)<\/article>/);
  if(!block)throw Error('Missing visible article content: '+file);
  // Trust reviewed static HTML only; decode visible content, never index
  // JSON-LD scripts, hidden navigation, backend credentials, or arbitrary files.
  if(/<(?:script|style|iframe|form)\b/i.test(block[1]))
    throw Error('Unexpected executable markup in article: '+file);
  const content=decodeEntities(
   block[1].replace(/<!--[\s\S]*?-->/g,' ')
     .replace(/<[^>]*>/g,' ')
  ).normalize('NFC').replace(/\s+/g,' ').trim().toLocaleLowerCase();
  if(content.length<300||content.length>24000)
    throw Error('Unreasonable visible article length: '+file);
  articles.push({file,text:content});
 }
 return {version:1,articles};
}

export function renderEngineeringSearchIndex(){
 const feed=JSON.parse(readFileSync(new URL('feed.json',dir),'utf8'));
 return JSON.stringify(buildEngineeringSearchIndex(feed,file=>
  readFileSync(new URL(file,dir),'utf8')),null,2)+'\n';
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const target=new URL('search-index.json',dir);
 if(process.argv[2]==='--check'){
  if(readFileSync(target,'utf8')!==renderEngineeringSearchIndex()){
   console.error('Engineering search index stale: run npm run search:write');
   process.exitCode=1;
  }else console.log('PASS: local article search index matches reviewed HTML and JSON Feed');
 }else if(process.argv[2]==='--write'){
  writeFileSync(target,renderEngineeringSearchIndex());
  console.log('Updated static engineering search index');
 }else{
  console.error('Expected --write or --check');
  process.exitCode=2;
 }
}
