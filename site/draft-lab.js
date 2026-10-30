'use strict';

import { safeSourceUrl, validateDraft, formatDraft, draftFilename, hasDraftContent, hasUnexportedChanges, parseDraftFile, MAX_DRAFT_FILE_BYTES, formatDraftSelection, createDraftImportGate } from './draft-lab-logic.js';
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
function refreshInterface(){
  applyUiLanguage(document,uiLocale.value);
  // Changing interface language never modifies the author's own draft,
  // article language, selection, source, or reopened-file baseline.
  preview();
  message('');
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
  renderMarkdownPreview(field('previewBody'), body.value.trim() || ui('emptyBody'));
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
  control.addEventListener('input', () => { importGate.changed();message(''); preview(); });
  control.addEventListener('change', () => { importGate.changed();preview(); });
}


for(const [id,action] of [['formatHeading','heading'],['formatList','list'],
  ['formatQuote','quote'],['formatCode','code'],['formatLink','link']]){
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
  const invalid = validateDraft(currentDraft());
  if (!invalid) return true;
  const fieldKey=invalid.startsWith('Enter a title')?'invalidTitle':
    invalid.startsWith('Write between')?'invalidBody':
    invalid.startsWith('Choose a supported language')?'invalidLocale':
    invalid.startsWith('Choose a supported category')?'invalidCategory':'invalidSource';
  message(ui(fieldKey), true);
  if (title.value.trim().length < 5) title.focus();
  else if (body.value.trim().length < 20) body.focus();
  else source.focus();
  return false;
}


field('importDraft').addEventListener('click', () => {
  field('importDraftFile').click();
});

field('importDraftFile').addEventListener('change', async event => {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) return;
  const ticket=importGate.begin();
  try {
    if (!file.name.toLowerCase().endsWith('.md') || file.size > MAX_DRAFT_FILE_BYTES) {
      throw new TypeError('Unsupported file');
    }
    // Reading a user-selected local file does not make a network request.
    const reopened = parseDraftFile(await file.text());
    // A previous file or any newer typing/formatting/clear invalidates this result.
    // Do not disturb an active, more recent file selection or its status.
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
    importGate.changed();
    preview();
    message(ui('opened'));
  } catch {
    if (importGate.isLatest(ticket)) message(ui('openError'),true);
  } finally {
    // An outdated read must not clear the newer file picker's selection.
    if (importGate.isLatest(ticket)) input.value = '';
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
