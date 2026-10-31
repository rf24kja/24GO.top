// Private-on-device, opt-in bookmarks for the PUBLIC engineering archive.
// No network, auto-persistence, tracking, author drafts or publication authority.
(()=>{
 const KEY='24gotop-public-reading-list-v1';
 const BACKUP_KIND='24gotop-public-reading-list-backup';
 const MAX=50,MAX_BACKUP_BYTES=16384;
 const id=name=>document.getElementById(name);
 const panel=id('reading-list-panel'),list=id('reading-list-items');
 const count=id('reading-list-status'),feedback=id('reading-list-feedback');
 const clear=id('reading-list-clear'),filter=id('reading-list-filter');
 const filterStatus=id('reading-list-filter-status');
 const copy=id('reading-list-copy'),exportButton=id('reading-list-export');
 const importButton=id('reading-list-import'),fileInput=id('reading-list-file');
 const cards=[...document.querySelectorAll('[data-note-card]')];
 if([panel,list,count,feedback,clear,filter,filterStatus,copy,
    exportButton,importButton,fileInput].some(x=>!x)||!cards.length)return;
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
 const max=Math.min(MAX,approved.size);
 const buttons=new Map();
 const validFiles=(files)=>{
  if(!Array.isArray(files)||files.length>max||
      new Set(files).size!==files.length||
      files.some(file=>typeof file!=='string'||!approved.has(file)))
   throw new TypeError('Invalid public article links');
  return files;
 };
 const decode=raw=>{
  if(raw===null)return [];
  const data=JSON.parse(raw);
  if(!data||data.version!==1||!Array.isArray(data.files))
   throw new TypeError('Invalid public reading list');
  return validFiles(data.files);
 };
 const encode=files=>JSON.stringify({version:1,files});
 const current=()=>decode(storage.getItem(KEY));
 const save=files=>storage.setItem(KEY,encode(validFiles(files)));
 const cleanTitle=title=>title.replace(/[\[\]\\\r\n]/g,' ').slice(0,180);
 const selected=files=>{
  const needle=filter.value.trim().slice(0,80).normalize('NFC').toLocaleLowerCase();
  return files.filter(file=>!needle||
    approved.get(file).title.normalize('NFC').toLocaleLowerCase().includes(needle));
 };
 const mark=message=>{feedback.textContent=message;};
 const render=()=>{
  let files=[],invalid=false;
  try{files=current();}
  catch{invalid=true;}
  const chosen=new Set(files);
  for(const [file,button] of buttons){
   const active=chosen.has(file);
   button.disabled=invalid;
   button.setAttribute('aria-pressed',String(active));
   button.textContent=active?'Remove from reading list':'Save for later';
   button.setAttribute('aria-label',(active?'Remove ':'Save ')+
      approved.get(file).title+(active?' from reading list':' for later'));
  }
  const visible=invalid?[]:selected(files);
  list.replaceChildren();
  for(const file of visible){
   const li=document.createElement('li');
   const link=document.createElement('a');
   link.href='./'+file;
   link.textContent=approved.get(file).title;
   const remove=document.createElement('button');
   remove.type='button';
   remove.className='reading-list__remove';
   remove.textContent='Remove';
   remove.setAttribute('aria-label','Remove '+approved.get(file).title+' from reading list');
   remove.addEventListener('click',()=>{
    try{save(current().filter(saved=>saved!==file));mark('Saved link removed.');}
    catch{mark('Browser storage unavailable; no changes saved.');}
    render();
   });
   li.append(link,remove);
   list.append(li);
  }
  count.textContent=invalid
   ?'This browser reading list is damaged or unavailable. Clear it to start over.'
   :'Saved public articles: '+files.length+' / '+max;
  filterStatus.textContent=invalid?'Saved list cannot be read.':
   visible.length+' of '+files.length+' saved links shown.';
  clear.hidden=!invalid&&!files.length;
  exportButton.disabled=invalid||!files.length;
  copy.disabled=invalid||!visible.length;
  filter.disabled=invalid||!files.length;
  importButton.disabled=invalid;
  panel.hidden=false;
 };
 for(const [file,{card}] of approved){
  const button=document.createElement('button');
  button.type='button';
  button.className='reading-list__toggle';
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{
   try{
    const files=current();
    const next=files.includes(file)?files.filter(x=>x!==file):
     files.length<max?[...files,file]:files;
    if(next.length!==files.length)save(next);
    mark(next.length===files.length?'Reading list is full.':'');
   }catch{mark('Browser storage unavailable; no changes saved.');}
   render();
  });
  card.append(button);
  buttons.set(file,button);
 }
 filter.addEventListener('input',render);
 clear.addEventListener('click',()=>{
  if(!window.confirm('Clear all saved public article links from this browser?'))return;
  try{storage.removeItem(KEY);mark('Saved links cleared.');}
  catch{mark('Could not clear browser storage.');}
  render();
 });
 copy.addEventListener('click',async()=>{
  let files;
  try{files=selected(current());}catch{render();return;}
  if(!files.length)return;
  if(!navigator.clipboard?.writeText){
   mark('Clipboard unavailable. Copy individual public links instead.');return;
  }
  const markdown=files.map(file=>
   '- ['+cleanTitle(approved.get(file).title)+'](https://24go.top/engineering/'+file+')').join('\n');
  try{
   await navigator.clipboard.writeText(markdown);
   mark(files.length+' saved link(s) copied as Markdown.');
  }catch{mark('Clipboard unavailable. Copy individual public links instead.');}
 });
 exportButton.addEventListener('click',()=>{
  try{
   const files=current();
   if(!files.length)return;
   const backup=JSON.stringify({kind:BACKUP_KIND,version:1,files},null,2)+'\n';
   const bytes=new TextEncoder().encode(backup);
   if(bytes.byteLength>MAX_BACKUP_BYTES)throw new TypeError('Backup too large');
   const blob=new Blob([bytes],{type:'application/json;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   try{
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.download='24gotop-public-reading-list.json';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
   }finally{setTimeout(()=>URL.revokeObjectURL(url),10000);}
   mark('A JSON backup download was requested. Keep it private on shared devices.');
  }catch{mark('Cannot export saved links from this browser.');}
 });
 importButton.addEventListener('click',()=>fileInput.click());
 fileInput.addEventListener('change',async()=>{
  const file=fileInput.files?.[0];
  if(!file)return;
  try{
   if(!/\.json$/i.test(file.name)||!Number.isSafeInteger(file.size)||
      file.size<12||file.size>MAX_BACKUP_BYTES)
    throw new TypeError('Invalid backup file');
   const buffer=await file.arrayBuffer();
   if(buffer.byteLength!==file.size||buffer.byteLength>MAX_BACKUP_BYTES)
    throw new TypeError('Invalid backup length');
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(buffer);
   const data=JSON.parse(raw);
   if(!data||data.kind!==BACKUP_KIND||data.version!==1||
      !Array.isArray(data.files))throw new TypeError('Invalid backup format');
   const imported=validFiles(data.files);
   if(!window.confirm('Merge '+imported.length+
      ' saved public article link(s) from this JSON file into this browser?'))return;
   // Re-read the saved version AFTER the confirmation. Never overwrite another
   // tab's newer preference or make a partial over-capacity import.
   const combined=[...new Set([...current(),...imported])];
   validFiles(combined);
   if(combined.length)save(combined);
   mark('Imported public links. Existing saved links were kept.');
  }catch{
   mark('Import rejected. Use a 24GOTOP public reading list JSON backup containing only current published links.');
  }finally{
   fileInput.value='';
   render();
  }
 });
 window.addEventListener('storage',event=>{
  if(event.key!==KEY&&event.key!==null)return;
  if(event.storageArea&&event.storageArea!==storage)return;
  render(); // Cross-tab notification is READ-ONLY.
 });
 render(); // First visit is READ-ONLY.
})();
