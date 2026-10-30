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


/** Prepare a native textarea edit without rendering, saving or executing content. */
export function formatDraftSelection(value,start,end,action){
 if(typeof value!=='string'||value.length>12000||
    !Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
    start<0||end<start||end>value.length)throw new TypeError('Invalid article selection');
 const selected=value.slice(start,end);
 let replacement,innerOffset,content=selected;
 if(action==='link'){
   if(selected.length>200||/[\[\]\r\n]/.test(selected))
     throw new TypeError('Select up to 200 characters of a single line');
   content ||= 'documentation';
   const target='https://example.org';
   replacement='['+content+']('+target+')';
   innerOffset=content.length+3;
 }else if(action==='heading'){
   if(/[\r\n]/.test(selected))throw new TypeError('Single-line heading only');
   content ||= 'Section heading';replacement='## '+content;innerOffset=3;
 }else if(action==='list'||action==='quote'){
   content ||= action==='list'?'List item':'Quote';
   const prefix=action==='list'?'- ':'> ';
   replacement=content.split(/\r?\n/).map(line=>prefix+line).join('\n');
   innerOffset=prefix.length;
 }else if(action==='code'){
   content ||= '// your code';
   const runs=selected.match(/`+/g)||[];
   const fence='`'.repeat(Math.max(3,...runs.map(run=>run.length+1)));
   replacement=fence+'\n'+content+'\n'+fence;innerOffset=fence.length+1;
 }else throw new TypeError('Unsupported Markdown action');
 if(value.length-(end-start)+replacement.length>12000)
   throw new RangeError('Article exceeds 12,000 characters');
 if(action==='link'){
   const selectionStart=start+innerOffset;
   return {replacement,selectionStart,selectionEnd:selectionStart+'https://example.org'.length};
 }
 const selectionStart=start+(selected?replacement.length:innerOffset);
 return {replacement,selectionStart,selectionEnd:selectionStart+(selected?0:content.length)};
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


/**
 * Filename uses ASCII characters only to avoid paths, reserved characters,
 * or browser-specific filename normalization. Does not use the article body.
 */
export function draftFilename(draft) {
  const language = LOCALES.includes(draft?.locale) ? draft.locale : 'en';
  const title = typeof draft?.title === 'string' ? draft.title : '';
  const slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/g, '');
  return '24gotop-' + (slug || 'draft-' + language) + '.md';
}

/** Compare the current tab to the last explicitly reopened local file.
 * A download click/clipboard copy is never proof the browser saved a file.
 */
export function hasUnexportedChanges(draft, reopenedFile = null) {
  if (!hasDraftContent(draft)) return false;
  if (!reopenedFile) return true;
  return ['title', 'body', 'locale', 'category', 'source']
    .some(key => draft?.[key] !== reopenedFile?.[key]);
}

export function hasDraftContent(draft) {
  return Boolean(
    draft?.title?.trim() || draft?.body?.trim() || draft?.source?.trim()
  );
}


// A narrowly scoped import for files exported by Draft Lab. It deliberately
// refuses arbitrary Markdown and preserves the original body as plain text.
export const MAX_DRAFT_FILE_BYTES = 65536;
const EXPORT_FOOTER = '\n\n---\nUnpublished draft · Generated in the 24GOTOP static Draft Lab.';

export function parseDraftFile(text) {
  if (typeof text !== 'string' || text.length > MAX_DRAFT_FILE_BYTES) {
    throw new TypeError('Unsupported draft file');
  }
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\n$/, '');
  if (!normalized.endsWith(EXPORT_FOOTER)) {
    throw new TypeError('Not a 24GOTOP Draft Lab export');
  }
  const payload = normalized.slice(0, -EXPORT_FOOTER.length);
  const titleEnd = payload.indexOf('\n\n');
  if (titleEnd < 3 || !payload.startsWith('# ')) {
    throw new TypeError('Invalid draft title');
  }
  const title = payload.slice(2, titleEnd);
  const afterTitle = payload.slice(titleEnd + 2);
  const metadataEnd = afterTitle.indexOf('\n\n');
  if (metadataEnd < 0) throw new TypeError('Invalid draft metadata');
  const lines = afterTitle.slice(0, metadataEnd).split('\n');
  if (lines.length !== 2 && lines.length !== 3
      || !lines[0].startsWith('Language: ')
      || !lines[1].startsWith('Category: ')
      || lines.length === 3 && !lines[2].startsWith('Original source: ')) {
    throw new TypeError('Invalid draft metadata');
  }
  const draft = {
    title,
    locale: lines[0].slice('Language: '.length),
    category: lines[1].slice('Category: '.length),
    source: lines.length === 3 ? lines[2].slice('Original source: '.length) : '',
    body: afterTitle.slice(metadataEnd + 2)
  };
  const invalid = validateDraft(draft);
  if (invalid) throw new TypeError(invalid);
  return draft;
}


/**
 * In-memory, per-tab import race gate. A file read is asynchronous: while it
 * runs, the author can type, format, clear, or select a second file. Neither
 * an old read nor a read started before a newer editor change may replace text.
 * This is NOT a saved-draft baseline and never touches persistent storage.
 */
export function createDraftImportGate() {
  let editorVersion=0;
  let latestImport=0;
  return {
    changed(){editorVersion++;},
    begin(){return Object.freeze({importId:++latestImport,editorVersion});},
    isLatest(ticket){
      return Boolean(ticket && Number.isSafeInteger(ticket.importId) &&
        ticket.importId===latestImport);
    },
    canApply(ticket){
      return this.isLatest(ticket) &&
        ticket.editorVersion===editorVersion;
    }
  };
}
