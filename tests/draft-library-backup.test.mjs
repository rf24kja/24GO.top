import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDraftVault,MAX_VAULT_BACKUP_BYTES,VAULT_KEY}
 from '../site/draft-lab-vault.js';

const sample={title:'Multilingual technical knowledge',body:'Source text in 中文 Русский ไทย, with exact whitespace.\n\n  code',
 locale:'ru',category:'guides',source:'https://example.org/document'};
function setup(){
 const memory=new Map(),storage={
  getItem:k=>memory.get(k)??null,
  setItem:(k,v)=>memory.set(k,v)
 };
 let n=0;
 return {memory,storage,vault:createDraftVault(storage,{
  newId:()=>`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}`,
  now:()=>new Date('2026-10-31T15:00:00Z')
 })};
}
test('manually exported entire library restores exact multilingual drafts on a fresh device',()=>{
 const a=setup(),b=setup();
 assert.throws(()=>a.vault.exportBackup(),/vault_missing/);
 a.vault.save(sample);
 a.vault.save({...sample,title:'A second useful technical post',body:'Unpublished draft with distinct technical evidence.'});
 const file=a.vault.exportBackup();
 assert.match(file,/"format": "24gotop-manual-drafts-backup"/);
 assert.ok(Buffer.byteLength(file,'utf8')<MAX_VAULT_BACKUP_BYTES);
 assert.equal(b.memory.size,0,'no startup persistence');
 assert.equal(b.vault.restoreBackup(file),2);
 assert.deepEqual(b.vault.list(),a.vault.list());
 for(const x of a.vault.list())assert.deepEqual(b.vault.load(x.id),a.vault.load(x.id));
});
test('restore never replaces existing saved work or partially imports corrupted files',()=>{
 const old=setup(),fresh=setup();
 const original=old.vault.save(sample);
 const file=old.vault.exportBackup();
 const before=old.memory.get(VAULT_KEY);
 assert.throws(()=>old.vault.restoreBackup(file),/vault_conflict/);
 assert.equal(old.memory.get(VAULT_KEY),before);
 for(const bad of ['{',file.replace('24gotop-manual-drafts-backup','unsupported'),
  JSON.stringify({...JSON.parse(file),entries:[JSON.parse(file).entries[0],
   JSON.parse(file).entries[0]]}),
  JSON.stringify({...JSON.parse(file),entries:[{
   ...JSON.parse(file).entries[0],draft:{...sample,source:'javascript:alert(1)'}
  }]})]){
  assert.throws(()=>fresh.vault.restoreBackup(bad),/vault_invalid/);
  assert.equal(fresh.memory.has(VAULT_KEY),false);
 }
 assert.deepEqual(old.vault.load(original.id).draft,sample);
});
test('browser offers explicit offline export and opt-in empty-library recovery',()=>{
 const html=readFileSync(new URL('../site/draft-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../site/draft-lab.js',import.meta.url),'utf8');
 for(const id of ['exportDraftLibrary','restoreDraftLibrary','draftLibraryFile'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/new TextDecoder\('utf-8',\{fatal:true\}\)/);
 assert.match(js,/file\.size>MAX_VAULT_BACKUP_BYTES/);
 assert.match(js,/restoreBackup\(text\)/);
 assert.match(js,/backupRestoreConfirm/);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|innerHTML/);
});
