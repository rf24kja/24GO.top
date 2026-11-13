import {normalizeReadingPath,encodeReadingPath,
 decodeReadingPath,changeReadingPath,readingPathMarkdown,MAX_READING_PATH_ITEMS}
 from './paths-logic.mjs';
import {loadStaticReadingPathCatalog} from './paths-feed.mjs';

// This screen consumes only the already published, same-origin JSON Feed.
// It does not store drafts, call an author API or publish new content.
const el=id=>document.getElementById(id);
const catalog=el('path-catalog'),selected=el('path-selected');
const title=el('path-title'),search=el('path-search');
const copyStatus=el('path-copy-status'),manual=el('path-manual-copy');
const status=el('path-status');
let approved=[],ids=[];
// An obsolete clipboard permission result cannot rewrite newer path feedback.
let copyRevision=0;
const node=(name,value,className)=>{
 const item=document.createElement(name);
 if(value!==undefined)item.textContent=String(value);
 if(className)item.className=className;
 return item;
};
const button=(label,callback,{disabled=false,ariaLabel=null}={})=>{
 const item=node('button',label);
 item.type='button';item.disabled=disabled;
 if(ariaLabel)item.setAttribute('aria-label',ariaLabel);
 item.addEventListener('click',callback);
 return item;
};
function forgetManual(){
 ++copyRevision;
 manual.value='';manual.hidden=true;el('path-manual-label').hidden=true;
 copyStatus.textContent='';
}
function showManual(value){
 manual.value=value;manual.hidden=false;el('path-manual-label').hidden=false;
 manual.focus();manual.select();
 copyStatus.textContent='Clipboard unavailable. Select and copy the text above manually.';
}
function renderCatalog(){
 catalog.replaceChildren();
 const query=search.value.trim().toLocaleLowerCase();
 const matches=approved.filter(article=>(article.title+' '+article.summary)
  .toLocaleLowerCase().includes(query));
 el('catalog-count').textContent=matches.length+' notes';
 for(const article of matches){
  const li=node('li',undefined,'path-catalog-item');
  const info=node('div');
  const link=node('a',article.title,'path-article-link');
  link.href=article.url;link.rel='noopener noreferrer';info.append(link);
  const summary=node('p',article.summary,'path-small');info.append(summary);
  const active=ids.includes(article.id);
  const add=button(active?'Added':'Add to path',()=>{
   try{
    const keepFocus=document.activeElement===add;
    ids=changeReadingPath(ids,article.id,'add',approved);
    render(); // The original button was replaced by the updated catalog.
    status.textContent='Added '+article.title+' to the reading path.';
    if(keepFocus){
     // Preserve keyboard position by focusing the same reviewed article
     // link, not a detached or now-disabled button.
     const link=[...catalog.querySelectorAll('.path-catalog-item .path-article-link')]
      .find(item=>item.href===article.url);
     (link||title).focus();
    }
   }catch{status.textContent='You can select at most ten articles.';}
  },{disabled:active||ids.length>=MAX_READING_PATH_ITEMS,
   ariaLabel:(active?'Already selected: ':'Add: ')+article.title});
  li.append(info,add);catalog.append(li);
 }
 if(!matches.length)catalog.append(node('li','No matching public articles. Try another keyword.','path-small'));
}
function renderSelected(){
 selected.replaceChildren();
 const lookup=new Map(approved.map(article=>[article.id,article]));
 ids.forEach((id,index)=>{
  const article=lookup.get(id);
  const li=node('li',undefined,'path-selected-item');
  const text=node('div');
  const link=node('a',article.title,'path-article-link');
  link.href=article.url;link.rel='noopener noreferrer';
  text.append(link);
  const tools=node('div',undefined,'path-item-actions');
  tools.append(
   button('↑',()=>reorder(id,'up'),{disabled:index===0,ariaLabel:'Move '+article.title+' earlier'}),
   button('↓',()=>reorder(id,'down'),{disabled:index===ids.length-1,ariaLabel:'Move '+article.title+' later'}),
   button('Remove',()=>reorder(id,'remove'),{ariaLabel:'Remove '+article.title})
  );
  li.append(text,tools);selected.append(li);
 });
 if(!ids.length)selected.append(node('li','No articles yet. Add one from the catalog to start.','path-empty'));
 el('selected-count').textContent=ids.length+' / '+MAX_READING_PATH_ITEMS;
 el('path-copy-link').disabled=ids.length===0;
 el('path-copy-markdown').disabled=ids.length===0;
 el('path-download-markdown').disabled=ids.length===0;
 el('path-reset').disabled=ids.length===0;
}
function render(){forgetManual();renderCatalog();renderSelected();}
function reorder(id,action){
 try{
  const keepFocus=selected.contains(document.activeElement);
  const previousIndex=ids.indexOf(id);
  ids=changeReadingPath(ids,id,action,approved);
  render();
  status.textContent=action==='remove'
   ?'Removed an article from the reading path.':'Updated reading order.';
  if(keepFocus){
   // A re-render destroys the activated control. Move focus to the
   // remaining article at that position or a stable title input.
   const rows=[...selected.querySelectorAll('.path-selected-item')];
   const url=approved.find(article=>article.id===id)?.url;
   const target=action==='remove'
    ?rows[Math.min(previousIndex,rows.length-1)]?.querySelector('.path-article-link')
    :rows.find(row=>row.querySelector('.path-article-link')?.href===url)
     ?.querySelector('.path-article-link');
   (target||title).focus();
  }
 }catch{status.textContent='Could not change your reading path.';}
}
search.addEventListener('input',()=>{forgetManual();renderCatalog();});
title.addEventListener('input',forgetManual);
el('path-reset').addEventListener('click',()=>{
 ids=[];title.value='My 24GOTOP reading path';render();
 status.textContent='Path cleared from this tab. No account data was changed.';
});
async function copyValue(value){
 forgetManual();
 const ticket=copyRevision;
 copyStatus.textContent='Copying public reading path…';
 try{
  if(!navigator.clipboard?.writeText)throw Error('no_clipboard');
  await navigator.clipboard.writeText(value);
  if(ticket===copyRevision)
   copyStatus.textContent='Copied. Share it with another reader.';
 }catch{
  // A newer copy, title edit, selection or reset invalidates this attempt.
  // No stale textarea or focus theft after a delayed browser denial.
  if(ticket===copyRevision)showManual(value);
 }
}
el('path-copy-link').addEventListener('click',()=>{
 try{
  const state=normalizeReadingPath({title:title.value,ids},approved,{requireItems:true});
  const url=new URL('./',window.location.href);
  url.hash=encodeReadingPath(state,approved);
  void copyValue(url.href);
 }catch{forgetManual();copyStatus.textContent='Check your title and select at least one article.';}
});
el('path-copy-markdown').addEventListener('click',()=>{
 try{void copyValue(readingPathMarkdown({title:title.value,ids},approved));}
 catch{forgetManual();copyStatus.textContent='Check your title and select at least one article.';}
});
// Explicit local download is independent from browser clipboard permissions.
// No link, title or draft content is sent to a remote service.
el('path-download-markdown').addEventListener('click',()=>{
 forgetManual();
 let downloadUrl;
 let anchor;
 try{
  const markdown=readingPathMarkdown({title:title.value,ids},approved);
  const blob=new Blob([markdown],{type:'text/markdown;charset=utf-8'});
  downloadUrl=URL.createObjectURL(blob);
  anchor=node('a');
  anchor.href=downloadUrl;
  anchor.download='24gotop-reading-path.md';
  document.body.append(anchor);
  anchor.click();
  copyStatus.textContent='Markdown download requested. Check your browser downloads.';
 }catch{
  copyStatus.textContent='Could not download the reading path. Use Copy Markdown list instead.';
 }finally{
  anchor?.remove();
  // Keep the temporary download URL alive long enough for the browser to
  // begin saving it, then free its memory; never keep it in localStorage.
  if(downloadUrl)setTimeout(()=>URL.revokeObjectURL(downloadUrl),10000);
 }
});

async function load(){
 try{
  approved=await loadStaticReadingPathCatalog();
  if(window.location.hash){
   try{
    const shared=decodeReadingPath(window.location.hash,approved);
    if(shared){ids=[...shared.ids];title.value=shared.title;}
    status.textContent='Shared reading path loaded from the URL fragment.';
   }catch{
    status.textContent='The shared path is invalid or contains missing articles. Start a new path below.';
   }
  }else{
   status.textContent='Choose from '+approved.length+' original public engineering articles.';
  }
  render();
 }catch{
  status.textContent='The article catalog is unavailable. Use the engineering archive link instead.';
  search.disabled=true;title.disabled=true;
 }
}
void load();
