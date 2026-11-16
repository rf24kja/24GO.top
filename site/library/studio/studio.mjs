import {STUDIO_STARTER,STUDIO_STATIC_STARTER,buildStudioHtml,buildStudioZip} from './studio-core.mjs';
import {validateBrowserZip} from '../intake-core.mjs';
import {readValidatedStudioZip} from './studio-import.mjs';
import {sameStudioSource,hasUnsavedStudioSource} from './studio-session.mjs';

const $=id=>document.getElementById(id);
const frame=$('studio-frame'),placeholder=$('studio-preview-placeholder');
const status=$('studio-status'),run=$('studio-preview-run');
const download=$('studio-download'),stop=$('studio-close');
const fields={
 name:$('studio-name'),html:$('studio-html'),
 css:$('studio-css'),js:$('studio-js')
};
const tabs=[...document.querySelectorAll('[data-lang]')];
let epoch=0,running=false,active='html';
let importEpoch=0,actionEpoch=0,importing=false;
// Only a known built-in example or a verified imported file is a baseline.
// Preview, export, or attempting a download never counts as a saved copy.
let sourceBaseline=STUDIO_STARTER;
const saveNotice=$('studio-save-status');
function hasUnsavedChanges(){return hasUnsavedStudioSource(readDraft(),sourceBaseline);}
function updateSaveNotice(){
 const changed=hasUnsavedChanges();
 saveNotice.dataset.unsaved=String(changed);
 const next=changed?
  'Unsaved source changes in this tab. Download and confirm your ZIP before leaving.':
  'Current source matches a built-in example or verified imported ZIP.';
 if(saveNotice.textContent!==next)saveNotice.textContent=next;
}
function cancelPendingImport(){
 if(!importing)return;
 ++importEpoch;
 importing=false;
 importCheck.disabled=!importedFile.files?.length;
 announceImport('ZIP import cancelled because the source changed. Your edits were kept.');
}
function cancelPendingAction(){
 ++actionEpoch;
 run.disabled=false;
 download.disabled=false;
}
function finishAction(ticket){
 if(ticket===actionEpoch){run.disabled=false;download.disabled=false;}
}
function announce(message,isError=false){
 status.textContent=message;
 status.dataset.error=String(isError);
}
const importedFile=$('studio-import-file'),importCheck=$('studio-import-check');
const importStatus=$('studio-import-status');
function announceImport(message,isError=false){
 importStatus.textContent=message;
 importStatus.dataset.error=String(isError);
}
importedFile.addEventListener('change',()=>{
 importEpoch++;
 importing=false;
 importCheck.disabled=!importedFile.files?.length;
 announceImport(importCheck.disabled?'No existing project selected.':
  'ZIP selected. Choose Load ZIP into editors. This will replace your unsaved edits.');
});
importCheck.addEventListener('click',async()=>{
 const selected=importedFile.files?.[0];
 if(!selected)return;
 const ticket=++importEpoch;
 importCheck.disabled=true;
 if(!selected.size||selected.size>4*1024*1024){
  announceImport('App Studio ZIP must be nonempty and at most 4 MiB.',true);
  importCheck.disabled=false;return;
 }
 importing=true;
 announceImport('Verifying ZIP integrity and canonical Studio source locally…');
 try{
  const bytes=new Uint8Array(await selected.arrayBuffer());
  if(ticket!==importEpoch)return;
  const report=await validateBrowserZip(bytes);
  if(ticket!==importEpoch)return;
  const draft=readValidatedStudioZip(bytes,report);
  if(ticket!==importEpoch)return;
  // Confirm only AFTER integrity validation and BEFORE replacing any source.
  // A native dialog can re-enter editor code: recheck the ticket and source.
  const previous=readDraft();
  if(hasUnsavedChanges()){
   if(!window.confirm('This verified ZIP will replace unsaved Studio source. Download your work first if needed. Continue?')){
    announceImport('ZIP import cancelled. Your current source and preview were kept.');
    return;
   }
   if(ticket!==importEpoch||!sameStudioSource(previous,readDraft()))return;
  }
  cancelPendingAction();
  stopPreview(); // import source only — never execute it without a new click
  for(const [name,value] of Object.entries(draft))fields[name].value=value;
  sourceBaseline={...draft};
  updateSaveNotice();
  showTab('html');
  announce('Imported previously validated App Studio source. Preview is stopped; click Run isolated preview to execute it.');
  announceImport('Imported '+draft.name+' · ZIP SHA-256: '+report.archiveSha256+
   '. No code executed, uploaded or saved to the cloud.');
  importedFile.value='';
  importCheck.disabled=true;
 }catch{
  if(ticket!==importEpoch)return;
  announceImport('Import rejected. Select a ZIP previously created by App Studio; arbitrary or malformed ZIPs will not load. Current editors remain unchanged.',true);
 }finally{
  if(ticket===importEpoch){
   importing=false;
   importCheck.disabled=!importedFile.files?.length;
  }
 }
});
function readDraft(){
 return Object.fromEntries(Object.entries(fields).map(([key,field])=>[key,field.value]));
}
function stopPreview(){
 ++epoch;
 frame.removeAttribute('srcdoc');
 frame.removeAttribute('src');
 frame.hidden=true;placeholder.hidden=false;
 stop.disabled=true;running=false;
}
function showTab(name){
 if(!['html','css','js'].includes(name))return;
 active=name;
 for(const btn of tabs)btn.setAttribute('aria-pressed',String(btn.dataset.lang===name));
 for(const lang of ['html','css','js']){
  $('studio-source-'+lang).hidden=lang!==name;
 }
}
for(const btn of tabs)btn.addEventListener('click',()=>{
 showTab(btn.dataset.lang);
 fields[btn.dataset.lang].focus({preventScroll:true});
});
function loadTemplate(template,label,initial=false){
 const previous=readDraft();
 if(!initial&&hasUnsavedChanges()&&!sameStudioSource(previous,template)&&
    !window.confirm('Replace your unsaved Studio source with this example? Download your ZIP first if needed.')){
  announce('Example change cancelled. Your current source and preview were kept.');
  return false;
 }
 cancelPendingImport();
 cancelPendingAction();
 stopPreview();
 for(const [key,value] of Object.entries(template))fields[key].value=value;
 sourceBaseline=template;
 updateSaveNotice();
 showTab('html');
 announce(label+' loaded. Nothing runs until you click Run isolated preview.');
 return true;
}
function restore(initial=false){return loadTemplate(STUDIO_STARTER,'Counter example',initial);}
$('studio-reset').addEventListener('click',restore);
$('studio-static').addEventListener('click',()=>loadTemplate(STUDIO_STATIC_STARTER,'Static HTML/CSS example'));
for(const element of Object.values(fields))element.addEventListener('input',()=>{
 updateSaveNotice();
 cancelPendingImport();
 cancelPendingAction();
 if(running)stopPreview();
 else epoch++;
 announce('Source changed. Validate and run again to see the new version.');
});
stop.addEventListener('click',()=>{
 stopPreview();
 announce('Preview stopped. No code is running in the iframe.');
});
async function prepare(){
 const draft=readDraft();
 const zip=buildStudioZip(draft);
 const report=await validateBrowserZip(zip);
 if(report.files.length!==1||report.files[0].path!=='index.html'||
    report.reviewRequired!==true||report.automaticHosting!==false)
  throw new TypeError('Studio ZIP check failed');
 return {zip,report,html:buildStudioHtml(draft),name:draft.name};
}
run.addEventListener('click',async()=>{
 const action=++actionEpoch;
 const ticket=++epoch;
 run.disabled=true;download.disabled=true;
 stopPreview(); // discard any previously running untrusted document
 const current=epoch;
 announce('Validating self-contained HTML, CSS, JavaScript and ZIP locally…');
 try{
  const ready=await prepare();
  if(current!==epoch||ticket+1!==epoch)return; // source or control changed
  frame.setAttribute('sandbox','allow-scripts'); // NEVER allow-same-origin.
  frame.setAttribute('referrerpolicy','no-referrer');
  frame.srcdoc=ready.html;
  frame.hidden=false;placeholder.hidden=true;running=true;
  stop.disabled=false;
  announce('Isolated preview running: '+ready.report.totalBytes+
   ' validated bytes. Nothing was uploaded or published.');
 }catch{
  if(current!==epoch)return;
  stopPreview();
  announce('Studio rejected this source. Use only self-contained static HTML, CSS and JavaScript with no remote/privileged APIs, external assets or embedded scripts in HTML.',true);
 }finally{finishAction(action);}
});
download.addEventListener('click',async()=>{
 const action=++actionEpoch;
 const ticket=++epoch;
 run.disabled=true;download.disabled=true;
 announce('Checking source package integrity and SHA-256 before download…');
 try{
  const ready=await prepare();
  if(ticket!==epoch)return;
  const blob=new Blob([ready.zip],{type:'application/zip'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  const slug=ready.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-')
   .replace(/^-+|-+$/g,'').slice(0,50)||'static-app';
  link.href=url;link.download=slug+'.zip';link.hidden=true;
  document.body.append(link);
  try{link.click();}finally{link.remove();URL.revokeObjectURL(url);}
  announce('Validated ZIP download requested: '+ready.report.files.length+
   ' file · '+ready.report.totalBytes+' expanded bytes · SHA-256: '+
   ready.report.archiveSha256+'. Confirm the download in your browser.');
 }catch{
  if(ticket!==epoch)return;
  announce('Export rejected. This source is not a valid static-only Library package.',true);
 }finally{finishAction(action);}
});
// Browser-native leave warning is best-effort: the browser chooses whether
// and how to show it. A ZIP download request does not disable the guard.
window.addEventListener('beforeunload',event=>{
 if(!hasUnsavedChanges())return;
 event.preventDefault();
 event.returnValue='';
});
restore(true);
