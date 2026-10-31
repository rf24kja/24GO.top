import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftVault,VAULT_KEY,MAX_SAVED_DRAFTS} from '../site/draft-lab-vault.js';
const a={title:'A real technical guide',body:'Evidence and reproducible research details for this article.',
 locale:'en',category:'guides',source:''};
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function setup(){
 const items=new Map(),storage={
  getItem(k){return items.has(k)?items.get(k):null;},
  setItem(k,v){items.set(k,v);}
 };
 let seq=0;
 return {items,storage,vault:createDraftVault(storage,{
  newId:()=>uuid(++seq),now:()=>new Date('2026-10-31T13:00:00Z')
 })};
}
test('drafts are never persisted until the user explicitly calls save',()=>{
 const {items,vault}=setup();
 assert.deepEqual(vault.list(),[]);
 assert.equal(items.size,0);
 const one=vault.save(a);
 assert.equal(items.has(VAULT_KEY),true);
 assert.equal(vault.list().length,1);
 assert.deepEqual(vault.load(one.id).draft,a);
});
test('manual library saves multiple distinct drafts and updates only the selected slot',()=>{
 const {vault}=setup(),one=vault.save(a);
 const two=vault.save({...a,title:'Second technical guide'});
 assert.equal(vault.list().length,2);
 const changed=vault.save({...a,body:'A replacement body with enough reproducible technical evidence.'},
  {id:one.id,version:one.version});
 assert.notEqual(changed.version,one.version);
 assert.equal(vault.load(one.id).draft.body,changed.draft.body);
 assert.equal(vault.load(two.id).draft.title,'Second technical guide');
 vault.remove(two.id,{version:two.version});
 assert.equal(vault.list().length,1);
});
test('a second tab cannot overwrite a newer saved version from stale UI state',()=>{
 const {vault,storage}=setup();
 const other=createDraftVault(storage,{now:()=>new Date('2026-10-31T13:05:00Z')});
 const first=vault.save(a);
 other.save({...a,title:'Updated in another browser tab'},
  {id:first.id,version:first.version});
 assert.throws(()=>vault.save({...a,title:'Outdated tab overwrite'},
  {id:first.id,version:first.version}),/vault_conflict/);
 assert.equal(vault.load(first.id).draft.title,'Updated in another browser tab');
 assert.throws(()=>vault.remove(first.id,{version:first.version}),/vault_conflict/);
});
test('browser quota and full library failures never remove existing drafts',()=>{
 const {vault,items}=setup();
 for(let i=0;i<MAX_SAVED_DRAFTS;i++)
  vault.save({...a,title:'Valid guide number '+i});
 assert.throws(()=>vault.save(a),/vault_full/);
 assert.equal(vault.list().length,MAX_SAVED_DRAFTS);
 items.set(VAULT_KEY,'{broken JSON');
 assert.throws(()=>vault.save(a),/vault_unavailable/);
 assert.equal(items.get(VAULT_KEY),'{broken JSON');
});
test('browser snapshots are not uploaded and reject invalid article data',()=>{
 const {vault,items}=setup();
 for(const broken of [{...a,body:'short'}, {...a,title:'x'},
   {...a,source:'javascript:alert(1)'}, {...a,locale:'other'}])
  assert.throws(()=>vault.save(broken),/vault_invalid/);
 assert.equal(items.size,0);
});
test('when local storage is blocked, the editor receives a safe failure',()=>{
 const denied={getItem(){throw Error('private storage blocked');},
 setItem(){throw Error('quota exceeded');}};
 const vault=createDraftVault(denied);
 assert.throws(()=>vault.list(),/vault_unavailable/);
 assert.throws(()=>vault.save(a),/vault_unavailable/);
});
