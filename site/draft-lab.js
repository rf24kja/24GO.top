'use strict';

import { safeSourceUrl, validateDraft, formatDraft } from './draft-lab-logic.js';

// Browser-only UX research prototype: no network, browser persistence or analytics.
const field = id => document.getElementById(id);
const title = field('postTitle');
const body = field('postBody');
const locale = field('postLocale');
const category = field('postCategory');
const source = field('postSource');
const status = field('formStatus');
const headings = { guides:'Guides', tools:'Tools', news:'News', models:'Models' };

function currentDraft() {
  return { title:title.value, body:body.value, locale:locale.value,
    category:category.value, source:source.value };
}

function message(text, isError = false) {
  status.textContent = text;
  status.dataset.error = String(isError);
}

function preview() {
  // textContent prevents user HTML or Markdown from executing.
  field('previewHeading').textContent = title.value.trim() || 'Your title will appear here.';
  field('previewBody').textContent = body.value.trim() || 'Begin writing to see your article as plain text. Rich Markdown rendering and real publication are future features.';
  field('previewLocale').textContent = locale.value.toUpperCase();
  field('previewCategory').textContent = headings[category.value] || 'Guides';
  field('bodyCount').textContent = body.value.length.toLocaleString('en-US') + ' / 12,000';
  const link = safeSourceUrl(source.value);
  const node = field('previewSource');
  node.hidden = !link;
  node.textContent = link ? 'Source: ' + link : '';
}

for (const control of [title,body,locale,category,source]) {
  control.addEventListener('input', () => { message(''); preview(); });
  control.addEventListener('change', preview);
}

field('copyDraft').addEventListener('click', async () => {
  const invalid = validateDraft(currentDraft());
  if (invalid) {
    message(invalid, true);
    if (title.value.trim().length < 5) title.focus();
    else if (body.value.trim().length < 20) body.focus();
    else source.focus();
    return;
  }
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
  title.value = '';
  body.value = '';
  source.value = '';
  locale.value = 'en';
  category.value = 'guides';
  preview();
  message('Draft cleared from this browser tab.');
  title.focus();
});

field('draftForm').addEventListener('submit', event => event.preventDefault());
preview();
