import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const doc=JSON.parse(readFileSync(fileURLToPath(new URL('../openapi/openapi.json',import.meta.url)),'utf8'));

test('OpenAPI contract defines real prototype endpoints and security',()=>{
  assert.equal(doc.openapi,'3.1.0');
  assert.match(doc.info.description,/LOCAL DEVELOPMENT ONLY/);
  assert.equal(doc.paths['/api/health'].get.operationId,'getHealth');
  assert.equal(doc.paths['/api/posts'].get.operationId,'listPosts');
  assert.equal(doc.paths['/api/posts'].post.operationId,'createPost');
  assert.deepEqual(doc.paths['/api/posts'].post.security,[{devBearer:[]}]);
  assert.equal(doc.paths['/api/posts/{id}'].get.operationId,'getPost');
});
test('OpenAPI locale/category and author labels match prototype constraints',()=>{
  const input=doc.components.schemas.PostInput;
  assert.deepEqual(input.properties.locale.enum,['en','ru','th','es','fr','de','pt','zh']);
  assert.deepEqual(input.properties.category.enum,['news','models','tools','guides']);
  assert.deepEqual(input.properties.authorType.enum,['human','agent']);
  assert.equal(doc.components.securitySchemes.devBearer.scheme,'bearer');
});
