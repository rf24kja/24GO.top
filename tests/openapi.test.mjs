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

test('local-only publish contract documents loopback and forbidden remote recipients',()=>{
 const operation=doc.paths['/api/posts'].post;
 assert.match(operation.description,/loopback-to-loopback socket/);
 assert.match(operation.description,/even over HTTPS/);
 assert.ok(operation.responses['403'],'server denies non-loopback / foreign Origin');
 assert.deepEqual(operation.responses['403'].content['application/json'].schema,
  {'$ref':'#/components/schemas/ApiError'});
 assert.match(doc.components.securitySchemes.devBearer.description,/never sent to remote HTTP\(S\)/);
});
