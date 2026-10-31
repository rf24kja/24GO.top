// Manually saved, on-device browser snapshots. Not encrypted, synced,
// uploaded or a substitute for an exported file. No startup writes.
import {validateDraft} from './draft-lab-logic.js';
export const VAULT_KEY='24gotop.manual-drafts.v1';
export const MAX_SAVED_DRAFTS=8;
export const MAX_VAULT_BACKUP_BYTES=600000;
const BACKUP_FORMAT='24gotop-manual-drafts-backup';
const MAX_JSON_LENGTH=150000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields=['title','body','locale','category','source'];
function error(code){throw new Error(code);}
function exactDraft(draft){
 if(!draft||typeof draft!=='object'||Array.isArray(draft)||
   fields.some(k=>typeof draft[k]!=='string')||validateDraft(draft))error('vault_invalid');
 return Object.fromEntries(fields.map(k=>[k,draft[k]]));
}
function readVault(storage){
 let raw;
 try{raw=storage.getItem(VAULT_KEY);}catch{error('vault_unavailable');}
 if(raw===null)return [];
 if(typeof raw!=='string'||raw.length>MAX_JSON_LENGTH)error('vault_unavailable');
 let doc;
 try{doc=JSON.parse(raw);}catch{error('vault_unavailable');}
 if(!doc||doc.v!==1||!Array.isArray(doc.entries)||
   doc.entries.length>MAX_SAVED_DRAFTS)error('vault_unavailable');
 const ids=new Set();
 for(const record of doc.entries){
  if(!record||!UUID.test(record.id)||ids.has(record.id)||
    typeof record.updatedAt!=='string'||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(record.updatedAt)||
    !Number.isFinite(Date.parse(record.updatedAt)))error('vault_unavailable');
  ids.add(record.id);
  try{exactDraft(record.draft);}catch{error('vault_unavailable');}
 }
 return doc.entries;
}
function writeVault(storage,entries){
 const raw=JSON.stringify({v:1,entries});
 if(raw.length>MAX_JSON_LENGTH)error('vault_full');
 try{storage.setItem(VAULT_KEY,raw);}catch{error('vault_unavailable');}
}
// Decode and validate the entire file before the single storage write.
function decodeBackup(text){
 if(typeof text!=='string'||text.length>MAX_VAULT_BACKUP_BYTES)
  error('vault_invalid');
 let doc;
 try{doc=JSON.parse(text);}catch{error('vault_invalid');}
 if(!doc||doc.format!==BACKUP_FORMAT||doc.version!==1||
   !Array.isArray(doc.entries)||doc.entries.length<1||
   doc.entries.length>MAX_SAVED_DRAFTS)error('vault_invalid');
 const raw=JSON.stringify({v:1,entries:doc.entries});
 if(raw.length>MAX_JSON_LENGTH)error('vault_invalid');
 let records;
 try{records=readVault({getItem(){return raw;}});}
 catch{error('vault_invalid');}
 return records.map(({id,updatedAt,draft})=>({
  id,updatedAt,draft:exactDraft(draft)
 }));
}
export function createDraftVault(storage,{newId=()=>globalThis.crypto.randomUUID(),
  now=()=>new Date()}={}){
 if(!storage||typeof storage.getItem!=='function'||
   typeof storage.setItem!=='function')error('vault_unavailable');
 return Object.freeze({
  exportBackup(){
   const entries=readVault(storage);
   if(!entries.length)error('vault_missing');
   return JSON.stringify({format:BACKUP_FORMAT,version:1,entries:
    entries.map(({id,updatedAt,draft})=>({id,updatedAt,draft:exactDraft(draft)}))
   },null,2)+'\n';
  },
  restoreBackup(text){
   const entries=decodeBackup(text);
   if(readVault(storage).length)error('vault_conflict');
   writeVault(storage,entries);
   return entries.length;
  },
  list(){
   return readVault(storage).map(({id,updatedAt,draft})=>({
    id,updatedAt,title:draft.title,locale:draft.locale
   })).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  },
  load(id){
   if(typeof id!=='string'||!UUID.test(id))error('vault_invalid');
   const record=readVault(storage).find(x=>x.id===id);
   if(!record)error('vault_missing');
   return {id:record.id,version:record.updatedAt,draft:exactDraft(record.draft)};
  },
  save(draft,{id=null,version=null}={}){
   const normalized=exactDraft(draft),entries=readVault(storage);
   let index=-1;
   if(id!==null){
    if(typeof id!=='string'||!UUID.test(id)||typeof version!=='string')
      error('vault_invalid');
    index=entries.findIndex(x=>x.id===id);
    if(index<0||entries[index].updatedAt!==version)error('vault_conflict');
   }else{
    if(entries.length>=MAX_SAVED_DRAFTS)error('vault_full');
    id=newId();
    if(!UUID.test(id)||entries.some(x=>x.id===id))error('vault_unavailable');
   }
   const date=now();
   if(!(date instanceof Date)||!Number.isFinite(date.getTime()))error('vault_unavailable');
   const timestamp=new Date(Math.max(date.getTime(),
     index>=0?Date.parse(entries[index].updatedAt)+1:0)).toISOString();
   const record={id,updatedAt:timestamp,draft:normalized};
   if(index<0)entries.push(record);else entries[index]=record;
   writeVault(storage,entries);
   return {id,version:timestamp,draft:{...normalized}};
  },
  remove(id,{version=null}={}){
   if(typeof id!=='string'||!UUID.test(id))error('vault_invalid');
   const entries=readVault(storage),index=entries.findIndex(x=>x.id===id);
   if(index<0)error('vault_missing');
   if(version!==null&&entries[index].updatedAt!==version)error('vault_conflict');
   entries.splice(index,1);
   writeVault(storage,entries);
  }
 });
}
