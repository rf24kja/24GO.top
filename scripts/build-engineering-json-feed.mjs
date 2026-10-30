// JSON Feed 1.1 generator for trusted, reviewed 24GOTOP editorial source.
// Do not use this tiny RSS parser on arbitrary external XML.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const dir=new URL('../site/engineering/',import.meta.url);
const root='https://24go.top/engineering/';
function value(xml,tag){
 const m=xml.match(new RegExp('<'+tag+'>([\\s\\S]*?)</'+tag+'>'));
 if(!m)throw Error('Missing RSS '+tag);
 if(/&(?!(?:amp|lt|gt|quot|apos);)/.test(m[1]))throw Error('Unexpected XML entity');
 const e={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
 return m[1].replace(/&(amp|lt|gt|quot|apos);/g,(_,name)=>e[name]);
}
export function buildEngineeringFeed(rss,readArticle){
 const blocks=[...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(x=>x[1]);
 if(!blocks.length)throw Error('No RSS article items');
 let previous=Infinity;
 const seen=new Set();
 const items=blocks.map(block=>{
  const url=value(block,'link');
  const file=url.slice(root.length);
  if(!url.startsWith(root)||!/^[a-z0-9-]+\.html$/.test(file)||
     seen.has(file)||value(block,'guid isPermaLink="true"')!==url)
    throw Error('Noncanonical or duplicate RSS item');
  seen.add(file);
  const html=readArticle(file);
  const ld=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if(ld.length!==1)throw Error('Expected one Article JSON-LD: '+file);
  const article=JSON.parse(ld[0][1]);
  const title=value(block,'title'),summary=value(block,'description');
  const time=Date.parse(value(block,'pubDate'));
  if(!Number.isFinite(time)||time>previous)throw Error('Invalid RSS date/order');
  previous=time;
  if(article['@type']!=='Article'||article.headline!==title||
     article.inLanguage!=='en'||Date.parse(article.datePublished)!==time||
     article.mainEntityOfPage?.['@id']!==url||
     !html.includes('<link rel="canonical" href="'+url+'">'))
    throw Error('Article/RSS metadata mismatch: '+file);
  const author=article.author;
  if(!author?.name||!['Person','Organization'].includes(author['@type']))
    throw Error('Unverified article byline');
  return {id:url,url,title,summary,
   content_text:summary+'\n\nRead full original article: '+url,
   date_published:new Date(time).toISOString().replace('.000Z','Z'),
   language:'en',
   authors:[{name:author.name,...(author.url?{url:author.url}:{})}]};
 });
 return {version:'https://jsonfeed.org/version/1.1',
  title:'24GOTOP Engineering Notes',home_page_url:root,feed_url:root+'feed.json',
  description:'Original, source-backed engineering articles about building 24GOTOP. The hosted publishing community is not yet launched.',
  language:'en',items};
}
export function renderEngineeringFeed(){
 const rss=readFileSync(new URL('feed.xml',dir),'utf8');
 const feed=buildEngineeringFeed(rss,file=>readFileSync(new URL(file,dir),'utf8'));
 return JSON.stringify(feed,null,2)+'\n';
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const output=new URL('feed.json',dir);
 if(process.argv[2]==='--check'){
  if(readFileSync(output,'utf8')!==renderEngineeringFeed()){
   console.error('JSON Feed is stale: run npm run feed:write after updating RSS/HTML');
   process.exitCode=1;
  }else console.log('PASS: JSON Feed matches RSS and Article JSON-LD');
 }else if(process.argv[2]==='--write'){
  writeFileSync(output,renderEngineeringFeed());
  console.log('Updated engineering/feed.json');
 }else{
  console.error('Expected --write or --check');
  process.exitCode=2;
 }
}
