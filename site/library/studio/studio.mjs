import {STUDIO_STARTER,buildStudioHtml,buildStudioZip} from './studio-core.mjs';
import {validateBrowserZip} from '../intake-core.mjs';

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
function announce(message,isError=false){
 status.textContent=message;
 status.dataset.error=String(isError);
}
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
function restore(){
 stopPreview();
 for(const [key,value] of Object.entries(STUDIO_STARTER))fields[key].value=value;
 showTab('html');
 announce('Starter project loaded. Nothing runs until you click Run isolated preview.');
}
$('studio-reset').addEventListener('click',restore);
for(const element of Object.values(fields))element.addEventListener('input',()=>{
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
 }finally{
  if(current===epoch){run.disabled=false;download.disabled=false;}
  else if(!run.disabled&&download.disabled)download.disabled=false;
  // A stale asynchronous validation must not leave controls permanently off.
  if(run.disabled){run.disabled=false;download.disabled=false;}
 }
});
download.addEventListener('click',async()=>{
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
 }finally{run.disabled=false;download.disabled=false;}
});
restore();
