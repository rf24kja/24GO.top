import {normalizeReadingPath,encodeReadingPath,
 decodeReadingPath,changeReadingPath,readingPathMarkdown,
 readingPathMcpArguments,MAX_READING_PATH_ITEMS}
 from './paths-logic.mjs';
import {loadStaticReadingPathCatalog} from './paths-feed.mjs';
import {PATH_LOCALES,readingPathUiText,applyReadingPathLocale} from './paths-i18n.mjs';

// This screen consumes only the already published, same-origin JSON Feed.
// It does not store drafts, call an author API or publish new content.
const el=id=>document.getElementById(id);
const catalog=el('path-catalog'),selected=el('path-selected');
const title=el('path-title'),search=el('path-search');
const copyStatus=el('path-copy-status'),manual=el('path-manual-copy');
const status=el('path-status');
let approved=[],ids=[];
const localePicker=el('path-ui-locale');
const requestedLocale=new URL(window.location.href).searchParams.get('ui');
let language=PATH_LOCALES.includes(requestedLocale)?requestedLocale:'en';
localePicker.value=language;
const tr=key=>readingPathUiText(language,key);
applyReadingPathLocale(document,language);
localePicker.addEventListener('change',()=>{
 language=PATH_LOCALES.includes(localePicker.value)?localePicker.value:'en';
 applyReadingPathLocale(document,language);
 if(approved.length){
  render(); // Rebuild only labels. Current title, ids and order are unchanged.
  status.textContent=tr('choosePrefix')+approved.length+tr('chooseSuffix');
 }
});
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
 copyStatus.textContent=tr('manualFallback');
}
function renderCatalog(){
 catalog.replaceChildren();
 const query=search.value.trim().toLocaleLowerCase();
 const matches=approved.filter(article=>(article.title+' '+article.summary)
  .toLocaleLowerCase().includes(query));
 el('catalog-count').textContent=matches.length+tr('notesSuffix');
 for(const article of matches){
  const li=node('li',undefined,'path-catalog-item');
  const info=node('div');
  const link=node('a',article.title,'path-article-link');
  link.href=article.url;link.rel='noopener noreferrer';info.append(link);
  const summary=node('p',article.summary,'path-small');info.append(summary);
  const active=ids.includes(article.id);
  const add=button(tr(active?'added':'add'),()=>{
   try{
    const keepFocus=document.activeElement===add;
    ids=changeReadingPath(ids,article.id,'add',approved);
    render(); // The original button was replaced by the updated catalog.
    status.textContent=tr('addedPrefix')+article.title+tr('addedSuffix');
    if(keepFocus){
     // Preserve keyboard position by focusing the same reviewed article
     // link, not a detached or now-disabled button.
     const link=[...catalog.querySelectorAll('.path-catalog-item .path-article-link')]
      .find(item=>item.href===article.url);
     (link||title).focus();
    }
   }catch{status.textContent=tr('maxItems');}
  },{disabled:active||ids.length>=MAX_READING_PATH_ITEMS,
   ariaLabel:tr(active?'alreadySelected':'addAria')+article.title});
  li.append(info,add);catalog.append(li);
 }
 if(!matches.length)catalog.append(node('li',tr('noMatches'),'path-small'));
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
   button('↑',()=>reorder(id,'up'),{disabled:index===0,ariaLabel:tr('moveEarlier')+article.title}),
   button('↓',()=>reorder(id,'down'),{disabled:index===ids.length-1,ariaLabel:tr('moveLater')+article.title}),
   button(tr('remove'),()=>reorder(id,'remove'),{ariaLabel:tr('remove')+': '+article.title})
  );
  li.append(text,tools);selected.append(li);
 });
 if(!ids.length)selected.append(node('li',tr('noItems'),'path-empty'));
 el('selected-count').textContent=ids.length+' / '+MAX_READING_PATH_ITEMS;
 el('path-copy-link').disabled=ids.length===0;
 el('path-copy-mcp').disabled=ids.length===0;
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
   ?tr('removed'):tr('orderUpdated');
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
 }catch{status.textContent=tr('changeFailed');}
}
search.addEventListener('input',()=>{forgetManual();renderCatalog();});
title.addEventListener('input',forgetManual);
el('path-reset').addEventListener('click',()=>{
 ids=[];title.value='My 24GOTOP reading path';render();
 status.textContent=tr('cleared');
});
async function copyValue(value){
 forgetManual();
 const ticket=copyRevision;
 copyStatus.textContent=tr('copying');
 try{
  if(!navigator.clipboard?.writeText)throw Error('no_clipboard');
  await navigator.clipboard.writeText(value);
  if(ticket===copyRevision)
   copyStatus.textContent=value.startsWith('{"url":')
    ?tr('copiedMcp'):tr('copied');
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
 }catch{forgetManual();copyStatus.textContent=tr('invalid');}
});
el('path-copy-mcp').addEventListener('click',()=>{
 try{void copyValue(readingPathMcpArguments({title:title.value,ids},approved));}
 catch{forgetManual();copyStatus.textContent=tr('invalid');}
});
el('path-copy-markdown').addEventListener('click',()=>{
 try{void copyValue(readingPathMarkdown({title:title.value,ids},approved));}
 catch{forgetManual();copyStatus.textContent=tr('invalid');}
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
  copyStatus.textContent=tr('downloadRequested');
 }catch{
  copyStatus.textContent=tr('downloadFailed');
 }finally{
  anchor?.remove();
  // Keep the temporary download URL alive long enough for the browser to
  // begin saving it, then free its memory; this action stores nothing.
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
    status.textContent=tr('sharedLoaded');
   }catch{
    status.textContent=tr('sharedInvalid');
   }
  }else{
   status.textContent=tr('choosePrefix')+approved.length+tr('chooseSuffix');
  }
  render();
 }catch{
  status.textContent=tr('unavailable');
  search.disabled=true;title.disabled=true;
 }
}
void load();
