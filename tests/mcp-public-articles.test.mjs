import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadPublishedCorpus,handleMcpRequest} from '../packages/mcp/stdio.mjs';

const articles=loadPublishedCorpus();
const query=(method,params={},id=1)=>({jsonrpc:'2.0',id,method,params});
const modernMeta={'io.modelcontextprotocol/protocolVersion':'2026-07-28',
 'io.modelcontextprotocol/clientCapabilities':{}};

test('MCP corpus contains exactly the approved canonical articles and no draft material',()=>{
 assert.equal(articles.length,10);
 const urls=new Set(articles.map(x=>x.url));
 assert.equal(urls.size,10);
 for(const x of articles){
  assert.match(x.url,/^https:\/\/24go\.top\/engineering\/[a-z0-9-]+\.html$/);
  assert.ok(x.text.length>300);
  assert.equal(x.language,'en');
 }
});

test('MCP discovery and legacy initialize advertise read-only tools and resources',()=>{
 const discovered=handleMcpRequest(query('server/discover',{_meta:modernMeta}),articles);
 assert.equal(discovered.result.resultType,'complete');
 assert.ok(discovered.result.supportedVersions.includes('2026-07-28'));
 assert.deepEqual(Object.keys(discovered.result.capabilities).sort(),['resources','tools']);
 const initialized=handleMcpRequest(query('initialize',{protocolVersion:'2025-11-25'}),articles);
 assert.equal(initialized.result.protocolVersion,'2025-11-25');
 const tools=handleMcpRequest(query('tools/list',{_meta:modernMeta}),articles).result;
 assert.equal(tools.resultType,'complete');
 assert.deepEqual(tools.tools.map(x=>x.name),['search_articles','read_article','list_articles']);
 assert.ok(tools.tools.every(x=>x.inputSchema.additionalProperties===false));
});

test('tools search actual published article body and return useful canonical URLs',()=>{
 const r=handleMcpRequest(query('tools/call',{
  name:'search_articles',arguments:{query:'content security policy',limit:10},
  _meta:modernMeta
 }),articles).result;
 assert.equal(r.resultType,'complete');
 const items=JSON.parse(r.content[0].text);
 assert.ok(items.length>=1);
 assert.ok(items.every(item=>articles.some(x=>x.url===item.url)));
 assert.ok(items.every(item=>!Object.hasOwn(item,'text')));
 const reader=handleMcpRequest(query('tools/call',{
  name:'read_article',arguments:{url:items[0].url},_meta:modernMeta
 }),articles).result;
 const body=JSON.parse(reader.content[0].text);
 assert.ok(body.text.length>300);
 assert.ok(body.text.toLowerCase().includes('content security policy'));
 const resources=handleMcpRequest(query('resources/list',{_meta:modernMeta}),articles).result;
 assert.equal(resources.resources.length,10);
 const resource=handleMcpRequest(query('resources/read',{
  uri:items[0].url,_meta:modernMeta
 }),articles).result;
 assert.equal(resource.contents[0].mimeType,'text/plain');
 assert.ok(resource.contents[0].text.length>300);
});

test('untrusted input cannot read arbitrary files, write data or send external requests',()=>{
 for(const args of [
  {name:'read_article',arguments:{url:'file:///etc/passwd'}},
  {name:'read_article',arguments:{url:'https://24go.top/engineering/../../private.txt'}},
  {name:'read_article',arguments:{url:'https://24go.top/engineering/example.html',token:'secret'}},
  {name:'search_articles',arguments:{query:'x'.repeat(81)}},
  {name:'search_articles',arguments:{query:'',limit:1}},
  {name:'search_articles',arguments:{query:'security',limit:100}},
  {name:'publish_article',arguments:{body:'new article'}}
 ]){
  const reply=handleMcpRequest(query('tools/call',args),articles);
  assert.ok(reply.error||reply.result.isError,JSON.stringify(args));
 }
 assert.equal(handleMcpRequest(query('resources/read',{uri:'file:///etc/passwd'}),articles).error.code,-32602);
 assert.equal(handleMcpRequest(query('resources/read',{uri:'https://evil.example'}),articles).error.code,-32602);
 assert.equal(handleMcpRequest(query('anything/execute'),articles).error.code,-32601);
});

test('stdio child process speaks newline JSON-RPC without logs mixed into stdout',async()=>{
 const filename=fileURLToPath(new URL('../packages/mcp/stdio.mjs',import.meta.url));
 const child=spawn(process.execPath,[filename],{stdio:['pipe','pipe','pipe']});
 const messages=[
  query('server/discover',{_meta:modernMeta},1),
  query('tools/list',{_meta:modernMeta},2),
  query('tools/call',{name:'list_articles',arguments:{limit:2},_meta:modernMeta},3),
  query('initialize',{protocolVersion:'2025-11-25'},4)
 ];
 let stdout='',stderr='';
 child.stdout.setEncoding('utf8').on('data',chunk=>{stdout+=chunk;});
 child.stderr.setEncoding('utf8').on('data',chunk=>{stderr+=chunk;});
 const finished=new Promise((resolve,reject)=>{
  child.on('error',reject);
  child.on('close',(code)=>code===0?resolve():reject(Error('MCP child exited '+code+': '+stderr)));
 });
 child.stdin.end(messages.map(x=>JSON.stringify(x)).join('\n')+'\n');
 await finished;
 const replies=stdout.trim().split('\n').map(JSON.parse);
 assert.equal(replies.length,4,stdout);
 assert.deepEqual(replies.map(x=>x.id),[1,2,3,4]);
 assert.equal(replies[0].result.resultType,'complete');
 assert.equal(replies[1].result.tools.length,3);
 assert.equal(JSON.parse(replies[2].result.content[0].text).length,2);
 assert.equal(replies[3].result.protocolVersion,'2025-11-25');
 assert.equal(stderr,'');
});
