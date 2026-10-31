// Accessible internal reading paths for actually published, reviewed articles.
// No dynamic rendering, inferred author identity, network calls or SEO promises.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {renderEngineeringFeed} from './build-engineering-json-feed.mjs';

const root=new URL('../site/engineering/',import.meta.url);
const canonical='https://24go.top/engineering/';
const validTopic=new Set(['security','writing','infrastructure','publishing','discovery']);
const fail=x=>{throw new Error('Related reading integrity: '+x)};
const escapeHtml=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

export function buildRelatedReading({feed,archive,readArticle}){
 if(!feed||feed.version!=='https://jsonfeed.org/version/1.1'||
    !Array.isArray(feed.items)||feed.items.length<3||
    typeof archive!=='string'||typeof readArticle!=='function')
  fail('missing publication source');
 const cards=[...archive.matchAll(
  /<article class="card" data-note-card data-note-topic="([^"]+)" data-note-file="([^"]+)">/g)];
 const topics=new Map();
 for(const card of cards){
  const [,topic,file]=card;
  if(!validTopic.has(topic)||!/^[a-z0-9-]+\.html$/.test(file)||topics.has(file))
   fail('untrusted or duplicate archive card');
  topics.set(file,topic);
 }
 if(topics.size!==feed.items.length)fail('archive/feed cardinality');
 const docs=[],files=new Set();
 for(const item of feed.items){
  const url=item?.url,file=typeof url==='string'&&url.startsWith(canonical)
   ?url.slice(canonical.length):'';
  if(!/^[a-z0-9-]+\.html$/.test(file)||url!==canonical+file||
    item.id!==url||files.has(file)||!topics.has(file)||
    typeof item.title!=='string'||!item.title.trim()||item.title.length>200)
   fail('unverified publication');
  files.add(file);
  const html=readArticle(file);
  if(typeof html!=='string'||
    !html.includes('<link rel="canonical" href="'+url+'">')||
    !/<article class="article">/.test(html)||
    !/<\/article>\s*<\/main>/.test(html.replace(
       /\n<nav class="related-reading" aria-label="Continue reading">[\s\S]*?<\/nav>(?=\s*<\/main>)/,''
    )))fail('article or canonical missing: '+file);
  docs.push({file,title:item.title,topic:topics.get(file),html});
 }
 // HTML index and JSON Feed must cover precisely the same reviewed files.
 if(files.size!==topics.size)fail('unreviewed archive entries');
 const out=new Map();
 docs.forEach((doc,index)=>{
  const ordered=docs.map((other,i)=>({other,i,distance:Math.abs(i-index)}))
   .filter(entry=>entry.i!==index)
   .sort((a,b)=>a.distance-b.distance||a.i-b.i);
  const same=ordered.find(entry=>entry.other.topic===doc.topic)?.other;
  const candidates=[...(same?[same]:[]),...ordered.map(entry=>entry.other)];
  const seen=new Set(),related=[];
  for(const other of candidates){
   if(seen.has(other.file)||other.file===doc.file)continue;
   seen.add(other.file);related.push(other);
   if(related.length===2)break;
  }
  if(related.length!==2)fail('not enough reviewed related entries');
  const nav='<nav class="related-reading" aria-label="Continue reading">\n'+
   '  <h2>Continue reading</h2>\n'+
   '  <ul>\n'+related.map(other=>
    '    <li><a href="./'+other.file+'">'+escapeHtml(other.title)+'</a></li>'
   ).join('\n')+'\n  </ul>\n'+
   '  <p><a href="./">Explore all engineering notes</a></p>\n'+
   '</nav>';
  const clean=doc.html.replace(
   /\n<nav class="related-reading" aria-label="Continue reading">[\s\S]*?<\/nav>(?=\s*<\/main>)/,'');
  out.set(doc.file,clean.replace(/<\/article>\s*<\/main>/,'</article>\n'+nav+'\n</main>'));
 });
 return out;
}
export function renderRelatedReadingPages(){
 const feed=JSON.parse(renderEngineeringFeed());
 const archive=readFileSync(new URL('index.html',root),'utf8');
 return buildRelatedReading({feed,archive,readArticle:file=>
  readFileSync(new URL(file,root),'utf8')});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const pages=renderRelatedReadingPages();
 if(process.argv[2]==='--check'){
  for(const [file,html] of pages){
   if(readFileSync(new URL(file,root),'utf8')!==html)fail('stale navigation '+file);
  }
  console.log('PASS: related reading links match reviewed archive and feed');
 }else if(process.argv[2]==='--write'){
  for(const [file,html] of pages)writeFileSync(new URL(file,root),html);
  console.log('Updated '+pages.size+' reviewed static reading paths');
 }else{console.error('Expected --check or --write');process.exitCode=2;}
}
