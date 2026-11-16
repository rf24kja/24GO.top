/**
 * Public App Studio source comparison: no network, browser storage or hashing.
 * A download request is NOT a confirmed save; only a built-in example or
 * explicitly imported, validated ZIP establishes a recoverable baseline.
 */
const FIELDS=Object.freeze(['name','html','css','js']);

export function sameStudioSource(left,right){
 return Boolean(left&&right&&typeof left==='object'&&typeof right==='object'&&
  FIELDS.every(key=>typeof left[key]==='string'&&typeof right[key]==='string'&&
   left[key]===right[key]));
}
export function hasUnsavedStudioSource(current,baseline){
 return !sameStudioSource(current,baseline);
}
