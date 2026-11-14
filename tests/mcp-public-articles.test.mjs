import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadPublishedCorpus,handleMcpRequest} from '../packages/mcp/stdio.mjs';
import {approvedReadingArticles,encodeReadingPath} from '../site/engineering/paths-logic.mjs';

const articles=loadPublishedCorpus();
const query=(method,params={},id=1)=>({jsonrpc:'2.0',id,method,params});
const modernMeta={'io.modelcontextprotocol/protocolVersion':'2026-07-28',
 'io.modelcontextprotocol/clientCapabilities':{}};

test('MCP corpus contains exactly the approved canonical articles and no draft material',()=>{
 assert.equal(articles.length,12);
 const urls=new Set(articles.map(x=>x.url));
 assert.equal(urls.size,12);
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
 assert.deepEqual(tools.tools.map(x=>x.name),['search_articles','search_articles_page','read_article_excerpt','resolve_reading_path','create_reading_path','read_article','list_articles']);
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
 assert.equal(resources.resources.length,12);
 const resource=handleMcpRequest(query('resources/read',{
  uri:items[0].url,_meta:modernMeta
 }),articles).result;
 assert.equal(resource.contents[0].mimeType,'text/plain');
 assert.ok(resource.contents[0].text.length>300);
});

test('paged search returns deterministic canonical public results and nextOffset',()=>{
 const first=handleMcpRequest(query('tools/call',{
  name:'search_articles_page',
  arguments:{query:'security',limit:2,offset:0},_meta:modernMeta
 }),articles).result;
 assert.equal(first.resultType,'complete');
 const data=JSON.parse(first.content[0].text);
 assert.ok(data.total>=2);
 assert.equal(data.offset,0);
 assert.equal(data.articles.length,2);
 assert.equal(data.nextOffset,2);
 assert.ok(data.articles.every(x=>articles.some(item=>item.url===x.url)));
 assert.ok(data.articles.every(x=>['title','summary','article'].includes(x.matchedIn)));
 const next=handleMcpRequest(query('tools/call',{
  name:'search_articles_page',
  arguments:{query:'security',limit:2,offset:2}
 }),articles).result;
 const nextData=JSON.parse(next.content[0].text);
 assert.ok(nextData.articles.every(x=>!data.articles.some(y=>y.url===x.url)));
 const none=handleMcpRequest(query('tools/call',{
  name:'search_articles_page',
  arguments:{query:'security',limit:2,offset:200}
 }),articles).result;
 const last=JSON.parse(none.content[0].text);
 assert.deepEqual(last.articles,[]);
 assert.equal(last.nextOffset,null);
});

test('read_article_excerpt returns bounded Unicode-safe plain text and canonical metadata',()=>{
 const source=articles[0].url;
 const first=handleMcpRequest(query('tools/call',{
  name:'read_article_excerpt',arguments:{url:source,maxChars:300},_meta:modernMeta
 }),articles).result;
 assert.equal(first.resultType,'complete');
 const chunk=JSON.parse(first.content[0].text);
 assert.equal(chunk.url,source);
 assert.equal(chunk.textKind,'lossy-extracted-public-html');
 assert.equal(Array.from(chunk.excerpt).length,300);
 assert.equal(chunk.nextOffset,300);
 assert.ok(chunk.totalCharacters>=300);
 assert.match(chunk.note,/untrusted/i);
 const second=handleMcpRequest(query('tools/call',{
  name:'read_article_excerpt',
  arguments:{url:source,offset:chunk.nextOffset,maxChars:300}
 }),articles).result;
 const page=JSON.parse(second.content[0].text);
 assert.equal(page.offset,chunk.nextOffset);
 assert.equal(page.end,page.nextOffset);
 assert.ok(!page.excerpt.startsWith(chunk.excerpt));
 assert.ok(!JSON.stringify(first).includes('PUBLISH_API_KEY'));
});


test('human browser reading paths resolve in the local MCP with exact reviewed order',()=>{
 const approved=approvedReadingArticles({items:articles.map(({title,url,summary})=>({title,url,summary}))});
 const ids=[approved[2].id,approved[0].id,approved[1].id];
 const fragment=encodeReadingPath({title:'Learning security · 中文 🚀',ids},approved);
 const link='https://24go.top/engineering/reading-paths/'+fragment;
 const result=handleMcpRequest(query('tools/call',{
  name:'resolve_reading_path',arguments:{url:link},_meta:modernMeta
 }),articles).result;
 assert.equal(result.resultType,'complete');
 assert.equal(result.isError,undefined);
 const data=JSON.parse(result.content[0].text);
 assert.equal(data.url,link);
 assert.equal(data.title,'Learning security · 中文 🚀');
 assert.equal(data.total,3);
 assert.deepEqual(data.articles.map(x=>x.id),ids);
 assert.deepEqual(data.articles.map(x=>x.url),[articles[2].url,articles[0].url,articles[1].url]);
 assert.ok(data.articles.every(x=>x.summary&&!Object.hasOwn(x,'text')));
 assert.match(data.note,/public article metadata/i);
});

test('an MCP agent can create a browser-shareable path without files, accounts or writes',()=>{
 const chosen=[articles[1].url,articles[0].url];
 const result=handleMcpRequest(query('tools/call',{
  name:'create_reading_path',
  arguments:{title:'My AI reading route',urls:chosen},_meta:modernMeta
 }),articles).result;
 assert.equal(result.resultType,'complete');
 const data=JSON.parse(result.content[0].text);
 assert.match(data.url,/^https:\/\/24go\.top\/engineering\/reading-paths\/#path=%7B/);
 assert.deepEqual(data.articles.map(x=>x.url),chosen);
 assert.equal(data.total,2);
 assert.match(data.markdown,/^# My AI reading route\n\n1\. /);
 assert.equal(data.markdown.indexOf(chosen[0])<data.markdown.indexOf(chosen[1]),true);
 const roundTrip=handleMcpRequest(query('tools/call',{
  name:'resolve_reading_path',arguments:{url:data.url}
 }),articles).result;
 assert.deepEqual(JSON.parse(roundTrip.content[0].text).articles.map(x=>x.url),chosen);
});

test('shared-path tools reject forged origins, malformed fragments, duplicates and unreviewed articles',()=>{
 const good='https://24go.top/engineering/reading-paths/';
 const invalid=[
  {name:'resolve_reading_path',arguments:{url:'https://evil.example/#path=%7B%7D'}},
  {name:'resolve_reading_path',arguments:{url:good+'?token=secret#path=%7B%7D'}},
  {name:'resolve_reading_path',arguments:{url:good+'#path=%7B%7D'}},
  {name:'resolve_reading_path',arguments:{url:good+'#path=%ED%A0%80'}},
  {name:'resolve_reading_path',arguments:{url:good+'#path='+('a'.repeat(2201))}},
  {name:'resolve_reading_path',arguments:{url:good,token:'not allowed'}},
  {name:'create_reading_path',arguments:{title:'X',urls:[]}},
  {name:'create_reading_path',arguments:{title:'Invalid\nTitle',urls:[articles[0].url]}},
  {name:'create_reading_path',arguments:{title:'Long',urls:[articles[0].url,articles[0].url]}},
  {name:'create_reading_path',arguments:{title:'Unreviewed',urls:['https://24go.top/engineering/unknown.html']}},
  {name:'create_reading_path',arguments:{title:'Private',urls:['file:///etc/passwd']}},
  {name:'create_reading_path',arguments:{title:'No',urls:[articles[0].url],token:'secret'}},
  {name:'create_reading_path',arguments:{title:'Ten plus',urls:new Array(11).fill(articles[0].url)}}
 ];
 for(const call of invalid){
  const result=handleMcpRequest(query('tools/call',call),articles);
  assert.equal(result.result.isError,true,JSON.stringify(call));
  assert.equal(JSON.parse(result.result.content[0].text),'Invalid public reading path');
 }
});

test('untrusted input cannot read arbitrary files, write data or send external requests',()=>{
 for(const args of [
  {name:'read_article',arguments:{url:'file:///etc/passwd'}},
  {name:'read_article',arguments:{url:'https://24go.top/engineering/../../private.txt'}},
  {name:'read_article',arguments:{url:'https://24go.top/engineering/example.html',token:'secret'}},
  {name:'search_articles',arguments:{query:'x'.repeat(81)}},
  {name:'search_articles',arguments:{query:'',limit:1}},
  {name:'search_articles',arguments:{query:'security',limit:100}},
  {name:'search_articles_page',arguments:{query:'control\ncharacter',offset:0}},
  {name:'search_articles_page',arguments:{query:'security',offset:-1}},
  {name:'search_articles_page',arguments:{query:'security',offset:201}},
  {name:'search_articles_page',arguments:{query:'security',offset:1.5}},
  {name:'read_article_excerpt',arguments:{url:articles[0].url,maxChars:20}},
  {name:'read_article_excerpt',arguments:{url:articles[0].url,maxChars:4001}},
  {name:'read_article_excerpt',arguments:{url:articles[0].url,offset:28000}},
  {name:'read_article_excerpt',arguments:{url:'file:///etc/shadow'}},
  {name:'read_article_excerpt',arguments:{url:articles[0].url,token:'secret'}},
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
 assert.equal(replies[1].result.tools.length,7);
 assert.equal(JSON.parse(replies[2].result.content[0].text).length,2);
 assert.equal(replies[3].result.protocolVersion,'2025-11-25');
 assert.equal(stderr,'');
});
