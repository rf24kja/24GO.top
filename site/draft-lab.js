'use strict';

// Static UX research prototype. Deliberately no fetch, localStorage, cookies,
// analytics or background requests. Text never leaves this page.
const field = id => document.getElementById(id);
const title = field('postTitle');
const body = field('postBody');
const locale = field('postLocale');
const category = field('postCategory');
const source = field('postSource');
const status = field('formStatus');
const headings = {guides:'Guides',tools:'Tools',news:'News',models:'Models'};

function message(text, isError = false) {
  status.textContent = text;
  status.dataset.error = String(isError);
}

function readableSource(raw) {
  const value = raw.trim();
  if (!value) return '';
  try {
    const link = new URL(value);
    if (!['https:', 'http:'].includes(link.protocol) || link.username || link.password) return null;
    return link.href;
  } catch {
    return null;
  }
}

function preview() {
  // textContent prevents HTML, JS, or Markdown fragments being executed.
  field('previewHeading').textContent = title.value.trim() || 'Your title will appear here.';
  field('previewBody').textContent = body.value.trim() || 'Begin writing to see your article as plain text. Rich Markdown rendering and real publication are future features.';
  field('previewLocale').textContent = locale.value.toUpperCase();
  field('previewCategory').textContent = headings[category.value] || 'Guides';
  field('bodyCount').textContent = body.value.length.toLocaleString('en-US') + ' / 12,000';
  const link = readableSource(source.value);
  const node = field('previewSource');
  node.hidden = !link;
  node.textContent = link ? 'Source: ' + link : '';
}

function validate() {
  if (title.value.trim().length < 5) return 'Enter a title of at least 5 characters.';
  if (body.value.trim().length < 20) return 'Write at least 20 characters before copying.';
  if (readableSource(source.value) === null) return 'Use a valid HTTP or HTTPS source link without credentials.';
  return '';
}

function draftText() {
  const sourceValue = readableSource(source.value);
  return [
    '# ' + title.value.trim(),
    '',
    'Language: ' + locale.value,
    'Category: ' + category.value,
    sourceValue ? 'Original source: ' + sourceValue : '',
    '',
    body.value.trim(),
    '',
    '---',
    'Unpublished draft · Generated in the 24GOTOP static Draft Lab.'
  ].filter((line, index) => line !== '' || index !== 4).join('\n');
}

for (const control of [title,body,locale,category,source]) {
  control.addEventListener('input', () => {
    message('');
    preview();
  });
  control.addEventListener('change', preview);
}

field('copyDraft').addEventListener('click', async () => {
  const invalid = validate();
  if (invalid) {
    message(invalid, true);
    if (title.value.trim().length < 5) title.focus();
    else if (body.value.trim().length < 20) body.focus();
    else source.focus();
    return;
  }
  if (!navigator.clipboard?.writeText) {
    message('Clipboard permission is unavailable. You can still select and copy your text manually.', true);
    return;
  }
  try {
    await navigator.clipboard.writeText(draftText());
    message('Draft copied. It has not been published or saved.');
  } catch {
    message('Could not access your clipboard. Select and copy the text manually.', true);
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
