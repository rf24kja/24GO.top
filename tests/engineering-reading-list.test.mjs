import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../site/engineering/reading-list.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../site/engineering/index.html',import.meta.url),'utf8');

function node(tag='div'){
 return {tag,textContent:'',hidden:false,children:[],attributes:{},listeners:{},
  setAttribute(name,value){this.attributes[name]=value;},
  getAttribute(name){return this.attributes[name]??null;},
  addEventListener(name,fn){this.listeners[name]=fn;},
  append(...children){this.children.push(...children);},
  replaceChildren(...children){this.children=children;},
  click(){this.clicked=true;},
  remove(){this.removed=true;}
 };
}
function setup({badFile=false,storageAccess=true,clipboardAccess=true,storageWritable=true}={}){
 const store=new Map(),writes=[];
 const storage={
  getItem(k){return store.get(k)??null;},
  setItem(k,v){if(!storageWritable)throw new Error('Storage denied');writes.push(['set',k,v]);store.set(k,v);},
  removeItem(k){writes.push(['remove',k]);store.delete(k);}
 };
 const anchors=['research-one.html','research-two.html'].map((file,i)=>({
  textContent:'Reviewed technical article '+(i+1),
  getAttribute(key){return key==='href'?'./'+file:null;}
 }));
 const cards=anchors.map((anchor,i)=>{
  const card=node('article');
  card.dataset={noteFile:badFile&&i===0?'../other.html':
    i===0?'research-one.html':'research-two.html'};
  card.querySelector=name=>name==='h3 a'?anchor:null;
  return card;
 });
 const elements={
  'reading-list-panel':node('section'),
  'reading-list-items':node('ul'),
  'reading-list-status':node('p'),
  'reading-list-clear':node('button'),
  'reading-list-filter':node('input'),
  'reading-list-filter-status':node('span'),
  'reading-list-feedback':node('p'),
  'reading-list-copy':node('button'),
  'reading-list-export':node('button'),
  'reading-list-import':node('button'),
  'reading-list-file':node('input')
 };
 elements['reading-list-panel'].hidden=true;
 elements['reading-list-clear'].hidden=true;
 const document={
  getElementById:id=>elements[id],
  querySelectorAll:q=>q==='[data-note-card]'?cards:[],
  createElement:tag=>node(tag)
 };
 let approve=true,confirmHook=null;
 const window={listeners:{},
  get localStorage(){
   if(!storageAccess)throw new TypeError('Storage denied');
   return storage;
  },
  confirm(){if(confirmHook)confirmHook();return approve;},
  addEventListener(name,fn){this.listeners[name]=fn;}
 };
 const clipboardWrites=[],downloads=[];
 const navigator=clipboardAccess?{clipboard:{async writeText(text){clipboardWrites.push(text);}}}:{};
 const blobUrls=new Map();
 const objectURL={
  createObjectURL(blob){const url='blob:mock:'+blobUrls.size;blobUrls.set(url,blob);return url;},
  revokeObjectURL(url){blobUrls.delete(url);}
 };
 const oldCreate=document.createElement;
 document.createElement=tag=>{
  const el=oldCreate(tag);
  if(tag==='a')el.click=()=>{el.clicked=true;downloads.push({...el,blob:blobUrls.get(el.href)});};
  return el;
 };
 document.body={append(){}};
 runInNewContext(source,{window,document,navigator,Blob,TextEncoder,TextDecoder,
  URL:objectURL,setTimeout:(callback)=>callback()},{timeout:1000});
 return {elements,cards,store,writes,storage,window,clipboardWrites,downloads,
  setApprove:v=>{approve=v;},setConfirmHook:fn=>{confirmHook=fn;}};
}
test('published archive exposes a progressive, explicitly local reader list',()=>{
 assert.match(html,/src="\.\/reading-list\.js" defer/);
 assert.match(html,/id="reading-list-panel"[^>]+hidden/);
 assert.match(html,/Only public article links are stored in this browser, unencrypted/);
 assert.doesNotMatch(source,/innerHTML|fetch\(|XMLHttpRequest|sendBeacon|eval\(/);
 const app=setup();
 assert.equal(app.elements['reading-list-panel'].hidden,false);
 assert.equal(app.cards[0].children.length,1);
 assert.equal(app.cards[1].children.length,1);
 assert.deepEqual(app.writes,[],'opening the page must not automatically persist anything');
 assert.equal(app.cards[0].children[0].attributes['aria-pressed'],'false');
});
test('save and remove actions persist only strict canonical public filenames',()=>{
 const app=setup();
 const first=app.cards[0].children[0];
 first.listeners.click();
 assert.deepEqual(JSON.parse(app.store.get('24gotop-public-reading-list-v1')),
  {version:1,files:['research-one.html']});
 assert.equal(first.attributes['aria-pressed'],'true');
 assert.equal(app.elements['reading-list-items'].children.length,1);
 const anchor=app.elements['reading-list-items'].children[0].children[0];
 assert.equal(anchor.href,'./research-one.html');
 assert.equal(anchor.textContent,'Reviewed technical article 1');
 first.listeners.click();
 assert.deepEqual(JSON.parse(app.store.get('24gotop-public-reading-list-v1')).files,[]);
 assert.equal(first.attributes['aria-pressed'],'false');
});

test('multi-tab storage notifications refresh the visible list without writing',()=>{
 const app=setup();
 const key='24gotop-public-reading-list-v1';
 app.store.set(key,JSON.stringify({version:1,files:['research-two.html']}));
 const before=app.writes.length;
 app.window.listeners.storage({key,storageArea:app.storage});
 assert.equal(app.writes.length,before);
 assert.equal(app.cards[1].children[0].attributes['aria-pressed'],'true');
 assert.equal(app.elements['reading-list-items'].children.length,1);
 app.window.listeners.storage({key:'unrelated',storageArea:app.storage});
 assert.equal(app.writes.length,before);
});
test('damaged or unknown stored links never become clickable',()=>{
 const app=setup();
 const key='24gotop-public-reading-list-v1';
 app.store.set(key,JSON.stringify({version:1,files:['not-approved.html']}));
 app.window.listeners.storage({key,storageArea:app.storage});
 assert.equal(app.elements['reading-list-items'].children.length,0);
 assert.equal(app.cards[0].children[0].disabled,true);
 assert.match(app.elements['reading-list-status'].textContent,/damaged or unavailable/);
 assert.equal(app.writes.length,0);
});
test('clearing saved links requires confirmation; denied clearing preserves them',()=>{
 const app=setup();
 const button=app.cards[0].children[0],clear=app.elements['reading-list-clear'];
 button.listeners.click();
 assert.equal(clear.hidden,false);
 app.setApprove(false);
 clear.listeners.click();
 assert.equal(JSON.parse(app.store.get('24gotop-public-reading-list-v1')).files.length,1);
 app.setApprove(true);
 clear.listeners.click();
 assert.equal(app.store.has('24gotop-public-reading-list-v1'),false);
 assert.equal(clear.hidden,true);
 assert.equal(app.elements['reading-list-items'].children.length,0);
});
test('no browser storage or unexpected article filename leaves static reading intact',()=>{
 for(const opts of [{storageAccess:false},{badFile:true}]){
  const app=setup(opts);
  assert.equal(app.elements['reading-list-panel'].hidden,true);
  assert.ok(app.cards.every(card=>card.children.length===0));
  assert.equal(app.writes.length,0);
 }
});
