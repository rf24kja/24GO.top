// Static sitemap built only from actual reviewed editorial sources.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {renderEngineeringFeed} from './build-engineering-json-feed.mjs';

const root=new URL('../site/',import.meta.url);
const origin='https://24go.top';
const staticPaths=['contribute.html','progress.html','engineering/index.html',
 'engineering/topics/security.html','engineering/topics/writing.html',
 'engineering/topics/infrastructure.html','engineering/topics/publishing.html'];
const invalid=reason=>{throw new Error('Sitemap integrity: '+reason)};
const read=path=>readFileSync(new URL(path,root),'utf8');
function canonical(html,url,path){
 if(typeof html!=='string'||!html.includes('<link rel="canonical" href="'+url+'">')||
  /<meta name="robots" content="[^"]*noindex/i.test(html)||
  !/<h1(?:\s|>)/.test(html))invalid('unindexable canonical: '+path);
}
export function buildSitemap({home,feed,readPage}){
 if(typeof home!=='string'||!Array.isArray(feed?.items)||!feed.items.length||
  typeof readPage!=='function')invalid('invalid sources');
 const alternates=[...home.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)];
 const locales=alternates.filter(x=>x[1]!=='x-default');
 if(locales.length<1||locales.length>24||locales[0][1]!=='en'||
  alternates.length!==locales.length+1||
  alternates.at(-1)?.[1]!=='x-default'||alternates.at(-1)[2]!==origin+'/')
  invalid('locale inventory');
 const seen=new Set(),urls=[];
 function add(url,path,html){
  if(seen.has(url))invalid('duplicate canonical '+url);
  canonical(html,url,path);seen.add(url);urls.push(url);
 }
 for(const [,lang,url] of locales){
  if(!/^[a-z]{2}$/.test(lang)||
   url!==origin+'/'+(lang==='en'?'':lang+'/'))invalid('untrusted locale');
  const path=lang==='en'?'index.html':lang+'/index.html';
  const html=lang==='en'?home:readPage(path);
  if(!html.includes('<html lang="'+lang+'">'))invalid('locale mismatch');
  for(const [,code,href] of alternates){
   if(!html.includes('<link rel="alternate" hreflang="'+code+'" href="'+href+'">'))
    invalid('hreflang not reciprocal: '+path);
  }
  add(url,path,html);
 }
 for(const path of staticPaths){
  const suffix=path.endsWith('/index.html')?path.slice(0,-'index.html'.length):path;
  add(origin+'/'+suffix,path,readPage(path));
 }
 const prefix=origin+'/engineering/';
 for(const item of feed.items){
  const url=item?.url,file=typeof url==='string'&&url.startsWith(prefix)
   ?url.slice(prefix.length):'';
  if(!/^[a-z0-9-]+\.html$/.test(file)||item.id!==url)
   invalid('untrusted article');
  add(url,'engineering/'+file,readPage('engineering/'+file));
 }
 return '<?xml version="1.0" encoding="UTF-8"?>\n'+
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
  urls.map(url=>'  <url><loc>'+url+'</loc></url>').join('\n')+'\n</urlset>\n';
}
export function renderSitemap(){
 // This generator validates RSS/Article JSON-LD as part of renderEngineeringFeed.
 const feed=JSON.parse(renderEngineeringFeed());
 return buildSitemap({home:read('index.html'),feed,readPage:read});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const output=new URL('sitemap.xml',root);
 if(process.argv[2]==='--check'){
  if(readFileSync(output,'utf8')!==renderSitemap()){
   console.error('Sitemap stale: run npm run sitemap:write');
   process.exitCode=1;
  }else console.log('PASS: canonical sitemap matches verified sources');
 }else if(process.argv[2]==='--write'){
  writeFileSync(output,renderSitemap());
  console.log('Updated reviewed static sitemap');
 }else{console.error('Expected --check or --write');process.exitCode=2;}
}
