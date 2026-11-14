import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createDraftVault,VAULT_KEY} from '../site/draft-lab-vault.js';
import {encryptDraftLibraryBackup,decryptDraftLibraryBackup,
 ENCRYPTED_BACKUP_MAX_BYTES,ENCRYPTED_BACKUP_ITERATIONS}
 from '../site/draft-lab-encrypted-backup.js';

const secret='Correct horse 🔐 battery stampede 2026!';
const article={title:'Original technical research with Unicode',
 body:'## Evidence\n\nThe reproducible test uses 中文, ภาษาไทย and Русский.\n\n    const n = 42;',
 locale:'ru',category:'guides',source:'https://example.org/public-evidence'};
const memory=()=>{const m=new Map();return {m,storage:{
 getItem:key=>m.get(key)??null,setItem:(key,v)=>m.set(key,v)
 }};};
function vault({storage}){
 let id=0;
 return createDraftVault(storage,{
  newId:()=> '00000000-0000-4000-8000-'+String(++id).padStart(12,'0'),
  now:()=>new Date('2026-11-14T10:00:00Z')
 });
}
const cryptoOpt={cryptoImpl:webcrypto};

test('encrypted vault backups round-trip exact original articles through actual WebCrypto',async()=>{
 const a=memory(),b=memory(),origin=vault(a);
 origin.save(article);
 origin.save({...article,title:'Second engineering experiment',locale:'th',
  body:'## ทดลอง\n\nA second independent article.'});
 const plain=origin.exportBackup();
 const encrypted=await encryptDraftLibraryBackup(plain,secret,cryptoOpt);
 assert.match(encrypted,/"format": "24gotop-encrypted-draft-library"/);
 assert.match(encrypted,/"cipher": "AES-256-GCM"/);
 assert.match(encrypted,/"kdf": "PBKDF2-SHA256"/);
 assert.match(encrypted,/"iterations": 250000/);
 assert.equal(ENCRYPTED_BACKUP_ITERATIONS,250000);
 assert.ok(Buffer.byteLength(encrypted,'utf8')<ENCRYPTED_BACKUP_MAX_BYTES);
 assert.doesNotMatch(encrypted,/Original technical research|Second engineering|example\.org|ภาษาไทย|Correct horse/);
 assert.equal(await decryptDraftLibraryBackup(encrypted,secret,cryptoOpt),plain);
 assert.equal(vault(b).restoreBackup(await decryptDraftLibraryBackup(encrypted,secret,cryptoOpt)),2);
 assert.deepEqual(vault(b).list(),origin.list());
 assert.equal(b.m.has(VAULT_KEY),true);
 assert.deepEqual(vault(b).load(origin.list()[0].id),origin.load(origin.list()[0].id));
});

test('unique random salt and IV prevent identical encrypted outputs',async()=>{
 const a=memory(),v=vault(a);
 v.save(article);
 const plain=v.exportBackup();
 const one=JSON.parse(await encryptDraftLibraryBackup(plain,secret,cryptoOpt));
 const two=JSON.parse(await encryptDraftLibraryBackup(plain,secret,cryptoOpt));
 assert.notEqual(one.salt,two.salt);
 assert.notEqual(one.iv,two.iv);
 assert.notEqual(one.ciphertext,two.ciphertext);
});

test('wrong passwords, ciphertext corruption and header tampering cannot disclose drafts',async()=>{
 const a=memory(),v=vault(a);v.save(article);
 const encrypted=await encryptDraftLibraryBackup(v.exportBackup(),secret,cryptoOpt);
 const original=JSON.parse(encrypted),b=memory(),target=vault(b);
 await assert.rejects(decryptDraftLibraryBackup(encrypted,'Wrong but long password!',cryptoOpt),
  /encrypted_invalid/);
 for(const change of [
  x=>({...x,iterations:1}),x=>({...x,cipher:'AES-128-GCM'}),
  x=>({...x,kdf:'scrypt'}),x=>({...x,extra:'unauthorized'}),
  x=>({...x,salt:'AAAAAAAAAAAAAAAAAAAAAA'}),
  x=>({...x,iv:'AAAA'}),
  x=>({...x,ciphertext:x.ciphertext.slice(0,-3)+'abc'}),
  x=>({...x,ciphertext:'not-canonical='})
 ]){
  await assert.rejects(decryptDraftLibraryBackup(JSON.stringify(change(original)),
   secret,cryptoOpt),/encrypted_invalid/);
  assert.equal(b.m.has(VAULT_KEY),false);
 }
 assert.throws(()=>target.restoreBackup(encrypted),/vault_invalid/,
  'encrypted file cannot be silently loaded as plaintext library backup');
 assert.equal(b.m.size,0);
});

test('invalid/weak passwords, missing WebCrypto and malformed encrypted files fail closed',async()=>{
 for(const pass of ['', 'short','this is\nnot allowed','a'.repeat(129),
   'abcdefghi\uD800xyz']){
  await assert.rejects(encryptDraftLibraryBackup('{}',pass,cryptoOpt),
   /encrypted_invalid/);
 }
 await assert.rejects(encryptDraftLibraryBackup('{}',secret,{cryptoImpl:{}}),
  /encrypted_unavailable/);
 await assert.rejects(decryptDraftLibraryBackup('{}',secret,{cryptoImpl:{}}),
  /encrypted_unavailable/);
 for(const raw of ['', '{}','[]','not JSON','x'.repeat(ENCRYPTED_BACKUP_MAX_BYTES+1)]){
  await assert.rejects(decryptDraftLibraryBackup(raw,secret,cryptoOpt),
   /encrypted_invalid/);
 }
 assert.equal((await encryptDraftLibraryBackup('test ✨',secret,cryptoOpt)).includes('test ✨'),false);
});

test('encrypted backup imports still refuse to replace existing browser library',async()=>{
 const a=memory(),b=memory(),source=vault(a),dest=vault(b);
 source.save(article);dest.save({...article,title:'Existing safe unpublished manuscript'});
 const before=b.m.get(VAULT_KEY);
 const encrypted=await encryptDraftLibraryBackup(source.exportBackup(),secret,cryptoOpt);
 const validPlain=await decryptDraftLibraryBackup(encrypted,secret,cryptoOpt);
 assert.throws(()=>dest.restoreBackup(validPlain),/vault_conflict/);
 assert.equal(b.m.get(VAULT_KEY),before);
});
