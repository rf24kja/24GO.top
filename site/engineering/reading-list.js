// Opt-in public reading list, stored in this browser only.
// No account, analytics, remote API, automatic writes or private author drafts.
(()=>{
 const KEY='24gotop-public-reading-list-v1';
 const MAX=50;
 const panel=document.getElementById('reading-list-panel');
 const list=document.getElementById('reading-list-items');
 const count=document.getElementById('reading-list-status');
 const clear=document.getElementById('reading-list-clear');
 const cards=[...document.querySelectorAll('[data-note-card]')];
 if(!panel||!list||!count||!clear||!cards.length)return;
 let storage;
 try{storage=window.localStorage;}catch{return;}
 if(!storage)return;
 const approved=new Map();
 for(const card of cards){
  const file=card.dataset.noteFile;
  const anchor=card.querySelector('h3 a');
  if(typeof file!=='string'||!/^[a-z0-9-]+\.html$/.test(file)||
      !anchor||anchor.getAttribute('href')!=='./'+file||
      approved.has(file))return;
  approved.set(file,{card,title:anchor.textContent.trim()||file});
 }
 const buttons=new Map();
 const decode=raw=>{
  if(raw===null)return [];
  const data=JSON.parse(raw);
  if(!data||data.version!==1||!Array.isArray(data.files)||
      data.files.length>MAX||new Set(data.files).size!==data.files.length||
      data.files.some(file=>typeof file!=='string'||!approved.has(file)))
    throw new TypeError('Invalid public reading list');
  return data.files;
 };
 const save=files=>storage.setItem(KEY,JSON.stringify({version:1,files}));
 const render=()=>{
  let saved=[],invalid=false;
  try{saved=decode(storage.getItem(KEY));}
  catch{invalid=true;}
  const chosen=new Set(saved);
  for(const [file,button] of buttons){
   const active=chosen.has(file);
   button.disabled=invalid;
   button.setAttribute('aria-pressed',String(active));
   button.textContent=active?'Remove from reading list':'Save for later';
   button.setAttribute('aria-label',(active?'Remove ':'Save ')+
      approved.get(file).title+(active?' from reading list':' for later'));
  }
  list.replaceChildren();
  for(const file of saved){
   const li=document.createElement('li');
   const a=document.createElement('a');
   a.href='./'+file;
   a.textContent=approved.get(file).title;
   li.append(a);
   list.append(li);
  }
  count.textContent=invalid
   ?'This browser reading list is damaged or unavailable. Clear it to start over.'
   :'Saved public articles: '+saved.length+' / '+Math.min(MAX,approved.size);
  clear.hidden=!invalid&&!saved.length;
  panel.hidden=false;
 };
 for(const [file,{card}] of approved){
  const button=document.createElement('button');
  button.type='button';
  button.className='reading-list__toggle';
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{
   try{
    const saved=decode(storage.getItem(KEY));
    const next=saved.includes(file)?saved.filter(x=>x!==file):
     saved.length<Math.min(MAX,approved.size)?[...saved,file]:saved;
    if(next.length!==saved.length)save(next);
    render();
   }catch{render();}
  });
  card.append(button);
  buttons.set(file,button);
 }
 clear.addEventListener('click',()=>{
  if(!window.confirm('Clear saved public article links from this browser?'))return;
  try{storage.removeItem(KEY);}catch{}
  render();
 });
 window.addEventListener('storage',event=>{
  if(event.key!==KEY&&event.key!==null)return;
  if(event.storageArea&&event.storageArea!==storage)return;
  render(); // Read only: do not turn a different tab's change into a write.
 });
 render();
})();
