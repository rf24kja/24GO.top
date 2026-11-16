import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scanDraftSharingRisks} from '../site/draft-lab-privacy.js';

const draft=(body,extra={})=>({
 title:'Reproducible technical guide',body,source:'',...extra
});

test('local preflight flags likely credentials without disclosing their values',()=>{
 const samples=[
  'sk-'+'a'.repeat(28),
  'ghp_'+'a'.repeat(36),
  'github_pat_'+'A'.repeat(32),
  'AKIA'+'A'.repeat(16),
  '-----BEGIN PRIVATE KEY-----',
  'Authorization: Bearer '+'Z'.repeat(36),
  'password = "'+'x'.repeat(26)+'"',
  'https://user:secret123@example.org/private'
 ];
 for(const value of samples){
  const result=scanDraftSharingRisks(draft('Documentation with '+value));
  assert.equal(result.credential,true,'expected secret flag');
  assert.equal(result.flagged,true);
  assert.equal(Object.isFrozen(result),true);
  assert.deepEqual(Object.keys(result).sort(),['credential','email','flagged']);
  assert.equal(JSON.stringify(result).includes(value),false,'raw secret must not leak');
 }
});
test('emails are flagged, generic documentation does not produce a false guarantee',()=>{
 const result=scanDraftSharingRisks(draft('Contact maintainer@example.org for details.'));
 assert.equal(result.email,true);
 assert.equal(result.credential,false);
 assert.equal(result.flagged,true);
 const plain=scanDraftSharingRisks(draft('An offline tutorial about source files and encryption.'));
 assert.deepEqual(plain,{credential:false,email:false,flagged:false});
});
test('only explicit bounded plain strings are accepted; no external calls or browser persistence',()=>{
 for(const bad of [null,[],{},draft('x',{source:3}),draft('x'.repeat(16001)),draft('x',{title:{secret:'foo'}})])
  assert.throws(()=>scanDraftSharingRisks(bad),TypeError);
 const source=readFileSync(new URL('../site/draft-lab-privacy.js',import.meta.url),'utf8');
 for(const forbidden of ['fetch(','XMLHttpRequest','localStorage','sessionStorage','indexedDB','sendBeacon','innerHTML','console.'])assert.equal(source.includes(forbidden),false);
 const ui=readFileSync(new URL('../site/draft-lab.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../site/draft-lab.html',import.meta.url),'utf8');
 assert.ok(ui.includes('scanDraftSharingRisks(currentDraft())'));
 assert.ok(ui.includes("field('checkDraftPrivacy').addEventListener('click'"));
 assert.match(html,/id="checkDraftPrivacy"/);
 assert.match(html,/id="draftPrivacyStatus" role="status" aria-live="polite"/);
});
