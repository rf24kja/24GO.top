import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const doc=readFileSync(fileURLToPath(new URL('../API.md',import.meta.url)),'utf8');
const sdk=readFileSync(fileURLToPath(new URL('../docs/SDK_QUICKSTART.md',import.meta.url)),'utf8');
const spec=JSON.parse(readFileSync(fileURLToPath(new URL('../openapi/openapi.json',import.meta.url)),'utf8'));

test('prototype API docs describe the real source contract, version policy and current errors',()=>{
 assert.equal(spec.openapi,'3.1.0');
 assert.equal(spec.info.version,'0.1.0');
 assert.match(doc,/Semantic Versioning 2\.0\.0/);
 assert.match(doc,/not a hosted release claim/);
 assert.match(doc,/not cursor pagination/);
 assert.match(doc,/Host: 127\.0\.0\.1:3000/);
 assert.match(doc,/redirect: 'error'/);
 for(const status of ['400','401','403','413','503']){
  assert.ok(Object.hasOwn(spec.paths['/api/posts'].post.responses,status),status+' missing in OpenAPI');
  assert.match(doc,new RegExp('\\b'+status+'\\b'));
 }
 assert.match(sdk,/not an npm package/);
 assert.match(sdk,/0\.1\.0/);
 assert.doesNotMatch(doc,/(deployed production API|published npm package)/i);
});
