import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';

const read=name=>readFileSync(fileURLToPath(
  new URL('../site/engineering/'+name,import.meta.url)),'utf8');
const html=read('index.html'),style=read('notes.css'),code=read('search.js');
const topicNames=['all','security','writing','infrastructure','publishing','discovery'];
const cardTopics=['security','writing','infrastructure','security','security','discovery',
  'infrastructure','publishing','writing','publishing'];

test('archive publishes 10 crawlable articles, discoverable topic controls and a JS-only enhancement',()=>{
 assert.match(html,/rel="canonical" href="https:\/\/24go\.top\/engineering\/"/);
 assert.match(html,/<script src="\.\/search\.js" defer><\/script>/);
 assert.match(html,/<form class="note-search" role="search"[^>]+hidden>/);
 assert.match(html,/aria-label="Find engineering notes"/);
 assert.match(html,/<label for="engineering-filter">Find a technical article<\/label>/);
 assert.match(html,/aria-controls="engineering-list"/);
 assert.match(html,/id="engineering-search-status" role="status" aria-live="polite"/);
 assert.match(html,/id="engineering-index-status" role="status" aria-live="polite"/);
 assert.match(html,/id="engineering-index-retry" hidden/);
 assert.match(style,/\.note-search__index-state/);
 assert.match(html,/id="engineering-no-results" hidden/);
 assert.match(html,/type="button" id="engineering-reset" hidden/);
 assert.match(html,/id="engineering-share" hidden/);
 assert.match(html,/id="engineering-share-status" role="status" aria-live="polite"/);
 assert.match(html,/id="engineering-copy-results" hidden/);
 assert.match(html,/id="engineering-manual-copy"[^>]+readonly[^>]+hidden/);
 assert.match(style,/\.note-search__manual-copy\[hidden\]\{display:none\}/);
 assert.match(style,/\.note-search__share\[hidden\]\{display:none\}/);
 const tags=[...html.matchAll(/<article class="card" data-note-card data-note-topic="([^"]+)" data-note-file="[a-z0-9-]+\.html">/g)];
 assert.deepEqual(tags.map(x=>x[1]),cardTopics);
 assert.match(html,/<aside class="card">/);
 assert.deepEqual([...html.matchAll(/data-engineering-topic="([^"]+)" aria-pressed="(?:true|false)"/g)]
   .map(x=>x[1]),topicNames);
 assert.doesNotMatch(html,/PUBLISH_API_KEY|sb_secret_|service_role|public registration is open/i);
 assert.match(code,/fetch\('\.\/search-index\.json'/);
 assert.doesNotMatch(code,/XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML|eval\s*\(/);
 assert.match(style,/\.card\[hidden\]\{display:none\}/);
 assert.match(style,/\.note-topics button\[aria-pressed="true"\]/);
 assert.match(style,/\.note-topics button:focus-visible/);
 assert.match(style,/@media\(prefers-color-scheme:light\)/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
});
function button(topic){
 const listeners={};
 return {
  dataset:{engineeringTopic:topic},attributes:{},
  listeners,addEventListener(name,fn){listeners[name]=fn;},
  setAttribute(name,value){this.attributes[name]=value;}
 };
}
function setUp({missing=false,badTopic=false,query='',clipboard='ok',index='none'}={}){
 const listeners={},status={textContent:''},empty={hidden:true},
  reset={hidden:true,focused:false,addEventListener(name,fn){listeners['reset-'+name]=fn;}};
 const share={hidden:true,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}};
 const shareStatus={textContent:''};
 const manualCopy={value:'',hidden:true,focused:false,selected:false,
  focus(){this.focused=true;},select(){this.selected=true;}};
 const indexStatus={textContent:''};
 const retryIndex={hidden:true,disabled:false,listeners:{},
  addEventListener(name,fn){this.listeners[name]=fn;}};
 const copyResults={hidden:true,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}};
 const form={hidden:true,addEventListener(name,fn){listeners['form-'+name]=fn;}};
 const input={value:'',focused:false,addEventListener(name,fn){listeners[name]=fn;},
   focus(){this.focused=true;}};
 const topics=topicNames.map(button);
 const cards=[
  {textContent:'Security | Prevent JavaScript SDK API key leaks',dataset:{noteTopic:'security',noteFile:'security.html'},hidden:false},
  {textContent:'SEO | Technical publishing and search discovery',dataset:{noteTopic:'discovery',noteFile:'discovery.html'},hidden:false},
  {textContent:'Database | PostgreSQL permissions',dataset:{noteTopic:badTopic?'other':'infrastructure',noteFile:'database.html'},hidden:false}
 ];
 for(const card of cards){
  card.children=[];
  card.append=function(child){this.children.push(child);};
 }
 const document={
  createElement(tag){
   assert.equal(tag,'p','excerpts are inert paragraph text, never parsed HTML');
   return {tagName:'P',className:'',textContent:'',hidden:true,
    attributes:{},setAttribute(key,value){this.attributes[key]=value;}};
  },
  querySelector(s){assert.equal(s,'[data-engineering-search]');return missing?null:form;},
  querySelectorAll(s){
   if(s==='[data-note-card]')return cards;
   assert.equal(s,'[data-engineering-topic]');return topics;
  },
  getElementById(id){return ({
   'engineering-filter':input,'engineering-search-status':status,
   'engineering-no-results':empty,'engineering-reset':reset,
   'engineering-share':share,'engineering-share-status':shareStatus,
   'engineering-copy-results':copyResults,
   'engineering-manual-copy':manualCopy,
   'engineering-index-status':indexStatus,
   'engineering-index-retry':retryIndex})[id];}
 };
 const copied=[];
 const location={href:'https://24go.top/engineering/'+query};
 const window={location,listeners:{},history:{
  replaceState(_state,_title,url){location.href=new URL(url,location.href).href;}
 },addEventListener(name,callback){this.listeners[name]=callback;}};
 let rejectPending;
 const navigator=clipboard==='none'?{}:{clipboard:{async writeText(value){
  if(clipboard==='fail')throw Error('clipboard unavailable');
  if(clipboard==='pending')return new Promise((_resolve,reject)=>{
   rejectPending=reject;
  });
  copied.push(value);
 }}};
 const fetchCalls=[];
 const staticData={version:1,articles:[
  {file:'security.html',text:index==='html'
   ?'Security details include <img src=x onerror=alert(1)> without execution'
   :'Security details and a hidden circuit breaker'},
  {file:'discovery.html',text:'Specific crawler indexing mechanisms'},
  {file:'database.html',text:'Role permissions and a unique isolation mechanism'}
 ]};
 const indexFetch=async(url,options)=>{
  fetchCalls.push({url,options});
  if(index==='fail')throw Error('offline');
  if(index==='recover'&&fetchCalls.length===1)throw Error('temporary outage');
  if(index==='badUtf8')return new Response(new Uint8Array([
    0x7b,0x22,0x62,0x61,0x64,0x22,0x3a,0x22,0xc3,0x28,0x22,0x7d]));
  if(index==='large'){
    const stream=new ReadableStream({
      start(controller){controller.enqueue(new Uint8Array(262144));controller.enqueue(new Uint8Array(262145));},
      cancel(){fetchCalls.cancelled=true;}
    });
    return new Response(stream);
  }
  if(index==='manyChunks'){
    const stream=new ReadableStream({
      start(controller){for(let i=0;i<520;i++)controller.enqueue(new Uint8Array(0));},
      cancel(){fetchCalls.cancelled=true;}
    });
    return new Response(stream);
  }
  if(index==='headerLarge')return new Response('{}',
    {headers:{'content-length':'999999'}});
  const value=index==='corrupt'?{version:1,articles:[]}:staticData;
  return new Response(JSON.stringify(value),{
    status:200,headers:{'content-type':'application/json'}});
 };
 runInNewContext(code,{document,window,navigator,URL,TextDecoder,AbortSignal,
  ...(index==='none'?{}:{fetch:indexFetch})},{timeout:1000});
 return {form,input,status,empty,reset,share,copyResults,shareStatus,manualCopy,indexStatus,retryIndex,cards,topics,listeners,window,location,copied,fetchCalls,
  rejectPending:()=>rejectPending(new Error('Clipboard blocked')),
  clickTopic:t=>topics.find(x=>x.dataset.engineeringTopic===t).listeners.click()};
}
test('search works with all topics and Escape clears only query',()=>{
 const app=setUp();
 assert.equal(app.form.hidden,false);
 assert.equal(app.status.textContent,'3 of 3 articles');
 app.input.value='  postgres  ';
 app.listeners.input();
 assert.deepEqual(app.cards.map(x=>x.hidden),[true,true,false]);
 assert.equal(app.status.textContent,'1 of 3 articles');
 assert.equal(app.reset.hidden,false);
 app.input.value='nonexistent';
 app.listeners.input();
 assert.equal(app.status.textContent,'0 of 3 articles');
 assert.equal(app.empty.hidden,false);
 app.listeners.keydown({key:'Escape'});
 assert.equal(app.input.value,'');
 assert.ok(app.cards.every(x=>!x.hidden));
 let prevented=false;
 app.listeners['form-submit']({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
});
test('topic chips combine with text, announce live count and expose pressed state',()=>{
 const app=setUp();
 app.clickTopic('security');
 assert.deepEqual(app.cards.map(x=>x.hidden),[false,true,true]);
 assert.equal(app.status.textContent,'1 of 3 articles');
 assert.equal(app.reset.hidden,false);
 assert.deepEqual(app.topics.map(x=>x.attributes['aria-pressed']),
  ['false','true','false','false','false','false']);
 app.input.value='PostgreSQL';app.listeners.input();
 assert.equal(app.status.textContent,'0 of 3 articles');
 assert.equal(app.empty.hidden,false);
 app.listeners.keydown({key:'Escape'});
 assert.equal(app.status.textContent,'1 of 3 articles',
  'Escape clears text but preserves selected topic');
 app.listeners['reset-click']();
 assert.equal(app.input.value,'');
 assert.ok(app.input.focused,'focus returns to search after Reset');
 assert.ok(app.cards.every(x=>!x.hidden));
 assert.equal(app.status.textContent,'3 of 3 articles');
 assert.equal(app.reset.hidden,true);
 assert.equal(app.topics[0].attributes['aria-pressed'],'true');
});
test('archive remains static and readable on startup failure or JS disabled',()=>{
 for(const options of [{missing:true},{badTopic:true}]){
  const app=setUp(options);
  assert.equal(app.form.hidden,true);
  assert.ok(app.cards.every(card=>!card.hidden));
 }
});

test('opening a shared URL restores bounded query and allowed topic without running a request',()=>{
 const app=setUp({query:'?q=postgreSQL&topic=infrastructure'});
 assert.equal(app.form.hidden,false);
 assert.equal(app.input.value,'postgreSQL');
 assert.deepEqual(app.cards.map(x=>x.hidden),[true,true,false]);
 assert.equal(app.status.textContent,'1 of 3 articles');
 assert.equal(app.share.hidden,false);
 assert.equal(app.topics[3].attributes['aria-pressed'],'true');
});

test('filter edits update a bookmarkable URL without adding history entries',()=>{
 const app=setUp({query:'?utm_campaign=foo#latest-heading'});
 app.clickTopic('security');
 assert.equal(app.location.href,'https://24go.top/engineering/?topic=security#latest-heading');
 app.input.value='javascript sdk';app.listeners.input();
 assert.equal(app.location.href,
  'https://24go.top/engineering/?q=javascript+sdk&topic=security#latest-heading');
 assert.equal(app.share.hidden,false);
 app.listeners.keydown({key:'Escape'});
 assert.equal(app.location.href,'https://24go.top/engineering/?topic=security#latest-heading');
 app.listeners['reset-click']();
 assert.equal(app.location.href,'https://24go.top/engineering/#latest-heading');
 assert.equal(app.share.hidden,true);
});

test('untrusted deep links never select unknown categories or inject HTML',()=>{
 for(const query of [
  '?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E&topic=__proto__',
  '?topic=../../security',
  '?q='+encodeURIComponent('x'.repeat(500))+'&topic=constructor',
  '?topic=SECURITY'
 ]){
  const app=setUp({query});
  assert.equal(app.topics[0].attributes['aria-pressed'],'true');
  assert.ok(app.input.value.length<=80);
  assert.ok(app.cards.every(card=>typeof card.hidden==='boolean'));
  assert.equal(app.form.hidden,false);
 }
});

test('copy filtered link is explicit, accessible and gracefully handles denied clipboard',async()=>{
 const app=setUp({query:'?topic=security&q=api'});
 await app.share.listeners.click();
 assert.deepEqual(app.copied,['https://24go.top/engineering/?q=api&topic=security']);
 assert.equal(app.shareStatus.textContent,'Filtered article link copied.');
 const denied=setUp({query:'?topic=security',clipboard:'fail'});
 await denied.share.listeners.click();
 assert.match(denied.shareStatus.textContent,/Clipboard unavailable/);
 const missing=setUp({query:'?topic=security',clipboard:'none'});
 await missing.share.listeners.click();
 assert.match(missing.shareStatus.textContent,/address bar/);
});

test('copy denied clipboard exposes selectable canonical URL',async()=>{
 const app=setUp({query:'?topic=security&q=api',clipboard:'fail'});
 await app.share.listeners.click();
 assert.equal(app.manualCopy.hidden,false);
 assert.equal(app.manualCopy.value,'https://24go.top/engineering/?q=api&topic=security');
 assert.equal(app.manualCopy.focused,true);
 assert.equal(app.manualCopy.selected,true);
 assert.deepEqual(app.copied,[]);
});
test('missing clipboard displays manually copyable Markdown links',async()=>{
 const app=setUp({clipboard:'none',query:'?topic=security'});
 await app.copyResults.listeners.click();
 assert.equal(app.manualCopy.hidden,false);
 assert.equal(app.manualCopy.value,
  '- [security](https://24go.top/engineering/security.html)');
 assert.equal(app.manualCopy.selected,true);
});
test('manual copy is cleared after filter changes',async()=>{
 const a=setUp({query:'?topic=security',clipboard:'fail'});
 await a.share.listeners.click();
 assert.equal(a.manualCopy.hidden,false);
 a.input.value='postgres';a.listeners.input();
 assert.equal(a.manualCopy.hidden,true);
 assert.equal(a.manualCopy.value,'');
 await a.share.listeners.click();
 a.clickTopic('infrastructure');
 assert.equal(a.manualCopy.hidden,true);
 a.location.href='https://24go.top/engineering/?topic=security';
 a.window.listeners.popstate();
 assert.equal(a.manualCopy.value,'');
});
test('deferred clipboard refusal cannot reopen stale filtered URLs',async()=>{
 const app=setUp({clipboard:'pending',query:'?topic=security'});
 const writing=app.copyResults.listeners.click();
 app.clickTopic('discovery');
 app.rejectPending();
 await writing;
 assert.equal(app.manualCopy.hidden,true);
 assert.equal(app.manualCopy.value,'');
 assert.equal(app.copied.length,0);
});
test('browser navigation restores the URL state without altering article data',()=>{
 const app=setUp({query:'?topic=security'});
 app.location.href='https://24go.top/engineering/?q=PostgreSQL&topic=infrastructure';
 app.window.listeners.popstate();
 assert.equal(app.input.value,'PostgreSQL');
 assert.deepEqual(app.cards.map(x=>x.hidden),[true,true,false]);
 assert.equal(app.status.textContent,'1 of 3 articles');
});


test('public archive has navigable heading hierarchy for all ten searchable articles',()=>{
 assert.match(html,/<h1>Engineering notes<\/h1>/);
 assert.match(html,/<section aria-labelledby="latest-heading"><h2 id="latest-heading">Recent articles<\/h2>/);
 const cards=[...html.matchAll(/<article class="card" data-note-card data-note-topic="[^"]+" data-note-file="[a-z0-9-]+\.html">([\s\S]*?)<\/article>/g)];
 assert.equal(cards.length,10,'all ten article cards retain their searchable data fields');
 for(const card of cards){
  assert.match(card[1],/<h3><a href="\.\/[^"]+\.html">[^<]+<\/a><\/h3>/);
  assert.doesNotMatch(card[1],/<h2\b|<h4\b/);
 }
 assert.match(html,/<aside class="card">[\s\S]*?<h3>Help us make this useful<\/h3>/);
 assert.doesNotMatch(html,/<aside class="card">[\s\S]*?<h2>Help us make this useful<\/h2>/);
 assert.match(html,/<section class="topic-index" aria-labelledby="topics-heading">\s*<h2 id="topics-heading">Choose a technical reading path<\/h2>/);
 assert.equal((html.match(/<h2\b/g)||[]).length,3,
  'reading paths, local agent integration and recent articles each need a semantic level-two heading');
 assert.match(html,/<section class="agent-discovery" aria-labelledby="agent-discovery-heading">\s*<h2 id="agent-discovery-heading">Read these articles with an AI agent<\/h2>/);
 assert.match(style,/\.card h2,\.card h3\{font-size:21px;margin:7px 0\}/,
  'corrected heading levels must preserve previously reviewed card typography');
});

test('full-text search finds article-body terms missing from card titles and summaries',async()=>{
 const app=setUp({index:'good',query:'?q=circuit%20breaker'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(app.fetchCalls.map(x=>x.url),['./search-index.json']);
 assert.equal(app.fetchCalls[0].options.credentials,'omit');
 assert.equal(app.fetchCalls[0].options.referrerPolicy,'no-referrer');
 assert.equal(app.fetchCalls[0].options.redirect,'error');
 assert.equal(app.fetchCalls[0].options.signal.aborted,false);
 assert.deepEqual(app.cards.map(c=>c.hidden),[false,true,true]);
 assert.equal(app.status.textContent,'1 of 3 articles');
 app.clickTopic('discovery');
 assert.deepEqual(app.cards.map(c=>c.hidden),[true,true,true]);
 app.input.value='crawler indexing';
 app.listeners.input();
 assert.deepEqual(app.cards.map(c=>c.hidden),[true,false,true]);
});

test('offline or malformed and oversized static indexes fall back to card-only search',async()=>{
 for(const index of ['fail','corrupt','badUtf8','large','manyChunks','headerLarge']){
  const app=setUp({index,query:'?q=JavaScript'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(app.form.hidden,false);
  assert.deepEqual(app.cards.map(c=>c.hidden),[false,true,true]);
  app.input.value='circuit breaker';
  app.listeners.input();
  assert.deepEqual(app.cards.map(c=>c.hidden),[true,true,true]);
  if(index==='large'||index==='manyChunks')
   assert.equal(app.fetchCalls.cancelled,true,'reject before reading the whole index');
 }
});


test('full-text search reports actual readiness separately from article result count',async()=>{
 const app=setUp({index:'good',query:'?q=circuit%20breaker'});
 assert.match(app.indexStatus.textContent,/titles and summaries while full-text search loads/);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(app.status.textContent,'1 of 3 articles');
 assert.equal(app.indexStatus.textContent,'Full article text is searchable.');
 assert.equal(app.retryIndex.hidden,true);
 const noFetch=setUp({index:'none'});
 assert.match(noFetch.indexStatus.textContent,/Only titles and summaries/);
 assert.equal(noFetch.retryIndex.hidden,true);
});

test('a failed full-text index can be retried explicitly without losing the query or topic',async()=>{
 const app=setUp({index:'recover',query:'?q=circuit%20security&topic=security'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(app.indexStatus.textContent,/Full-text search unavailable/);
 assert.equal(app.retryIndex.hidden,false);
 assert.deepEqual(app.cards.map(c=>c.hidden),[true,true,true]);
 assert.equal(app.status.textContent,'0 of 3 articles');
 assert.equal(app.input.value,'circuit security');
 const originalUrl=app.location.href;
 await app.retryIndex.listeners.click();
 assert.equal(app.indexStatus.textContent,'Full article text is searchable.');
 assert.equal(app.retryIndex.hidden,true);
 assert.equal(app.retryIndex.disabled,false);
 assert.deepEqual(app.cards.map(c=>c.hidden),[false,true,true]);
 assert.equal(app.status.textContent,'1 of 3 articles');
 assert.equal(app.location.href,originalUrl);
 assert.deepEqual(app.fetchCalls.map(c=>c.url),['./search-index.json','./search-index.json']);
 for(const call of app.fetchCalls){
  assert.equal(call.options.credentials,'omit');
  assert.equal(call.options.redirect,'error');
  assert.equal(call.options.referrerPolicy,'no-referrer');
 }
});

test('retry remains explicit and never hides crawlable article cards after repeated failures',async()=>{
 const app=setUp({index:'fail',query:'?q=JavaScript&topic=security'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(app.retryIndex.hidden,false);
 await app.retryIndex.listeners.click();
 assert.match(app.indexStatus.textContent,/Only titles and summaries/);
 assert.equal(app.retryIndex.hidden,false);
 assert.equal(app.input.value,'JavaScript');
 assert.deepEqual(app.cards.map(c=>c.hidden),[false,true,true]);
 assert.equal(app.fetchCalls.length,2);
 assert.equal(app.form.hidden,false);
});

test('multi-word queries match across card fields even when terms are nonadjacent',()=>{
 const app=setUp({query:'?q=leaks%20security'});
 assert.deepEqual(app.cards.map(x=>x.hidden),[false,true,true],
  'search must find unordered security and leaks terms on the same card');
 assert.equal(app.status.textContent,'1 of 3 articles');
 app.input.value='security postgres';
 app.listeners.input();
 assert.ok(app.cards.every(x=>x.hidden),
  'words must all match one document, not be ORed across documents');
});

test('all-word search spans trusted card and indexed body, respects topic and bookmark URL',async()=>{
 const app=setUp({index:'good',query:'?q=circuit%20security'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(app.cards.map(x=>x.hidden),[false,true,true],
  'title word and full-text body word must combine');
 app.input.value='mechanisms crawler';
 app.listeners.input();
 assert.deepEqual(app.cards.map(x=>x.hidden),[true,false,true],
  'full-text multi-word order is independent');
 assert.equal(app.location.href,
  'https://24go.top/engineering/?q=mechanisms+crawler');
 app.clickTopic('security');
 assert.ok(app.cards.every(x=>x.hidden),'topic must still constrain every word');
 app.input.value='Security leaks';
 app.listeners.input();
 assert.deepEqual(app.cards.map(x=>x.hidden),[false,true,true]);
});

test('matched article excerpts explain full-text results without editing original cards',async()=>{
 const app=setUp({index:'good',query:'?q=circuit'});
 assert.ok(app.cards.every(c=>c.children.length===0),
  'no excerpt or DOM changes before static index is ready');
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(app.cards.map(c=>c.hidden),[false,true,true]);
 assert.equal(app.cards[0].children.length,1);
 const excerpt=app.cards[0].children[0];
 assert.equal(excerpt.tagName,'P');
 assert.equal(excerpt.className,'note-search__excerpt');
 assert.equal(excerpt.attributes['aria-label'],
  'Excerpt from matched published article text');
 assert.match(excerpt.textContent,/In article:.*circuit breaker/);
 assert.equal(excerpt.hidden,false);
 assert.equal(app.cards[0].textContent,'Security | Prevent JavaScript SDK API key leaks');
 assert.deepEqual(app.fetchCalls.map(x=>x.url),['./search-index.json']);
 app.input.value='does-not-exist';app.listeners.input();
 assert.equal(excerpt.hidden,true);
 assert.equal(excerpt.textContent,'','stale excerpt never remains copyable');
 app.input.value='circuit';app.listeners.input();
 assert.equal(excerpt.hidden,false);
 assert.equal(app.cards[0].children.length,1,'repeated searches reuse the paragraph');
 app.listeners['reset-click']();
 assert.equal(excerpt.hidden,true);
 assert.equal(excerpt.textContent,'');
});

test('full-text snippets remain literal text even when indexed text contains HTML-like tokens',async()=>{
 const app=setUp({index:'html',query:'?q=onerror'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(app.cards[0].hidden,false);
 assert.equal(app.cards[0].children.length,1);
 const snippet=app.cards[0].children[0];
 assert.match(snippet.textContent,/<img src=x onerror=alert\(1\)>/);
 assert.equal(snippet.tagName,'P');
 assert.deepEqual(Object.keys(snippet.attributes),['aria-label']);
 assert.doesNotMatch(code,/innerHTML|insertAdjacentHTML|DOMParser|createRange\(/);
 assert.equal(app.fetchCalls.length,1,'only reviewed static corpus was fetched');
});

test('index unavailable never displays misleading excerpts, and topic filters hide them',async()=>{
 for(const index of ['fail','badUtf8','corrupt','large']){
  const app=setUp({index,query:'?q=circuit'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(app.indexStatus.textContent.includes('Full-text search unavailable'),true);
  assert.ok(app.cards.every(c=>c.children.length===0));
  assert.ok(app.cards.every(c=>c.hidden));
 }
 const recovered=setUp({index:'good',query:'?q=circuit'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(recovered.cards[0].children[0].hidden,false);
 recovered.clickTopic('discovery');
 assert.equal(recovered.cards[0].children[0].hidden,true,
  'full-text snippet must not show for a topic-filtered-out card');
 recovered.clickTopic('security');
 assert.equal(recovered.cards[0].children[0].hidden,false);
});

test('public search snippets are bounded, source-only and do not require JavaScript to read articles',()=>{
 assert.match(code,/createElement\('p'\)/);
 assert.match(code,/el\.textContent='In article: '/);
 assert.match(code,/const end=Math\.min\(indexed\.length,first\+115\)/);
 assert.match(style,/\.note-search__excerpt\[hidden\]\{display:none\}/);
 assert.match(html,/<article class="card" data-note-card/);
 assert.doesNotMatch(code,/XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML|eval\s*\(/);
});

test('offline full-text fallback still applies all-word matching and preserves no-JS archive',async()=>{
 const app=setUp({index:'fail',query:'?q=security%20leaks'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(app.cards.map(x=>x.hidden),[false,true,true]);
 app.input.value='security circuit';
 app.listeners.input();
 assert.ok(app.cards.every(x=>x.hidden),'do not pretend an unavailable index contains text');
 assert.match(html,/Find articles containing all search words/);
 assert.match(code,/words\.every\(/);
 assert.doesNotMatch(code,/innerHTML|localStorage|sessionStorage|sendBeacon/);
});


test('post-deployment SEO smoke verifies the actual archive multi-word search release',()=>{
 const audit=readFileSync(new URL('../scripts/check-live-seo.sh',import.meta.url),'utf8');
 assert.match(audit,/probe '\/engineering\/search\.js' archive_search 'words\.every\(word=>entry\.searchable\.includes\(word\)'/);
 assert.match(audit,/Find articles containing all search words/);
 assert.match(audit,/Live article archive is missing the shipped multi-word search UI/);
 // Verify that feature assertions are backed by actual source.
 assert.match(code,/words\.every\(word=>entry\.searchable\.includes\(word\)/);
 assert.match(html,/Find articles containing all search words/);
});

test('copy visible public article references as Markdown without API credentials',async()=>{
 const app=setUp({query:'?q=PostgreSQL'});
 assert.equal(app.copyResults.hidden,false);
 await app.copyResults.listeners.click();
 assert.equal(app.copied.length,1);
 assert.match(app.copied[0],/^\- \[database\]\(https:\/\/24go\.top\/engineering\/database\.html\)$/);
 assert.doesNotMatch(app.copied[0],/secret|private|localhost|\/api\//);
 assert.match(app.shareStatus.textContent,/1 public article link/);
 const all=setUp();
 await all.copyResults.listeners.click();
 assert.equal(all.copied[0].split('\n').length,3);
 all.input.value='no results';
 all.listeners.input();
 assert.equal(all.copyResults.hidden,true);
});

test('reference export denies clipboard gracefully and does not unhide invalid corpus',async()=>{
 const denied=setUp({clipboard:'fail'});
 await denied.copyResults.listeners.click();
 assert.match(denied.shareStatus.textContent,/Clipboard unavailable/);
 const noApi=setUp({clipboard:'none'});
 await noApi.copyResults.listeners.click();
 assert.match(noApi.shareStatus.textContent,/Clipboard unavailable/);
 const invalid=setUp({badTopic:true});
 assert.equal(invalid.form.hidden,true);
 assert.equal(invalid.copyResults.hidden,true);
 assert.doesNotMatch(code,/localStorage|sessionStorage|XMLHttpRequest|sendBeacon|innerHTML/);
});
