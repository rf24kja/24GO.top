// Pure, testable helpers for a static browser-only article draft experiment.
// No network calls, browser storage, account credentials or user analytics.
export const LOCALES = Object.freeze(['en','ru','th','es','fr','de','pt','zh']);
export const CATEGORIES = Object.freeze(['news','models','tools','guides']);

export function safeSourceUrl(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.href.length > 2000) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function validateDraft({ title, body, locale, category, source }) {
  if (typeof title !== 'string' || title.trim().length < 5 || title.length > 160) return 'Enter a title between 5 and 160 characters.';
  if (typeof body !== 'string' || body.trim().length < 20 || body.length > 12000) return 'Write between 20 and 12,000 characters.';
  if (!LOCALES.includes(locale)) return 'Choose a supported language.';
  if (!CATEGORIES.includes(category)) return 'Choose a supported category.';
  if (safeSourceUrl(source) === null) return 'Use a valid HTTP or HTTPS source link without credentials.';
  return '';
}

export function formatDraft(draft) {
  const error = validateDraft(draft);
  if (error) throw new TypeError(error);
  const result = [
    '# ' + draft.title.trim(),
    '',
    'Language: ' + draft.locale,
    'Category: ' + draft.category
  ];
  const safeSource = safeSourceUrl(draft.source);
  if (safeSource) result.push('Original source: ' + safeSource);
  result.push('',draft.body.trim(),'','---','Unpublished draft · Generated in the 24GOTOP static Draft Lab.');
  return result.join('\n');
}
