/**
 * 24GOTOP Draft Lab: bounded, offline comparison of two author-owned drafts.
 * Not a hosted revision store, moderation action, autosave or server sync.
 */
export const REVISION_FIELDS=Object.freeze(['title','locale','category','source']);
const MAX_BODY=12000,MAX_LINES=320,MAX_VISIBLE=180;

function checkDraft(draft){
 if(!draft||typeof draft!=='object')throw new TypeError('Invalid draft snapshot');
 const clone={};
 for(const field of [...REVISION_FIELDS,'body']){
  if(typeof draft[field]!=='string')throw new TypeError('Invalid draft field');
  const limit=field==='body'?MAX_BODY:field==='title'?160:field==='source'?2048:30;
  if(draft[field].length>limit)throw new RangeError('Draft exceeds revision comparison bounds');
  clone[field]=draft[field];
 }
 return clone;
}
export function captureDraftRevision(draft){
 return Object.freeze(checkDraft(draft)); // Snapshot is immutable and never persisted.
}

/** Stable line-based LCS. Guarded to <=320 lines per revision (at most 103k cells). */
function lineDiff(before,after){
 const old=before.split('\n'),fresh=after.split('\n');
 if(old.length>MAX_LINES||fresh.length>MAX_LINES){
  return {entries:[],truncated:true,added:null,removed:null};
 }
 const width=fresh.length+1;
 const dp=new Uint16Array((old.length+1)*width);
 for(let i=old.length-1;i>=0;i--){
  for(let j=fresh.length-1;j>=0;j--){
   const pos=i*width+j;
   dp[pos]=old[i]===fresh[j]?1+dp[(i+1)*width+j+1]:
    Math.max(dp[(i+1)*width+j],dp[i*width+j+1]);
  }
 }
 const entries=[];
 let i=0,j=0,added=0,removed=0;
 while(i<old.length||j<fresh.length){
  if(i<old.length&&j<fresh.length&&old[i]===fresh[j]){
   entries.push({kind:'same',text:old[i]});i++;j++;continue;
  }
  if(j<fresh.length&&(i===old.length||
      dp[i*width+j+1]>=dp[(i+1)*width+j])){
   entries.push({kind:'added',text:fresh[j++]});added++;
  }else{entries.push({kind:'removed',text:old[i++]});removed++;}
 }
 return {entries:entries.slice(0,MAX_VISIBLE),truncated:entries.length>MAX_VISIBLE,
  added,removed};
}
/**
 * Explicit checkpoint-to-current comparison. Metadata and body are compared
 * byte-for-byte at JS string level; nothing is rewritten or normalized.
 */
export function compareDraftRevisions(baseline,current){
 const old=checkDraft(baseline),fresh=checkDraft(current);
 const changedFields=REVISION_FIELDS.filter(field=>old[field]!==fresh[field]);
 if(old.body===fresh.body)return {
  changedFields,bodyChanged:false,added:0,removed:0,truncated:false,entries:[],
  changed:changedFields.length>0
 };
 const diff=lineDiff(old.body,fresh.body);
 return {
  changedFields,bodyChanged:true,...diff,changed:true
 };
}
/** Deliberately omit draft text, title, sources, tokens and URLs. */
export function revisionSummary(diff){
 if(!diff||typeof diff!=='object'||!Array.isArray(diff.changedFields)||
   typeof diff.changed!=='boolean')throw new TypeError('Invalid revision analysis');
 return [
  '24GOTOP Draft Lab — local revision review (not published)',
  'Changed fields: '+(diff.changedFields.length?diff.changedFields.join(', '):'none'),
  'Body changed: '+(diff.bodyChanged?'yes':'no'),
  diff.truncated?'Line-level preview incomplete for this long article.':
   'Body lines added: '+diff.added+'; removed: '+diff.removed,
  'This summary contains no article content and was not uploaded.'
 ].join('\n');
}
