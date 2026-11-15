import {validateBrowserZip,buildLibraryReviewIssue,LIMITS} from './intake-core.mjs';

const $=id=>document.getElementById(id);
const fileInput=$('library-zip'),check=$('library-validate');
const status=$('library-intake-status'),results=$('library-intake-results');
const copy=$('library-copy-report'),copyStatus=$('library-copy-status');
const fallback=$('library-copy-fallback'),fallbackLabel=$('library-copy-label');
const review=$('library-review-link'),reviewStatus=$('library-review-status');
const appName=$('library-app-name'),appSource=$('library-app-source');
let epoch=0,report=null,reportText='';

function announce(text,isError=false){
 status.textContent=text;status.dataset.error=String(isError);
}
function reviewLink(){
 review.hidden=true;
 review.removeAttribute('href');
 if(!report)return;
 try{
  const url=buildLibraryReviewIssue({
   name:appName.value,repository:appSource.value,report
  });
  review.href=url;
  review.hidden=false;
  reviewStatus.textContent='Ready: open GitHub to review the request, then submit it yourself. ZIP bytes are never included.';
 }catch{
  reviewStatus.textContent='Enter a title (3–70 characters) and a public HTTPS GitHub repository link.';
 }
}
function clearResult(){
 report=null;reportText='';
 results.hidden=true;
 $('library-intake-summary').textContent='';
 $('library-intake-files').replaceChildren();
 copyStatus.textContent='';
 fallback.hidden=true;fallbackLabel.hidden=true;fallback.value='';
 reviewLink();
}
function reset(){
 epoch++;
 fileInput.value='';
 check.disabled=true;
 clearResult();
 appName.value='';appSource.value='';
 announce('Choose a ZIP to check in this browser. No files are sent to 24GOTOP.');
 reviewStatus.textContent='Enter an application name and a public source repository to prepare a review link.';
}
fileInput.addEventListener('change',()=>{
 epoch++;
 clearResult();
 check.disabled=!fileInput.files?.length;
 announce(check.disabled?'Choose a ZIP to check in this browser.':'File selected. Choose Check local ZIP to validate on your device.');
});
$('library-intake-clear').addEventListener('click',reset);
check.addEventListener('click',async()=>{
 const selected=fileInput.files?.[0];
 if(!selected)return;
 const ticket=++epoch;
 clearResult();
 check.disabled=true;
 if(selected.size>LIMITS.archiveBytes||selected.size<22){
  announce('ZIP must be between 22 bytes and 4 MiB.',true);
  check.disabled=false;return;
 }
 announce('Checking ZIP structure and individual files locally…');
 try{
  const bytes=new Uint8Array(await selected.arrayBuffer());
  if(ticket!==epoch)return;
  const checked=await validateBrowserZip(bytes);
  if(ticket!==epoch)return;
  report=checked;
  reportText=JSON.stringify({
   status:'LOCAL SOURCE CHECK ONLY — NOT HOSTED OR APPROVED',
   ...checked
  },null,2);
  $('library-intake-summary').textContent=
   checked.files.length+' static files · '+checked.totalBytes+
   ' expanded bytes · ZIP SHA-256: '+checked.archiveSha256;
  const list=$('library-intake-files');
  for(const item of checked.files){
   const li=document.createElement('li');
   li.textContent=item.path+' · '+item.size+' bytes · SHA-256 '+item.sha256;
   list.append(li);
  }
  results.hidden=false;
  announce('Local ZIP check passed. Manual code review is still required; nothing was uploaded.');
  reviewLink();
 }catch{
  if(ticket!==epoch)return;
  clearResult();
  announce('Package rejected or unsupported. Check ZIP32 format, file limits, paths, assets and static-only rules. Use the local CLI for an independent report.',true);
 }finally{
  if(ticket===epoch)check.disabled=!fileInput.files?.length;
 }
});
copy.addEventListener('click',async()=>{
 if(!reportText)return;
 fallback.hidden=true;fallbackLabel.hidden=true;
 try{
  if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
  await navigator.clipboard.writeText(reportText);
  copyStatus.textContent='Report copied. It contains paths and hashes, not app source bytes.';
 }catch{
  fallback.value=reportText;
  fallbackLabel.hidden=false;fallback.hidden=false;
  fallback.focus();fallback.select();
  copyStatus.textContent='Clipboard unavailable. Select and copy the report manually.';
 }
});
appName.addEventListener('input',reviewLink);
appSource.addEventListener('input',reviewLink);
