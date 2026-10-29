import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';

const read=name=>readFileSync(fileURLToPath(new URL('../site/engineering/'+name,import.meta.url)),'utf8');
const html=read('index.html'),style=read('notes.css'),code=read('search.js');

test('engineering archive publishes six crawlable cards and a progressive enhancement only',()=>{
 assert.match(html,/rel="canonical" href="https:\/\/24go\.top\/engineering\/"/);
 assert.match(html,/<script src="\.\/search\.js" defer><\/script>/);
 assert.match(html,/<form class="note-search" role="search"[^>]+hidden>/);
 assert.match(html,/aria-label="Find engineering notes"/);
 assert.match(html,/<label for="engineering-filter">Find a technical article<\/label>/);
 assert.match(html,/aria-controls="engineering-list"/);
 assert.match(html,/id="engineering-search-status" role="status" aria-live="polite"/);
 assert.match(html,/id="engineering-no-results" hidden/);
 assert.equal((html.match(/<article class="card" data-note-card>/g)||[]).length,6);
 assert.match(html,/<aside class="card">/);
 assert.doesNotMatch(html,/PUBLISH_API_KEY|sb_secret_|service_role|public registration is open/i);
 assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML|eval\s*\(/);
 assert.match(style,/\.card\[hidden\]\{display:none\}/);
 assert.match(style,/@media\(prefers-color-scheme:light\)/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
});
function setUp({missing=false}={}){
 const listeners={},status={textContent:''},empty={hidden:true},
  form={hidden:true,addEventListener(name,fn){listeners['form-'+name]=fn;}};
 const input={value:'',addEventListener(name,fn){listeners[name]=fn;}};
 const cards=[
  {textContent:'Security | Prevent JavaScript SDK API key leaks',hidden:false},
  {textContent:'SEO | Technical publishing and search discovery',hidden:false},
  {textContent:'Database | PostgreSQL permissions',hidden:false}
 ];
 const document={
  querySelector(s){assert.equal(s,'[data-engineering-search]');return missing?null:form;},
  querySelectorAll(s){assert.equal(s,'[data-note-card]');return cards;},
  getElementById(id){return ({'engineering-filter':input,'engineering-search-status':status,'engineering-no-results':empty})[id];}
 };
 runInNewContext(code,{document},{timeout:1000});
 return {form,input,status,empty,cards,listeners};
}
test('filter searches real card text without network, safely reports counts and resets',()=>{
 const app=setUp();
 assert.equal(app.form.hidden,false);
 assert.equal(app.status.textContent,'3 of 3 articles');
 app.input.value='  postgres  ';
 app.listeners.input();
 assert.deepEqual(app.cards.map(x=>x.hidden),[true,true,false]);
 assert.equal(app.status.textContent,'1 of 3 articles');
 app.input.value='nonexistent';
 app.listeners.input();
 assert.equal(app.status.textContent,'0 of 3 articles');
 assert.equal(app.empty.hidden,false);
 app.listeners.keydown({key:'Escape'});
 assert.equal(app.input.value,'');
 assert.equal(app.empty.hidden,true);
 assert.ok(app.cards.every(x=>!x.hidden));
 let prevented=false;
 app.listeners['form-submit']({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
});
test('archive remains statically readable when enhancement cannot initialize',()=>{
 const app=setUp({missing:true});
 assert.equal(app.form.hidden,true);
 assert.ok(app.cards.every(card=>!card.hidden));
});
