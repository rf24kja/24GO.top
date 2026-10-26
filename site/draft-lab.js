'use strict';

import { safeSourceUrl, validateDraft, formatDraft, draftFilename, hasDraftContent, hasUnexportedChanges, parseDraftFile, MAX_DRAFT_FILE_BYTES } from './draft-lab-logic.js';
import { renderMarkdownPreview } from './draft-lab-preview.js';

// Browser-only UX research prototype: no network, browser persistence or analytics.
const field = id => document.getElementById(id);
const title = field('postTitle');
const body = field('postBody');
const locale = field('postLocale');
const category = field('postCategory');
const source = field('postSource');
const status = field('formStatus');
const headings = { guides:'Guides', tools:'Tools', news:'News', models:'Models' };
// A file selected by the user provides an authoritative in-tab baseline only.
// Download requests and clipboard copy never silently change this baseline.
let reopenedFileBaseline = null;

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
    note.textContent = 'No draft content yet. Draft Lab never automatically saves your work.';
  } else if (hasUnexportedChanges(draft, reopenedFileBaseline)) {
    note.textContent = 'Changes in this tab are not automatically saved. Check your exported .md file before leaving.';
  } else {
    note.textContent = 'Reopened file is unchanged. Any new edits must be exported again.';
  }
}

function preview() {
  // textContent prevents user HTML or Markdown from executing.
  field('previewHeading').textContent = title.value.trim() || 'Your title will appear here.';
  renderMarkdownPreview(field('previewBody'), body.value.trim() || 'Begin writing to see your article preview.');
  field('previewLocale').textContent = locale.value.toUpperCase();
  field('previewCategory').textContent = headings[category.value] || 'Guides';
  field('bodyCount').textContent = body.value.length.toLocaleString('en-US') + ' / 12,000';
  const link = safeSourceUrl(source.value);
  const node = field('previewSource');
  node.hidden = !link;
  node.textContent = link ? 'Source: ' + link : '';
  updateSafetyNotice();
}

for (const control of [title,body,locale,category,source]) {
  control.addEventListener('input', () => { message(''); preview(); });
  control.addEventListener('change', preview);
}

function readyToExport() {
  const invalid = validateDraft(currentDraft());
  if (!invalid) return true;
  message(invalid, true);
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
  try {
    if (!file.name.toLowerCase().endsWith('.md') || file.size > MAX_DRAFT_FILE_BYTES) {
      throw new TypeError('Unsupported file');
    }
    // Reading a user-selected local file does not make a network request.
    const reopened = parseDraftFile(await file.text());
    if (hasDraftContent(currentDraft())
      && !window.confirm('Opening this file replaces your current unsaved draft. Download it first if needed. Continue?')) {
      message('Import cancelled. Your current draft was kept.');
      return;
    }
    title.value = reopened.title;
    body.value = reopened.body;
    locale.value = reopened.locale;
    category.value = reopened.category;
    source.value = reopened.source;
    reopenedFileBaseline = { ...reopened };
    preview();
    message('Markdown draft opened locally. Nothing was uploaded. Export again to keep changes.');
  } catch {
    message('Could not open this file. Choose a valid 24GOTOP Draft Lab .md export (64 KB maximum).', true);
  } finally {
    // Permit re-opening the same file after editing it.
    input.value = '';
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
  message('Download requested: ' + anchor.download + '. Nothing was published or uploaded.');
});

field('copyDraft').addEventListener('click', async () => {
  if (!readyToExport()) return;
  if (!navigator.clipboard?.writeText) {
    message('Clipboard unavailable. Select and copy your text manually.', true);
    return;
  }
  try {
    await navigator.clipboard.writeText(formatDraft(currentDraft()));
    message('Draft copied. It has not been published or saved.');
  } catch {
    message('Could not access the clipboard. Select and copy your text manually.', true);
  }
});

field('clearDraft').addEventListener('click', () => {
  if (hasDraftContent(currentDraft())
    && !window.confirm('This will discard the current draft in this tab. Download or copy it first if you want to keep it. Clear anyway?')) {
    message('Draft kept. Nothing was erased.');
    return;
  }
  title.value = '';
  body.value = '';
  source.value = '';
  locale.value = 'en';
  category.value = 'guides';
  reopenedFileBaseline = null;
  preview();
  message('Draft cleared from this browser tab.');
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
preview();
