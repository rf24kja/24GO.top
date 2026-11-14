import {safePreviewImageUrl} from './draft-lab-preview.js';
// Pure, testable helpers for a static browser-only article draft experiment.
// No network calls, browser storage, account credentials or user analytics.
export const LOCALES = Object.freeze(['en','ru','th','es','fr','de','pt','zh']);
export const CATEGORIES = Object.freeze(['news','models','tools','guides']);

// TextEncoder/Blob silently substitutes U+FFFD for lone UTF-16 surrogate
// code units. Refuse a damaged manuscript instead of claiming a lossless
// local Markdown export, review package or manual browser-vault save.
const hasUnpairedSurrogate=value=>
 /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);

/** Approximate private-on-device word count, with Thai/CJK segmentation. */
export function countDraftWords(value,language='en'){
 if(typeof value!=='string')throw new TypeError('Article text must be a string');
 if(value.length>12000)throw new RangeError('Article exceeds 12,000 characters');
 if(!value.trim())return 0;
 const locale=LOCALES.includes(language)?language:'en';
 if(typeof Intl.Segmenter==='function'){
  let count=0;
  for(const word of new Intl.Segmenter(locale,{granularity:'word'}).segment(value)){
   if(word.isWordLike)count++;
  }
  return count;
 }
 // Older browsers: less accurate for Thai and Chinese; only a display hint.
 return (value.match(/[\p{L}\p{N}]+/gu)||[]).length;
}

export function safeSourceUrl(input) {
  if (typeof input !== 'string' || input.length > 2000) return null;
  // WHATWG URL parsing strips C0 controls and surrounding whitespace:
  // never turn an invalid author citation into a different valid link.
  // WHATWG parsing silently normalizes backslashes to path separators.
  // Reject ambiguous raw citations instead of changing the author's URL.
  if (/[\u0000-\u001f\u007f\\]/u.test(input) || hasUnpairedSurrogate(input)) return null;
  const value = input.trim();
  if (!value) return '';
  if (value !== input) return null;
  try {
    const url = new URL(value);
    if (!['http:','https:'].includes(url.protocol) || !url.hostname ||
        url.username || url.password || url.href.length > 2000) return null;
    return url.href;
  } catch {
    return null;
  }
}


/** Prepare a native textarea edit without rendering, saving or executing content. */
export function formatDraftSelection(value,start,end,action,sourceUrl=''){
 if(typeof value!=='string'||value.length>12000||
    !Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
    start<0||end<start||end>value.length)throw new TypeError('Invalid article selection');
 const selected=value.slice(start,end);
 let replacement,innerOffset,content=selected;
 if(['bold','italic','inlineCode'].includes(action)){
   if(/[\r\n]/.test(selected) ||
      (action==='inlineCode'?selected.includes('`'):selected.includes('*')))
     throw new TypeError('Inline formatting requires plain single-line text');
   const marker=action==='bold'?'**':action==='italic'?'*':'`';
   content ||= action==='bold'?'bold text':action==='italic'?'italic text':'inline code';
   replacement=marker+content+marker;
   innerOffset=marker.length;
 }else if(action==='link'){
   if(selected.length>200||/[\[\]\r\n]/.test(selected))
     throw new TypeError('Select up to 200 characters of a single line');
   content ||= 'documentation';
   // Prefer the explicitly entered Original source, never an unvalidated
   // link from selection text. The old editable example remains when blank.
   const validated=sourceUrl===''?'':safeSourceUrl(sourceUrl);
   if(validated===null)throw new TypeError('Invalid original source URL');
   const target=validated
     ? validated.replace(/\(/g,'%28').replace(/\)/g,'%29')
     : 'https://example.org';
   // Preview renders only bounded, balanced inline citations.
   if(target.length>1500)throw new TypeError('Citation URL exceeds preview limit');
   replacement='['+content+']('+target+')';
   innerOffset=content.length+3;
 }else if(action==='heading'){
   if(/[\r\n]/.test(selected))throw new TypeError('Single-line heading only');
   content ||= 'Section heading';replacement='## '+content;innerOffset=3;
 }else if(action==='list'||action==='orderedList'||action==='quote'){
   content ||= action==='quote'?'Quote':'List item';
   const prefix=action==='quote'?'> ':action==='list'?'- ':'1. ';
   replacement=content.split(/\r?\n/).map((line,index)=>
    action==='orderedList'?(index+1)+'. '+line:prefix+line).join('\n');
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
   if(sourceUrl!==''){
     // A real source URL should not be selected for accidental overwrite.
     // For an empty selection, highlight the editable label instead.
     const at=start+(selected?replacement.length:1);
     return {replacement,selectionStart:at,selectionEnd:at+(selected?0:content.length)};
   }
   const selectionStart=start+innerOffset;
   return {replacement,selectionStart,selectionEnd:selectionStart+'https://example.org'.length};
 }
 const selectionStart=start+(selected?replacement.length:innerOffset);
 return {replacement,selectionStart,selectionEnd:selectionStart+(selected?0:content.length)};
}

/**
 * Insert a real author-selected Markdown image reference at the current
 * textarea range, without loading external media or changing draft storage.
 * Uses the exact preview host allowlist; invalid URLs and invalid/empty alt
 * text never change the manuscript. Native setRangeText preserves undo.
 */
export function formatDraftImageSelection(value,start,end,imageUrl,alternative=''){
 if(typeof value!=='string'||value.length>12000||
    !Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
    start<0||end<start||end>value.length)
  throw new TypeError('Invalid article selection');
 const selected=value.slice(start,end);
 const alt=(selected||alternative);
 if(typeof alt!=='string'||!alt.trim()||alt.length>160||
    /[\[\]\\\r\n\u0000-\u001f\u007f]/u.test(alt))
  throw new TypeError('Use a single-line descriptive image alt text');
 const safe=safePreviewImageUrl(imageUrl);
 if(!safe)throw new TypeError('Only public HTTPS image URLs are accepted');
 // Parentheses must be percent-encoded because the restricted preview parser
 // intentionally permits only bounded, balanced Markdown links.
 const target=safe.replace(/\(/g,'%28').replace(/\)/g,'%29');
 if(target.length>1500||/[<>\s()\\]/.test(target))
  throw new TypeError('Image URL cannot be previewed safely');
 const replacement='!['+alt.trim()+']('+target+')';
 if(value.length-(end-start)+replacement.length>12000)
  throw new RangeError('Article exceeds 12,000 characters');
 return Object.freeze({replacement,selectionStart:start+replacement.length,
  selectionEnd:start+replacement.length});
}

const DRAFT_ERRORS=Object.freeze({
 title:'Enter a title between 5 and 160 characters.',
 body:'Write between 20 and 12,000 characters.',
 locale:'Choose a supported language.',
 category:'Choose a supported category.',
 source:'Use a valid HTTP or HTTPS source link without credentials.'
});

/** A stable validation field identity, not a language-dependent error string. */
// A public proposal is allowed to contain just a headline. Keep its
// lossless title rules identical to .md export, local saves and review packs.
export function validDraftTitle(title){
 return typeof title==='string' && title.trim().length>=5 &&
   title.length<=160 && !/[\u0000-\u001f\u007f\u2028\u2029]/u.test(title) &&
   !hasUnpairedSurrogate(title);
}
export function invalidDraftField({title,body,locale,category,source}){
 if(!validDraftTitle(title))return 'title';
 if(typeof body!=='string'||body.trim().length<20||body.length>12000||
    hasUnpairedSurrogate(body))return 'body';
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

/** Strict equality for an async export begun with a validated snapshot.
 * Unlike hasUnexportedChanges(), clearing every field MUST count as changed:
 * that helper intentionally treats an empty editor as safe for unload.
 */
export function matchesDraftExportSnapshot(expected,current){
 const fields=['title','body','locale','category','source'];
 return Boolean(expected&&current&&fields.every(key=>
   typeof expected[key]==='string'&&current[key]===expected[key]));
}

/** Find an exact, case-sensitive literal string in a local manuscript.
 * Returns UTF-16 textarea selection offsets; no replacements or side effects.
 * A match wraps to the other end when the cursor has passed it.
 */
export function findDraftText(body,query,from=0,direction='next'){
 if(typeof body!=='string'||body.length>12000||
    typeof query!=='string'||query.length===0||query.length>80||
    !Number.isSafeInteger(from)||from<0||from>body.length||
    !['next','previous'].includes(direction))
  throw new TypeError('Invalid local manuscript search');
 let start;
 if(direction==='next'){
  start=body.indexOf(query,from);
  if(start===-1)start=body.indexOf(query,0);
 }else{
  start=from>0?body.lastIndexOf(query,from-1):-1;
  if(start===-1)start=body.lastIndexOf(query);
 }
 if(start===-1)return null;
 return Object.freeze({start,end:start+query.length});
}

/** Replace precisely one already selected literal match, never replace-all.
 * Caller must apply this with setRangeText to preserve native textarea undo.
 * The pure guard refuses stale/moved selections and output over the 12k cap.
 */
export function replaceDraftFindMatch(body,query,replacement,start,end){
 if(typeof body!=='string'||body.length>12000||
    typeof query!=='string'||query.length===0||query.length>80||
    typeof replacement!=='string'||replacement.length>160||
    !Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
    start<0||end>body.length||end<start)
  throw new TypeError('Invalid manuscript replacement');
 if(end-start!==query.length||body.slice(start,end)!==query)return null;
 if(body.length-query.length+replacement.length>12000)
  throw new RangeError('Manuscript length limit');
 return Object.freeze({replacement,selectionStart:start+replacement.length,
  selectionEnd:start+replacement.length});
}

/** Plan an explicit local replace-all, without writing or persisting anything.
 * Counts non-overlapping, exact case-sensitive UTF-16 matches. Validate the
 * final length BEFORE constructing a potentially expanded manuscript.
 */
export function replaceAllDraftMatches(body,query,replacement){
 if(typeof body!=='string'||body.length>12000||
    typeof query!=='string'||!query.trim()||query.length>80||
    typeof replacement!=='string'||replacement.length>160)
  throw new TypeError('Invalid bulk manuscript replacement');
 let count=0,position=0,index;
 while((index=body.indexOf(query,position))!==-1){
  count++;
  position=index+query.length;
 }
 if(count===0||query===replacement)return null;
 if(body.length+count*(replacement.length-query.length)>12000)
  throw new RangeError('Manuscript length limit');
 return Object.freeze({body:body.split(query).join(replacement),count});
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


/**
 * Explicit import of a regular Markdown file from another editor. This does
 * NOT parse or overwrite an exported 24GOTOP draft: the insertion changes
 * only the in-tab article textarea, never title/metadata, vault or a server.
 */
export const MAX_EXTERNAL_MARKDOWN_BYTES=16384;
export async function readExternalMarkdownStrict(file){
 if(!file||typeof file!=='object'||typeof file.name!=='string'||
    !/\.md$/i.test(file.name)||file.name.length>255||
    /[\\/\u0000-\u001f\u007f]/.test(file.name)||
    !Number.isSafeInteger(file.size)||file.size<1||
    file.size>MAX_EXTERNAL_MARKDOWN_BYTES||
    typeof file.arrayBuffer!=='function')
  throw new TypeError('Invalid external Markdown file');
 let bytes;
 try{bytes=await file.arrayBuffer();}
 catch{throw new TypeError('Could not read selected Markdown file');}
 if(Object.prototype.toString.call(bytes)!=='[object ArrayBuffer]'||
    bytes.byteLength!==file.size||bytes.byteLength>MAX_EXTERNAL_MARKDOWN_BYTES)
  throw new TypeError('Invalid Markdown bytes');
 let content;
 try{content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
 catch{throw new TypeError('Invalid Markdown UTF-8');}
 content=content.replace(/^\uFEFF/,'');
 if(!content.trim()||content.length>12000||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content)||
    content.endsWith('\n\n---\nUnpublished draft · Generated in the 24GOTOP static Draft Lab.'))
  throw new TypeError('Unsupported Markdown document');
 return content;
}

/**
 * Insert an external Markdown document *after* the current selection. Never
 * delete selected manuscript text; native setRangeText makes insertion undoable.
 * Add paragraph breaks at non-line-boundary insertion points. All limits apply
 * to the resulting body, not only to the inserted file.
 */
export function formatExternalMarkdownInsertion(body,start,end,external){
 if(typeof body!=='string'||body.length>12000||
    !Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
    start<0||end<start||end>body.length||
    typeof external!=='string'||!external.trim()||external.length>12000||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(external))
  throw new TypeError('Invalid Markdown insertion');
 const at=end;
 const prefix=at>0?(body[at-1]==='\n'?'\n':'\n\n'):'';
 const suffix=at<body.length?(body[at]==='\n'?'\n':'\n\n'):'';
 const replacement=prefix+external+suffix;
 if(body.length+replacement.length>12000)
  throw new RangeError('Article exceeds 12,000 characters');
 return Object.freeze({replacement,start:at,end:at,
  selectionStart:at+replacement.length,selectionEnd:at+replacement.length});
}
