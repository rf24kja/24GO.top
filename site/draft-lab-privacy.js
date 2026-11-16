/**
 * Optional local sharing preflight. No network, storage, logging or raw matches.
 * These heuristics are incomplete: a clean result is NEVER a safety guarantee.
 */
const credentialPatterns=[
 /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i,
 /\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{20,})\b/,
 /(?:^|[\s"'])\b(?:api[_-]?key|password|secret|token|authorization)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{20,}/im,
 /\bBearer\s+[A-Za-z0-9_.-]{24,}\b/i,
 /https?:\/\/[^\s/@:]{1,64}:[^\s/@]{1,64}@/i
];
const emailPattern=/\b[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,250}\.[A-Z]{2,20}\b/i;
export function scanDraftSharingRisks(draft){
 if(!draft||typeof draft!=='object'||Array.isArray(draft))throw new TypeError('Invalid draft');
 if(typeof draft.title!=='string'||typeof draft.body!=='string'||
    (draft.source!==undefined&&typeof draft.source!=='string'))
  throw new TypeError('Invalid draft fields');
 const fields=['title','body','source'].map(key=>draft[key]??'');
 if(fields.some(value=>typeof value!=='string')||
    fields.reduce((length,value)=>length+value.length,0)>16000)
  throw new TypeError('Invalid draft fields');
 const text=fields.join('\n');
 // Return flags only. Never return, display or store the secret or its location.
 const credential=credentialPatterns.some(pattern=>pattern.test(text));
 const email=emailPattern.test(text);
 return Object.freeze({credential,email,flagged:credential||email});
}
