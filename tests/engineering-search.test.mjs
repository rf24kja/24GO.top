import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';

const read=name=>readFileSync(fileURLToPath(
  new URL('../site/engineering/'+name,import.meta.url)),'utf8');
const html=read('index.html'),style=read('notes.css'),code=read('search.js');
const topicNames=['all','security','writing','infrastructure','publishing','discovery'];
const cardTopics=['writing','infrastructure','security','security','discovery',
  'infrastructure','publishing','writing','publishing'];

test('archive publishes 9 crawlable articles, discoverable topic controls and a JS-only enhancement',()=>{
 assert.match(html,/rel="canonical" href="https:\/\/24go\.top\/engineering\/"/);
 assert.match(html,/<script src="\.\/search\.js" defer><\/script>/);
 assert.match(html,/<form class="note-search" role="search"[^>]+hidden>/);
 assert.match(html,/aria-label="Find engineering notes"/);
 assert.match(html,/<label for="engineering-filter">Find a technical article<\/label>/);
 assert.match(html,/aria-controls="engineering-list"/);
 assert.match(html,/id="engineering-search-status" role="status" aria-live="polite"/);
 assert.match(html,/id="engineering-no-results" hidden/);
 assert.match(html,/type="button" id="engineering-reset" hidden/);
 assert.match(html,/id="engineering-share" hidden/);
 assert.match(html,/id="engineering-share-status" role="status" aria-live="polite"/);
 assert.match(style,/\.note-search__share\[hidden\]\{display:none\}/);
 const tags=[...html.matchAll(/<article class="card" data-note-card data-note-topic="([^"]+)">/g)];
 assert.deepEqual(tags.map(x=>x[1]),cardTopics);
 assert.match(html,/<aside class="card">/);
 assert.deepEqual([...html.matchAll(/data-engineering-topic="([^"]+)" aria-pressed="(?:true|false)"/g)]
   .map(x=>x[1]),topicNames);
 assert.doesNotMatch(html,/PUBLISH_API_KEY|sb_secret_|service_role|public registration is open/i);
 assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML|eval\s*\(/);
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
function setUp({missing=false,badTopic=false,query='',clipboard='ok'}={}){
 const listeners={},status={textContent:''},empty={hidden:true},
  reset={hidden:true,focused:false,addEventListener(name,fn){listeners['reset-'+name]=fn;}};
 const share={hidden:true,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}};
 const shareStatus={textContent:''};
 const form={hidden:true,addEventListener(name,fn){listeners['form-'+name]=fn;}};
 const input={value:'',focused:false,addEventListener(name,fn){listeners[name]=fn;},
   focus(){this.focused=true;}};
 const topics=topicNames.map(button);
 const cards=[
  {textContent:'Security | Prevent JavaScript SDK API key leaks',dataset:{noteTopic:'security'},hidden:false},
  {textContent:'SEO | Technical publishing and search discovery',dataset:{noteTopic:'discovery'},hidden:false},
  {textContent:'Database | PostgreSQL permissions',dataset:{noteTopic:badTopic?'other':'infrastructure'},hidden:false}
 ];
 const document={
  querySelector(s){assert.equal(s,'[data-engineering-search]');return missing?null:form;},
  querySelectorAll(s){
   if(s==='[data-note-card]')return cards;
   assert.equal(s,'[data-engineering-topic]');return topics;
  },
  getElementById(id){return ({
   'engineering-filter':input,'engineering-search-status':status,
   'engineering-no-results':empty,'engineering-reset':reset,
   'engineering-share':share,'engineering-share-status':shareStatus})[id];}
 };
 const copied=[];
 const location={href:'https://24go.top/engineering/'+query};
 const window={location,listeners:{},history:{
  replaceState(_state,_title,url){location.href=new URL(url,location.href).href;}
 },addEventListener(name,callback){this.listeners[name]=callback;}};
 const navigator=clipboard==='none'?{}:{clipboard:{async writeText(value){
  if(clipboard==='fail')throw Error('clipboard unavailable');
  copied.push(value);
 }}};
 runInNewContext(code,{document,window,navigator,URL},{timeout:1000});
 return {form,input,status,empty,reset,share,shareStatus,cards,topics,listeners,window,location,copied,
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

test('browser navigation restores the URL state without altering article data',()=>{
 const app=setUp({query:'?topic=security'});
 app.location.href='https://24go.top/engineering/?q=PostgreSQL&topic=infrastructure';
 app.window.listeners.popstate();
 assert.equal(app.input.value,'PostgreSQL');
 assert.deepEqual(app.cards.map(x=>x.hidden),[true,true,false]);
 assert.equal(app.status.textContent,'1 of 3 articles');
});
