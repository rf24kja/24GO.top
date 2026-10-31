import test from 'node:test';
import assert from 'node:assert/strict';
import {rankPublishedArticles,slicePublishedText}
 from '../packages/mcp/discovery.mjs';

const sample=[
 {url:'https://24go.top/engineering/security-overview.html',title:'Security overview',
  summary:'Policy and incident prevention',text:'Role permissions and source review',
  language:'en',date:'2026-10-31'},
 {url:'https://24go.top/engineering/roles.html',title:'Roles and permissions',
  summary:'A guide to role security',text:'Permissions policy security roles',
  language:'en',date:'2026-10-30'},
 {url:'https://24go.top/engineering/unrelated.html',title:'Other note',
  summary:'Not relevant',text:'A separate engineering subject',
  language:'en',date:'2026-10-28'}
];

test('multi-term search requires all words but not exact ordering',()=>{
 const a=rankPublishedArticles(sample,{query:'security policy'});
 const b=rankPublishedArticles(sample,{query:'policy security'});
 assert.equal(a.total,2);
 assert.deepEqual(a.articles.map(x=>x.url).sort(),b.articles.map(x=>x.url).sort());
 assert.ok(a.articles.every(x=>!x.url.endsWith('/unrelated.html')));
 assert.equal(a.nextOffset,null);
 assert.ok(a.articles.every(x=>x.matchedIn==='article'||x.matchedIn==='summary'));
});

test('paged search is deterministic, bounded and stable on ties',()=>{
 const first=rankPublishedArticles(sample,{query:'security',limit:1});
 assert.equal(first.articles.length,1);
 assert.equal(first.total,2);
 assert.equal(first.nextOffset,1);
 const next=rankPublishedArticles(sample,{query:'security',limit:1,offset:1});
 assert.equal(next.articles.length,1);
 assert.notEqual(first.articles[0].url,next.articles[0].url);
 assert.equal(next.nextOffset,null);
 const past=rankPublishedArticles(sample,{query:'security',offset:200});
 assert.deepEqual(past.articles,[]);
 assert.equal(past.nextOffset,null);
 const repeat=rankPublishedArticles(sample,{query:'security',limit:1});
 assert.deepEqual(repeat,first);
});

test('search arguments are validated before any corpus matching',()=>{
 for(const query of ['', ' ', '\n', 'bad\ttab', 'x'.repeat(81),undefined]){
  assert.throws(()=>rankPublishedArticles(sample,{query}),TypeError);
 }
 for(const limit of [0,21,1.25,NaN,'2']){
  assert.throws(()=>rankPublishedArticles(sample,{query:'security',limit}),RangeError);
 }
 for(const offset of [-1,201,0.5,Infinity,'1']){
  assert.throws(()=>rankPublishedArticles(sample,{query:'security',offset}),RangeError);
 }
 assert.throws(()=>rankPublishedArticles(new Array(201).fill(sample[0]),{query:'security'}),TypeError);
 assert.throws(()=>rankPublishedArticles([{}],{query:'security'}),TypeError);
});

test('excerpt offsets are Unicode code points and never split surrogate pairs',()=>{
 const text='🔒🙂 PostgreSQL 中文测试 '.repeat(300);
 const one=slicePublishedText(text,{offset:0,maxChars:201});
 const two=slicePublishedText(text,{offset:one.nextOffset,maxChars:200});
 assert.equal(Array.from(one.excerpt).length,201);
 assert.equal(two.offset,one.end);
 assert.equal(one.end,201);
 assert.equal(one.excerpt+two.excerpt,Array.from(text).slice(0,401).join(''));
 assert.equal(one.textKind,'lossy-extracted-public-html');
 assert.equal(one.totalCharacters,Array.from(text).length);
 const last=slicePublishedText(text,{offset:one.totalCharacters-7,maxChars:300});
 assert.equal(last.nextOffset,null);
 assert.equal(Array.from(last.excerpt).length,7);
});

test('excerpt rejects unbounded or invalid ranges',()=>{
 for(const value of [-1,28001,1.5,'1'])assert.throws(
  ()=>slicePublishedText('good text',{offset:value}),RangeError);
 for(const value of [0,199,4001,'1000'])assert.throws(
  ()=>slicePublishedText('good text',{maxChars:value}),RangeError);
 assert.throws(()=>slicePublishedText('hello',{offset:5}),RangeError);
 assert.throws(()=>slicePublishedText('x'.repeat(28001)),TypeError);
});
