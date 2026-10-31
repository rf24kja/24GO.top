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
 }else if(action==='table'){
   if(selected.length>120||/[\r\n|]/.test(selected))
     throw new TypeError('Table header must be a single line without pipes');
   content=selected||'Column';
   // A table is a block. Separate it from surrounding prose even when
   // the cursor is in the middle of a paragraph, without dropping text.
   const before=start>0 && value[start-1]!=='\n'?'\n\n':'';
   const after=end<value.length && value[end]!=='\n'?'\n\n':'';
   replacement=before+'| '+content+' | Value |\n| --- | --- |\n| Example | 123 |'+after;
   innerOffset=before.length+2;
 }else if(action==='code'){
   content ||= '// your code';
   const runs=selected.match(/`+/g)||[];
   const fence='`'.repeat(Math.max(3,...runs.map(run=>run.length+1)));
   replacement=fence+'\n'+content+'\n'+fence;innerOffset=fence.length+1;
 }else throw new TypeError('Unsupported Markdown action');
 if(value.length-(end-start)+replacement.length>12000)
   throw new RangeError('Article exceeds 12,000 characters');
 if(action==='table'){
   const selectionStart=start+innerOffset;
   return {replacement,selectionStart,selectionEnd:selectionStart+content.length};
 }
 if(action==='link'){
   const selectionStart=start+innerOffset;
   return {replacement,selectionStart,selectionEnd:selectionStart+'https://example.org'.length};
 }
 const selectionStart=start+(selected?replacement.length:innerOffset);
 return {replacement,selectionStart,selectionEnd:selectionStart+(selected?0:content.length)};
}

const DRAFT_ERRORS=Object.freeze({
 title:'Enter a title between 5 and 160 characters.',
 body:'Write between 20 and 12,000 characters.',
 locale:'Choose a supported language.',
 category:'Choose a supported category.',
 source:'Use a valid HTTP or HTTPS source link without credentials.'
});

/** A stable validation field identity, not a language-dependent error string. */
export function invalidDraftField({title,body,locale,category,source}){
 if(typeof title!=='string'||title.trim().length<5||title.length>160)return 'title';
 if(typeof body!=='string'||body.trim().length<20||body.length>12000)return 'body';
 if(!LOCALES.includes(locale))return 'locale';
 if(!CATEGORIES.includes(category))return 'category';
 if(safeSourceUrl(source)===null)return 'source';
 return null;
}
export function validateDraft(draft){
 const key=invalidDraftField(draft);
 return key===null?'':DRAFT_ERRORS[key];
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
  // The article body is author-owned source: do not trim leading indentation,
  // deliberate blank lines, or trailing whitespace. The footer delimiter is
  // stripped separately by parseDraftFile, so round-trips remain lossless.
  result.push('',draft.body,'','---','Unpublished draft · Generated in the 24GOTOP static Draft Lab.');
  return result.join('\n');
}


/**
 * ASCII-only, bounded filenames for user-selected on-device downloads.
 * Unicode headings (and distinct titles that slugify identically) must not
 * collapse to the same generic filename. The 64-bit FNV-1a digest is just a
 * stable local disambiguator of locale + title, NOT a cryptographic proof.
 * It includes no article body, browser identity, timestamp or remote state.
 * Revisions with the same title still share the proposed filename; browsers
 * control collision handling and the author must verify each actual save.
 */
export function draftFilename(draft) {
  const language = LOCALES.includes(draft?.locale) ? draft.locale : 'en';
  const title = typeof draft?.title === 'string' ? draft.title.trim() : '';
  const slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 28).replace(/-+$/g, '');
  const bytes = new TextEncoder().encode(language + ':' + title.normalize('NFC'));
  let hash = 0xcbf29ce484222325n;
  for (const byte of bytes) {
    hash = ((hash ^ BigInt(byte)) * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return '24gotop-' + (slug || 'draft') + '-' + language + '-' +
    hash.toString(16).padStart(16, '0') + '.md';
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


/**
 * Read a user-selected Draft Lab export without sending it anywhere.
 * Blob.text() replaces invalid UTF-8 byte sequences; that would silently
 * corrupt code, citations and original-language text. Decode fatally.
 * The caller must still check createDraftImportGate after the await.
 */
export async function readDraftFileStrict(file){
 if(!file||typeof file!=='object'||typeof file.name!=='string'||
    !/\.md$/i.test(file.name)||file.name.length>255||
    /[\\/\u0000-\u001f\u007f]/.test(file.name)||
    !Number.isSafeInteger(file.size)||file.size<0||
    file.size>MAX_DRAFT_FILE_BYTES||typeof file.arrayBuffer!=='function')
  throw new TypeError('Unsupported draft file');
 let bytes;
 try{bytes=await file.arrayBuffer();}
 catch{throw new TypeError('Could not read draft file');}
 // Native File.arrayBuffer() always returns exactly the selected bytes.
 // Do not trust spoofed/malformed File-like results.
 if(Object.prototype.toString.call(bytes)!=='[object ArrayBuffer]'||
    bytes.byteLength!==file.size||bytes.byteLength>MAX_DRAFT_FILE_BYTES)
  throw new TypeError('Invalid draft file length');
 let content;
 try{content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
 catch{throw new TypeError('Draft file is not valid UTF-8');}
 return parseDraftFile(content);
}
