'use strict';

import { safeSourceUrl, validateDraft, formatDraft, draftFilename, hasDraftContent, hasUnexportedChanges, readDraftFileStrict, formatDraftSelection, countDraftWords, createDraftImportGate, invalidDraftField } from './draft-lab-logic.js';
import { renderMarkdownPreview,renderPreviewOutline } from './draft-lab-preview.js';
import { applyUiLanguage,uiText } from './draft-lab-i18n.js';
import { buildArticleProposalUrl } from './draft-lab-proposal.js';
import {createDraftVault,MAX_SAVED_DRAFTS,MAX_VAULT_BACKUP_BYTES,VAULT_KEY} from './draft-lab-vault.js';

// Browser-only draft editor: no automatic network or analytics.
 // Browser persistence is optional, manual and never activated by typing.
// An explicit, confirmed outbound GitHub proposal link transfers only the headline.
const field = id => document.getElementById(id);
const title = field('postTitle');
const body = field('postBody');
const locale = field('postLocale');
const category = field('postCategory');
const source = field('postSource');
const status = field('formStatus');
const ui=key=>uiText(field('uiLocale').value,key);
const uiLocale=field('uiLocale');
// A static homepage may link into a translated EDITOR interface. Only an
// allowlisted UI locale is accepted; the article language/content and local
// export or reopen baseline are never inferred from query parameters.
const requestedUi=new URL(window.location?.href||'https://24go.top/draft-lab.html').searchParams.get('ui');
if(['en','ru','th','es','fr','de','pt','zh'].includes(requestedUi)){
  uiLocale.value=requestedUi;
}
function refreshInterface(){
  applyUiLanguage(document,uiLocale.value);
  const localHome=['ru','th','es','fr','de','pt','zh'].includes(uiLocale.value)
    ? './'+uiLocale.value+'/' : './';
  field('homeBrandLink').href=localHome;
  field('homeNavLink').href=localHome;
  // Changing interface language never modifies the author's own draft,
  // article language, selection, source, or reopened-file baseline.
  preview();
  updateValidationNotice();
  refreshBrowserDrafts();
}
uiLocale.addEventListener('change',refreshInterface);
// A file selected by the user provides an authoritative in-tab baseline only.
// Download requests and clipboard copy never silently change this baseline.
let reopenedFileBaseline = null;
const importGate=createDraftImportGate();
let activeSavedId=null,activeSavedVersion=null;
function getDraftVault(){return createDraftVault(window.localStorage);}
function resetSavedSlot(){activeSavedId=null;activeSavedVersion=null;}
function refreshBrowserDrafts(selectId=null){
 const picker=field('savedBrowserDraft');
 const previous=selectId??picker.value;
 picker.replaceChildren();
 const empty=document.createElement('option');
 empty.value='';empty.textContent=ui('vaultChoose');
 picker.append(empty);
 try{
  const rows=getDraftVault().list();
  for(const item of rows){
   const option=document.createElement('option');
   option.value=item.id;
   option.textContent=item.title+' · '+item.locale.toUpperCase();
   picker.append(option);
  }
  picker.value=rows.some(x=>x.id===previous)?previous:'';
  field('openBrowserDraft').disabled=!picker.value;
  field('deleteBrowserDraft').disabled=!picker.value;
  field('vaultCount').textContent=ui('vaultCount')+rows.length+'/'+MAX_SAVED_DRAFTS;
  field('exportDraftLibrary').disabled=!rows.length;
 }catch{
  field('openBrowserDraft').disabled=true;
  field('deleteBrowserDraft').disabled=true;
  field('vaultCount').textContent=ui('vaultUnavailable');
  field('exportDraftLibrary').disabled=true;
 }
}
function vaultError(error){
 const key=error?.message==='vault_conflict'?'vaultConflict':
   error?.message==='vault_full'?'vaultFull': 'vaultUnavailable';
 message(ui(key),true);
}


function currentDraft() {
  return { title:title.value, body:body.value, locale:locale.value,
    category:category.value, source:source.value };
}

const validatedFields=Object.freeze({title,body,locale,category,source});
const validationLabels=Object.freeze({title:'invalidTitle',body:'invalidBody',locale:'invalidLocale',category:'invalidCategory',source:'invalidSource'});
function clearFieldError(node){
  node.removeAttribute('aria-invalid');
  node.removeAttribute('aria-describedby');
}
function clearFieldErrors(){for(const node of Object.values(validatedFields))clearFieldError(node);}
function updateValidationNotice(){
  const failed=Object.keys(validatedFields).find(
    key=>validatedFields[key].getAttribute('aria-invalid')==='true');
  // Locale changes and unrelated field edits must not hide an active error.
  message(failed ? ui(validationLabels[failed]) : '',Boolean(failed));
}

function message(text, isError = false) {
  status.textContent = text;
  status.dataset.error = String(isError);
}

function updateSafetyNotice() {
  const note = field('draftSafety');
  const draft = currentDraft();
  if (!hasDraftContent(draft)) {
    note.textContent = ui('safetyEmpty');
  } else if (hasUnexportedChanges(draft, reopenedFileBaseline)) {
    note.textContent = ui('safetyDirty');
  } else {
    note.textContent = ui('safetySame');
  }
}

function preview() {
  // textContent prevents user HTML or Markdown from executing.
  field('previewHeading').textContent = title.value.trim() || ui('emptyTitle');
  // Pass author-owned Markdown exactly as typed: trimming here previously
  // removed leading code indentation even though .md export keeps it.
  renderMarkdownPreview(field('previewBody'), body.value.trim() ? body.value : ui('emptyBody'));
  field('articleOutlineSection').hidden=renderPreviewOutline(field('articleOutline'),body.value)===0;
  field('previewLocale').textContent = locale.value.toUpperCase();
  field('previewCategory').textContent = ui(['guides','tools','news','models'].includes(category.value)?category.value:'guides');
  field('bodyCount').textContent = body.value.length.toLocaleString('en-US') + ' / 12,000';
  field('bodyWordCount').textContent = ui('wordCount') +
    countDraftWords(body.value,locale.value).toLocaleString('en-US');
  const link = safeSourceUrl(source.value);
  const node = field('previewSource');
  node.hidden = !link;
  node.textContent = link ? ui('sourcePrefix') + link : '';
  updateSafetyNotice();
}

for (const control of [title,body,locale,category,source]) {
  control.addEventListener('input', () => { clearFieldError(control);importGate.changed();preview();updateValidationNotice(); });
  control.addEventListener('change', () => { clearFieldError(control);importGate.changed();preview();updateValidationNotice(); });
}


for(const [id,action] of [['formatBold','bold'],['formatItalic','italic'],
  ['formatInlineCode','inlineCode'],['formatHeading','heading'],['formatList','list'],['formatOrderedList','orderedList'],
  ['formatQuote','quote'],['formatCode','code'],['formatTable','table'],['formatLink','link']]){
 field(id).addEventListener('click',()=>{
  try{
   const edit=formatDraftSelection(body.value,body.selectionStart,body.selectionEnd,action);
   body.setRangeText(edit.replacement,body.selectionStart,body.selectionEnd,'end');
   importGate.changed();
   body.focus();
   body.setSelectionRange(edit.selectionStart,edit.selectionEnd);
   preview();
   message(ui('formatDone'));
  }catch(error){
   message(error instanceof RangeError
    ? ui('formatLimit')
    : ui('formatInvalid'),true);
  }
 });
}

function readyToExport() {
  clearFieldErrors();
  const invalid=invalidDraftField(currentDraft());
  if(!invalid)return true;
  const control=validatedFields[invalid];
  control.setAttribute('aria-invalid','true');
  control.setAttribute('aria-describedby','formStatus');
  message(ui(validationLabels[invalid]),true);
  control.focus();
  return false;
}


field('importDraft').addEventListener('click', () => {
  field('importDraftFile').click();
});

// Same race-safe, confirmation-gated import for the native picker and desktop
// drag-and-drop. Both stay on this device; neither path uploads data.
async function openLocalDraft(file,input=null) {
  if (!file) return;
  const ticket=importGate.begin();
  try {
    const reopened=await readDraftFileStrict(file);
    // A previous file or any newer typing/formatting/clear invalidates this result.
    if (!importGate.isLatest(ticket)) return;
    if (!importGate.canApply(ticket)) {
      message(ui('importInterrupted'),true);
      return;
    }
    if (hasDraftContent(currentDraft())
      && !window.confirm(ui('replaceConfirm'))) {
      message(ui('replaceCanceled'));
      return;
    }
    title.value = reopened.title;
    body.value = reopened.body;
    locale.value = reopened.locale;
    category.value = reopened.category;
    source.value = reopened.source;
    reopenedFileBaseline = { ...reopened };
    resetSavedSlot();
    clearFieldErrors();
    importGate.changed();
    preview();
    refreshBrowserDrafts();
    message(ui('opened'));
  } catch {
    if (importGate.isLatest(ticket)) message(ui('openError'),true);
  } finally {
    // An outdated read must not clear the newer native file picker.
    if (input && importGate.isLatest(ticket)) input.value = '';
  }
}
field('importDraftFile').addEventListener('change', event => {
  const input=event.currentTarget;
  return openLocalDraft(input.files?.[0],input);
});
const dropZone=field('draftDropZone');
const hasDraggedFile=event=>Array.from(event.dataTransfer?.types||[]).includes('Files');
for(const type of ['dragenter','dragover']){
  dropZone.addEventListener(type,event=>{
    if(!hasDraggedFile(event))return;
    event.preventDefault();
    dropZone.dataset.dragging='true';
    if(event.dataTransfer)event.dataTransfer.dropEffect='copy';
  });
}
dropZone.addEventListener('dragleave',event=>{
  if(!dropZone.contains(event.relatedTarget))delete dropZone.dataset.dragging;
});
dropZone.addEventListener('drop',event=>{
  if(!hasDraggedFile(event))return;
  event.preventDefault();
  delete dropZone.dataset.dragging;
  const files=event.dataTransfer?.files;
  if(!files||files.length!==1){
    message(ui('openError'),true);
    return;
  }
  return openLocalDraft(files[0]);
});


/*
 * A native file drop anywhere else on the page can navigate the browser to
 * that file and lose an in-memory draft. Keep the intended drop-zone import,
 * but cancel the browser's default file-navigation action everywhere.
 * Ordinary text/link drags remain untouched.
 */
const insideDropZone=target=>target===dropZone||
  Boolean(target&&dropZone.contains(target));
for(const type of ['dragover','drop']){
  document.addEventListener(type,event=>{
    if(!hasDraggedFile(event))return;
    event.preventDefault();
    if(insideDropZone(event.target))return;
    delete dropZone.dataset.dragging;
    if(type==='drop')message(ui('dropHint'));
  });
}

// Manual, unencrypted same-origin browser storage. Never autosave or sync.
field('saveBrowserDraft').addEventListener('click',()=>{
 if(!readyToExport())return;
 try{
  const storage=window.localStorage;
  if(storage.getItem(VAULT_KEY)===null &&
     !window.confirm(ui('vaultConsent')))return;
  const saved=createDraftVault(storage).save(currentDraft(),{
   id:activeSavedId,version:activeSavedVersion
  });
  activeSavedId=saved.id;activeSavedVersion=saved.version;
  reopenedFileBaseline={...saved.draft};
  refreshBrowserDrafts(saved.id);
  updateSafetyNotice();
  message(ui('vaultSaved'));
 }catch(error){vaultError(error);}
});
field('savedBrowserDraft').addEventListener('change',()=>refreshBrowserDrafts());
field('openBrowserDraft').addEventListener('click',()=>{
 const id=field('savedBrowserDraft').value;
 if(!id)return;
 if(hasDraftContent(currentDraft()) &&
    !window.confirm(ui('vaultReplace')))return;
 try{
  const saved=getDraftVault().load(id);
  title.value=saved.draft.title;
  body.value=saved.draft.body;
  locale.value=saved.draft.locale;
  category.value=saved.draft.category;
  source.value=saved.draft.source;
  activeSavedId=saved.id;activeSavedVersion=saved.version;
  reopenedFileBaseline={...saved.draft};
  clearFieldErrors();
  importGate.changed();
  preview();
  refreshBrowserDrafts(saved.id);
  message(ui('vaultOpened'));
 }catch(error){vaultError(error);}
});
field('deleteBrowserDraft').addEventListener('click',()=>{
 const id=field('savedBrowserDraft').value;
 if(!id||!window.confirm(ui('vaultDeleteConfirm')))return;
 try{
  const loaded=getDraftVault().load(id);
  getDraftVault().remove(id,{version:loaded.version});
  if(activeSavedId===id)resetSavedSlot();
  refreshBrowserDrafts();
  message(ui('vaultDeleted'));
 }catch(error){vaultError(error);}
});

// Another tab can update or remove the manually saved baseline without
// changing this tab's current text. Never treat that stale copy as safely
// persisted: warn on navigation and let the author save it as a new draft.
// Storage notifications are read-only; no automatic save or network traffic.
window.addEventListener('storage',event=>{
  if(event.key!==VAULT_KEY && event.key!==null)return;
  try{
    if(event.storageArea && event.storageArea!==window.localStorage)return;
  }catch{/* Storage access may be revoked; conservatively verify below. */}
  let baselineChanged=false;
  if(activeSavedId){
    try{
      baselineChanged=getDraftVault().load(activeSavedId).version!==activeSavedVersion;
    }catch{baselineChanged=true;}
  }
  refreshBrowserDrafts();
  if(baselineChanged){
    reopenedFileBaseline=null;
    resetSavedSlot(); // future explicit saves create a copy, never overwrite
    updateSafetyNotice();
    message(ui('vaultConflict'),true);
  }
});

// Explicit, offline library transfer. The backup JSON is unencrypted;
// never submit file contents to the server or replace the active editor.
// Restores are deliberately all-or-nothing and require an empty library.
field('exportDraftLibrary').addEventListener('click',()=>{
 if(!window.confirm(ui('backupExportConfirm')))return;
 try{
  const backup=getDraftVault().exportBackup();
  const blob=new Blob([backup],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download='24gotop-drafts-backup.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
  message(ui('backupExported'));
 }catch{
  message(ui('backupInvalid'),true);
 }
});
field('restoreDraftLibrary').addEventListener('click',()=>{
 field('draftLibraryFile').click();
});
field('draftLibraryFile').addEventListener('change',async event=>{
 const input=event.currentTarget,file=input.files?.[0];
 if(!file)return;
 try{
  if(!/\.json$/i.test(file.name)||!Number.isSafeInteger(file.size)||
    file.size<10||file.size>MAX_VAULT_BACKUP_BYTES)
   throw new TypeError('Invalid backup file');
  const buffer=await file.arrayBuffer();
  if(buffer.byteLength!==file.size||buffer.byteLength>MAX_VAULT_BACKUP_BYTES)
   throw new TypeError('Invalid backup size');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);
  if(!window.confirm(ui('backupRestoreConfirm')))return;
  const restored=getDraftVault().restoreBackup(text);
  refreshBrowserDrafts();
  message(ui('backupRestored')+' ('+restored+')');
 }catch(error){
  message(ui(error?.message==='vault_conflict'?'backupConflict':'backupInvalid'),true);
 }finally{
  input.value='';
 }
});

field('downloadDraft').addEventListener('click', () => {
  if (!readyToExport()) return;
  // Only the direct click initiates a local browser download. No upload or API.
  const draft = currentDraft();
  const blob = new Blob([formatDraft(draft)], { type:'text/markdown;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = draftFilename(draft);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // The browser may still be using the Blob immediately after the click.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  message(ui('downloadStarted') + anchor.download + ui('downloadSuffix'));
});

// On this local editor only, Ctrl/Cmd+S explicitly downloads the Markdown
// export. Do not intercept other browser shortcuts, and never imply autosave.
document.addEventListener('keydown',event=>{
  if(event.key?.toLowerCase()!=='s'||event.repeat||
     event.altKey||event.shiftKey||(!event.ctrlKey&&!event.metaKey))return;
  event.preventDefault();
  field('downloadDraft').click();
});

// The author explicitly decides whether the headline may become public.
// Never transfer article text, sources, the local file or browser tokens.
field('proposeDraft').addEventListener('click',event=>{
  const url=buildArticleProposalUrl(currentDraft());
  if(!url){
    event.preventDefault();
    message(ui('proposalInvalid'),true);
    title.focus();
    return;
  }
  if(!window.confirm(ui('proposalConfirm'))){
    event.preventDefault();
    message(ui('proposalCanceled'));
    return;
  }
  event.currentTarget.href=url;
  message(ui('proposalOpened'));
});

field('copyDraft').addEventListener('click', async () => {
  if (!readyToExport()) return;
  if (!navigator.clipboard?.writeText) {
    message(ui('copyUnavailable'),true);
    return;
  }
  try {
    await navigator.clipboard.writeText(formatDraft(currentDraft()));
    message(ui('copied'));
  } catch {
    message(ui('copyError'),true);
  }
});

field('clearDraft').addEventListener('click', () => {
  if (hasDraftContent(currentDraft())
    && !window.confirm(ui('clearConfirm'))) {
    message(ui('clearCanceled'));
    return;
  }
  title.value = '';
  body.value = '';
  source.value = '';
  locale.value = 'en';
  category.value = 'guides';
  reopenedFileBaseline = null;
  resetSavedSlot();
  clearFieldErrors();
  importGate.changed();
  preview();
  refreshBrowserDrafts();
  message(ui('cleared'));
  title.focus();
});

// Browsers decide whether to show their generic unload confirmation.
 // Never suppress the guard just because a download was requested.
window.addEventListener('beforeunload', event => {
  if (!hasUnexportedChanges(currentDraft(), reopenedFileBaseline)) return;
  event.preventDefault();
  event.returnValue = '';
});

field('draftForm').addEventListener('submit', event => event.preventDefault());
refreshInterface();
