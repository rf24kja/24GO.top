// Pure sharing rules for PUBLIC, already-reviewed engineering articles.
// No user IDs, accounts, external API, persistence or arbitrary destinations.
export const MAX_READING_PATH_ITEMS=10;
const MAX_FRAGMENT=2200;
const ITEM=/^[a-z0-9]+(?:-[a-z0-9]+)*\.html$/;
const CONTROL=/[\u0000-\u001f\u007f\u2028\u2029]/u;
const UNPAIRED=/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
const ROOT='https://24go.top/engineering/';
function invalid(){throw new TypeError('invalid_reading_path');}
function text(value,max){return typeof value==='string'&&value.length<=max&&!CONTROL.test(value)&&!UNPAIRED.test(value);}
export function approvedReadingArticles(feed){
 if(!feed||!Array.isArray(feed.items)||feed.items.length<1||feed.items.length>200)invalid();
 const found=new Set();
 return feed.items.map(item=>{
  if(!item||!text(item.url,240)||!item.url.startsWith(ROOT))invalid();
  const id=item.url.slice(ROOT.length);
  if(!ITEM.test(id)||item.url!==ROOT+id||found.has(id)||
     !text(item.title,200)||item.title.trim().length<5||
     !text(item.summary,500))invalid();
  found.add(id);
  return Object.freeze({id,url:item.url,title:item.title,summary:item.summary});
 });
}
export function normalizeReadingPath(value,approved,{requireItems=false}={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||!Array.isArray(approved))invalid();
 const ids=value.ids,title=value.title;
 if(!text(title,80)||!Array.isArray(ids)||ids.length>MAX_READING_PATH_ITEMS||
    (requireItems&&ids.length===0))invalid();
 const allow=new Set(approved.map(x=>x.id)),seen=new Set();
 for(const id of ids){
  if(typeof id!=='string'||!ITEM.test(id)||!allow.has(id)||seen.has(id))invalid();
  seen.add(id);
 }
 return Object.freeze({title:title.trim()||'My 24GOTOP reading path',ids:Object.freeze([...ids])});
}
export function encodeReadingPath(value,approved){
 const state=normalizeReadingPath(value,approved,{requireItems:true});
 const fragment='#path='+encodeURIComponent(JSON.stringify({v:1,title:state.title,ids:state.ids}));
 if(fragment.length>MAX_FRAGMENT)invalid();
 return fragment;
}
export function decodeReadingPath(hash,approved){
 if(hash===''||hash===undefined)return null;
 if(typeof hash!=='string'||hash.length>MAX_FRAGMENT||!hash.startsWith('#path='))invalid();
 let data;
 try{data=JSON.parse(decodeURIComponent(hash.slice(6)));}catch{invalid();}
 if(!data||typeof data!=='object'||Array.isArray(data)||data.v!==1||
    Object.keys(data).sort().join(',')!=='ids,title,v')invalid();
 return normalizeReadingPath(data,approved,{requireItems:true});
}
export function changeReadingPath(ids,id,action,approved){
 const current=normalizeReadingPath({title:'',ids},approved);
 if(!approved.some(row=>row.id===id))invalid();
 const next=[...current.ids],index=next.indexOf(id);
 if(action==='add'){
  if(index!==-1)return next;
  if(next.length===MAX_READING_PATH_ITEMS)invalid();
  next.push(id);
 }else if(action==='remove'){
  if(index!==-1)next.splice(index,1);
 }else if(action==='up'||action==='down'){
  if(index===-1)invalid();
  const target=index+(action==='up'?-1:1);
  if(target>=0&&target<next.length)[next[index],next[target]]=[next[target],next[index]];
 }else invalid();
 return next;
}
const escapeLabel=value=>value.replace(/[\\\[\]]/g,'\\$&');
export function readingPathMarkdown(value,approved){
 const state=normalizeReadingPath(value,approved,{requireItems:true});
 const byId=new Map(approved.map(item=>[item.id,item]));
 return '# '+state.title+'\n\n'+state.ids.map((id,i)=>{
  const item=byId.get(id);
  return (i+1)+'. ['+escapeLabel(item.title)+']('+item.url+')';
 }).join('\n')+'\n';
}
