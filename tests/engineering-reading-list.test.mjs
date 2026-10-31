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
  replaceChildren(...children){this.children=children;}
 };
}
function setup({badFile=false,storageAccess=true}={}){
 const store=new Map(),writes=[];
 const storage={
  getItem(k){return store.get(k)??null;},
  setItem(k,v){writes.push(['set',k,v]);store.set(k,v);},
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
  'reading-list-clear':node('button')
 };
 elements['reading-list-panel'].hidden=true;
 elements['reading-list-clear'].hidden=true;
 const document={
  getElementById:id=>elements[id],
  querySelectorAll:q=>q==='[data-note-card]'?cards:[],
  createElement:tag=>node(tag)
 };
 let approve=true;
 const window={listeners:{},
  get localStorage(){
   if(!storageAccess)throw new TypeError('Storage denied');
   return storage;
  },
  confirm(){return approve;},
  addEventListener(name,fn){this.listeners[name]=fn;}
 };
 runInNewContext(source,{window,document},{timeout:1000});
 return {elements,cards,store,writes,storage,window,setApprove:v=>{approve=v;}};
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
