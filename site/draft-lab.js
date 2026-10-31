'use strict';

import { safeSourceUrl, validateDraft, formatDraft, draftFilename, hasDraftContent, hasUnexportedChanges, readDraftFileStrict, formatDraftSelection, createDraftImportGate, invalidDraftField } from './draft-lab-logic.js';
import { renderMarkdownPreview,renderPreviewOutline } from './draft-lab-preview.js';
import { applyUiLanguage,uiText } from './draft-lab-i18n.js';

// Browser-only UX research prototype: no network, browser persistence or analytics.
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
}
uiLocale.addEventListener('change',refreshInterface);
// A file selected by the user provides an authoritative in-tab baseline only.
// Download requests and clipboard copy never silently change this baseline.
let reopenedFileBaseline = null;
const importGate=createDraftImportGate();

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


for(const [id,action] of [['formatHeading','heading'],['formatList','list'],
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
    clearFieldErrors();
    importGate.changed();
    preview();
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
  clearFieldErrors();
  importGate.changed();
  preview();
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
