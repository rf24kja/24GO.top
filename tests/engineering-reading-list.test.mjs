import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../site/engineering/reading-list.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../site/engineering/index.html',import.meta.url),'utf8');

function node(tag='div'){
 return {tag,value:'',textContent:'',hidden:false,children:[],attributes:{},listeners:{},
  setAttribute(name,value){this.attributes[name]=value;},
  getAttribute(name){return this.attributes[name]??null;},
  addEventListener(name,fn){this.listeners[name]=fn;},
  append(...children){this.children.push(...children);},
  replaceChildren(...children){this.children=children;},
  querySelectorAll(selector){
   if(selector!=='.reading-list__remove')return [];
   return this.children.flatMap(item=>(item.children||[])
    .filter(child=>child.className==='reading-list__remove'));
  },
  click(){this.clicked=true;},
  focus(){this.focused=true;},
  select(){this.selected=true;},
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
  'reading-list-heading':node('h3'),
  'reading-list-items':node('ul'),
  'reading-list-status':node('p'),
  'reading-list-clear':node('button'),
  'reading-list-filter':node('input'),
  'reading-list-filter-status':node('span'),
  'reading-list-feedback':node('p'),
  'reading-list-copy':node('button'),
  'reading-list-manual-copy':node('textarea'),
  'reading-list-export':node('button'),
  'reading-list-import':node('button'),
  'reading-list-file':node('input')
 };
 elements['reading-list-panel'].hidden=true;
 elements['reading-list-clear'].hidden=true;
 elements['reading-list-manual-copy'].hidden=true;
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
 let rejectPendingClipboard;
 const navigator=clipboardAccess?{clipboard:{writeText(text){
  if(clipboardAccess==='reject')return Promise.reject(new Error('Clipboard denied'));
  if(clipboardAccess==='pending')return new Promise((_resolve,reject)=>{
   rejectPendingClipboard=reject;
  });
  clipboardWrites.push(text);
  return Promise.resolve();
 }}}:{};
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
  rejectPendingClipboard:()=>rejectPendingClipboard(new Error('Clipboard denied')),
  setApprove:v=>{approve=v;},setConfirmHook:fn=>{confirmHook=fn;}};
}
test('published archive exposes a progressive, explicitly local reader list',()=>{
 assert.match(html,/src="\.\/reading-list\.js" defer/);
 assert.match(html,/id="reading-list-panel"[^>]+hidden/);
 assert.match(html,/id="reading-list-heading" tabindex="-1"/);
 assert.match(html,/id="reading-list-filter-status"[^>]*role="status" aria-live="polite"/);
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
 assert.equal(app.elements['reading-list-heading'].focused,true,
  'clearing a hidden button must restore keyboard focus to the list heading');
});
test('no browser storage or unexpected article filename leaves static reading intact',()=>{
 for(const opts of [{storageAccess:false},{badFile:true}]){
  const app=setup(opts);
  assert.equal(app.elements['reading-list-panel'].hidden,true);
  assert.ok(app.cards.every(card=>card.children.length===0));
  assert.equal(app.writes.length,0);
 }
});


test('saved-title search filters only reader library and never changes public article cards',()=>{
 const app=setup();
 app.cards[0].children[0].listeners.click();
 app.cards[1].children[0].listeners.click();
 const input=app.elements['reading-list-filter'];
 input.value='TECHNICAL ARTICLE 2';
 input.listeners.input();
 assert.equal(app.elements['reading-list-items'].children.length,1);
 assert.equal(app.elements['reading-list-items'].children[0].children[0].href,'./research-two.html');
 assert.equal(app.elements['reading-list-filter-status'].textContent,'1 of 2 saved links shown.');
 assert.equal(app.cards[0].hidden,false);
 assert.equal(app.cards[1].hidden,false);
 assert.equal(app.elements['reading-list-copy'].disabled,false);
 input.value='no matching article';
 input.listeners.input();
 assert.equal(app.elements['reading-list-items'].children.length,0);
 assert.equal(app.elements['reading-list-copy'].disabled,true);
 assert.equal(JSON.parse(app.store.get('24gotop-public-reading-list-v1')).files.length,2,
  'filtering does not persist or delete saved links');
});

test('row removal keeps remaining bookmarks without clearing the entire reading list',()=>{
 const app=setup();
 app.cards[0].children[0].listeners.click();
 app.cards[1].children[0].listeners.click();
 const entry=app.elements['reading-list-items'].children[0];
 assert.equal(entry.children[1].textContent,'Remove');
 entry.children[1].listeners.click();
 assert.deepEqual(JSON.parse(app.store.get('24gotop-public-reading-list-v1')).files,
  ['research-two.html']);
 assert.equal(app.elements['reading-list-items'].children.length,1);
 assert.equal(app.cards[0].children[0].attributes['aria-pressed'],'false');
 assert.equal(app.elements['reading-list-items'].children[0].children[1].focused,true,
  'keyboard focus moves to next saved entry after removing a row');
 app.elements['reading-list-items'].children[0].children[1].listeners.click();
 assert.equal(app.elements['reading-list-heading'].focused,true,
  'last removal moves focus to stable section heading');
});

test('copy visible saved links produces canonical Markdown only after a click',async()=>{
 const app=setup();
 assert.deepEqual(app.clipboardWrites,[]);
 app.cards[0].children[0].listeners.click();
 app.cards[1].children[0].listeners.click();
 const input=app.elements['reading-list-filter'];
 input.value='article 1';
 input.listeners.input();
 await app.elements['reading-list-copy'].listeners.click();
 assert.equal(app.clipboardWrites.length,1);
 assert.equal(app.clipboardWrites[0],
  '- [Reviewed technical article 1](https://24go.top/engineering/research-one.html)');
 assert.equal(app.clipboardWrites[0].includes('research-two.html'),false);
 const denied=setup({clipboardAccess:false});
 denied.cards[0].children[0].listeners.click();
 await denied.elements['reading-list-copy'].listeners.click();
 assert.match(denied.elements['reading-list-feedback'].textContent,/Clipboard unavailable/);
 assert.equal(denied.elements['reading-list-manual-copy'].hidden,false);
 assert.equal(denied.elements['reading-list-manual-copy'].selected,true);
 assert.equal(denied.elements['reading-list-manual-copy'].focused,true);
 assert.equal(denied.elements['reading-list-manual-copy'].value,
  '- [Reviewed technical article 1](https://24go.top/engineering/research-one.html)');
});

test('JSON backup export is opt-in, versioned and contains only public article filenames',async()=>{
 const app=setup();
 assert.deepEqual(app.downloads,[]);
 assert.equal(app.elements['reading-list-export'].disabled,true);
 app.cards[0].children[0].listeners.click();
 app.elements['reading-list-export'].listeners.click();
 assert.equal(app.downloads.length,1);
 const downloaded=app.downloads[0];
 assert.equal(downloaded.download,'24gotop-public-reading-list.json');
 const payload=JSON.parse(await downloaded.blob.text());
 assert.deepEqual(payload,{
  kind:'24gotop-public-reading-list-backup',
  version:1,
  files:['research-one.html']
 });
 assert.equal(app.writes.filter(x=>x[0]==='set').length,1,
  'export must not write any new browser preference');
});

test('restore merges into newest list only after confirmation, never clobbering a second tab',async()=>{
 const app=setup();
 const input=app.elements['reading-list-file'];
 const key='24gotop-public-reading-list-v1';
 const backup=JSON.stringify({kind:'24gotop-public-reading-list-backup',
  version:1,files:['research-one.html']});
 const bytes=new TextEncoder().encode(backup);
 input.files=[{name:'saved-links.json',size:bytes.length,async arrayBuffer(){return bytes.buffer;}}];
 app.setConfirmHook(()=>app.store.set(key,JSON.stringify({
  version:1,files:['research-two.html']
 })));
 await input.listeners.change();
 assert.deepEqual(JSON.parse(app.store.get(key)).files,
  ['research-two.html','research-one.html']);
 assert.equal(input.value,'');
 assert.equal(app.elements['reading-list-items'].children.length,2);
 assert.match(app.elements['reading-list-feedback'].textContent,/Imported public links/);
});

test('cancelled or invalid JSON backup never mutates the current saved list',async()=>{
 const app=setup(),input=app.elements['reading-list-file'];
 const key='24gotop-public-reading-list-v1';
 app.cards[0].children[0].listeners.click();
 const before=app.store.get(key);
 const makeFile=(data,name='reader.json')=>{
  const bytes=new TextEncoder().encode(data);
  return {name,size:bytes.length,async arrayBuffer(){return bytes.buffer;}};
 };
 const valid=JSON.stringify({kind:'24gotop-public-reading-list-backup',version:1,
  files:['research-two.html']});
 app.setApprove(false);
 input.files=[makeFile(valid)];
 await input.listeners.change();
 assert.equal(app.store.get(key),before,'a cancelled confirmation is not a write');
 app.setApprove(true);
 const invalid=[
  '{"version":1,"files":[]}',
  JSON.stringify({kind:'24gotop-public-reading-list-backup',version:1,
   files:['not-published.html']}),
  JSON.stringify({kind:'24gotop-public-reading-list-backup',version:1,
   files:['research-two.html','research-two.html']}),
  '{corrupt',
  valid
 ];
 for(const data of invalid){
  input.files=[makeFile(data,data===valid?'reader.txt':'reader.json')];
  await input.listeners.change();
  assert.equal(app.store.get(key),before);
 }
 assert.equal(app.elements['reading-list-items'].children.length,1);
});

test('invalid stored list fails closed and imports stay disabled until explicit clearing',async()=>{
 const app=setup(),key='24gotop-public-reading-list-v1';
 app.store.set(key,'{"version":1,"files":["external.html"]}');
 app.window.listeners.storage({key,storageArea:app.storage});
 assert.equal(app.elements['reading-list-import'].disabled,true);
 assert.equal(app.elements['reading-list-export'].disabled,true);
 assert.equal(app.elements['reading-list-items'].children.length,0);
 assert.equal(app.elements['reading-list-clear'].hidden,false);
 app.elements['reading-list-clear'].listeners.click();
 assert.equal(app.store.has(key),false);
 assert.equal(app.elements['reading-list-import'].disabled,false);
});

test('rejected clipboard Promise exposes the exact selected Markdown as a manual fallback',async()=>{
 const app=setup({clipboardAccess:'reject'});
 app.cards[0].children[0].listeners.click();
 app.elements['reading-list-filter'].value='article 1';
 app.elements['reading-list-filter'].listeners.input();
 await app.elements['reading-list-copy'].listeners.click();
 const manual=app.elements['reading-list-manual-copy'];
 assert.equal(manual.hidden,false);
 assert.equal(manual.focused,true);
 assert.equal(manual.selected,true);
 assert.equal(manual.value,
  '- [Reviewed technical article 1](https://24go.top/engineering/research-one.html)');
 assert.equal(app.clipboardWrites.length,0);
 assert.match(app.elements['reading-list-feedback'].textContent,/manually/);
 assert.match(html,/id="reading-list-manual-copy"[^>]+readonly[^>]+hidden/);
});

test('manual copy of currently shown bookmarks clears when filter or storage changes',async()=>{
 const app=setup({clipboardAccess:false});
 app.cards[0].children[0].listeners.click();
 app.cards[1].children[0].listeners.click();
 const input=app.elements['reading-list-filter'];
 input.value='article 2';input.listeners.input();
 await app.elements['reading-list-copy'].listeners.click();
 const manual=app.elements['reading-list-manual-copy'];
 assert.equal(manual.hidden,false);
 assert.equal(manual.value,
  '- [Reviewed technical article 2](https://24go.top/engineering/research-two.html)');
 input.value='article 1';input.listeners.input();
 assert.equal(manual.hidden,true);
 assert.equal(manual.value,'','stale selection must not remain as a copy target');
 await app.elements['reading-list-copy'].listeners.click();
 assert.equal(manual.hidden,false);
 app.window.listeners.storage({key:'24gotop-public-reading-list-v1',storageArea:app.storage});
 assert.equal(manual.hidden,true);
 assert.equal(manual.value,'');
 assert.deepEqual(JSON.parse(app.store.get('24gotop-public-reading-list-v1')).files,
  ['research-one.html','research-two.html']);
});

test('a delayed clipboard rejection cannot expose stale links after the user changes filter',async()=>{
 const app=setup({clipboardAccess:'pending'});
 app.cards[0].children[0].listeners.click();
 app.cards[1].children[0].listeners.click();
 const input=app.elements['reading-list-filter'];
 input.value='article 1';input.listeners.input();
 const promise=app.elements['reading-list-copy'].listeners.click();
 input.value='article 2';input.listeners.input();
 app.rejectPendingClipboard();
 await promise;
 const manual=app.elements['reading-list-manual-copy'];
 assert.equal(manual.hidden,true);
 assert.equal(manual.value,'');
 assert.equal(app.elements['reading-list-items'].children.length,1);
 assert.equal(app.elements['reading-list-items'].children[0].children[0].href,'./research-two.html');
 assert.match(html,/aria-label="Selected Markdown links to your saved public articles for manual copying"/);
 assert.match(readFileSync(new URL('../site/engineering/notes.css',import.meta.url),'utf8'),
  /\.reading-list__manual-copy\[hidden\]\{display:none\}/);
});


test('an earlier pending backup cannot merge after a newer file selection',async()=>{
 const app=setup(),input=app.elements['reading-list-file'];
 const key='24gotop-public-reading-list-v1';
 const makeBackup=files=>{
  const bytes=new TextEncoder().encode(JSON.stringify({
   kind:'24gotop-public-reading-list-backup',version:1,files
  }));
  return {size:bytes.length,buffer:bytes.buffer};
 };
 const older=makeBackup(['research-one.html']);
 const newer=makeBackup(['research-two.html']);
 let releaseOld,releaseNew,confirmations=0;
 const oldBuffer=new Promise(resolve=>{releaseOld=resolve;});
 const newBuffer=new Promise(resolve=>{releaseNew=resolve;});
 app.setConfirmHook(()=>{confirmations++;});
 input.files=[{name:'old.json',size:older.size,arrayBuffer:()=>oldBuffer}];
 const first=input.listeners.change();
 input.files=[{name:'new.json',size:newer.size,arrayBuffer:()=>newBuffer}];
 input.value='new-file-selected';
 const second=input.listeners.change();
 releaseOld(older.buffer);
 await first;
 assert.equal(app.store.get(key),undefined,'stale backup must not create storage');
 assert.equal(input.value,'new-file-selected',
  'stale file cleanup must not clear a newer pending selection');
 assert.equal(confirmations,0,'stale imports cannot ask to merge');
 releaseNew(newer.buffer);
 await second;
 assert.equal(input.value,'');
 assert.equal(confirmations,1);
 assert.deepEqual(JSON.parse(app.store.get(key)).files,['research-two.html']);
 assert.match(app.elements['reading-list-feedback'].textContent,/Imported public links/);
});

test('a stale invalid backup cannot overwrite newer import feedback',async()=>{
 const app=setup(),input=app.elements['reading-list-file'];
 let rejectOld,releaseNew;
 const firstBytes=new TextEncoder().encode('not a valid saved-links JSON');
 const lastBytes=new TextEncoder().encode(JSON.stringify({
  kind:'24gotop-public-reading-list-backup',version:1,
  files:['research-two.html']
 }));
 input.files=[{name:'old.json',size:firstBytes.length,
  arrayBuffer:()=>new Promise((_resolve,reject)=>{rejectOld=reject;})}];
 const first=input.listeners.change();
 input.files=[{name:'new.json',size:lastBytes.length,
  arrayBuffer:()=>new Promise(resolve=>{releaseNew=resolve;})}];
 const second=input.listeners.change();
 app.elements['reading-list-feedback'].textContent='New backup selected';
 rejectOld(new Error('Read denied'));
 await first;
 assert.equal(app.elements['reading-list-feedback'].textContent,'New backup selected');
 releaseNew(lastBytes.buffer);
 await second;
 assert.deepEqual(JSON.parse(app.store.get('24gotop-public-reading-list-v1')).files,
  ['research-two.html']);
 assert.match(app.elements['reading-list-feedback'].textContent,/Imported public links/);
});
