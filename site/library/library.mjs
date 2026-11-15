import {validateLibraryCatalog,selectComparison,filterLibrary} from './library-core.mjs';

const $=id=>document.getElementById(id);
const cards=$('library-cards'),status=$('library-status'),search=$('library-search');
const category=$('library-category'),compareBtn=$('compare-open'),resetBtn=$('compare-reset');
const frame=$('library-frame'),preview=$('preview-area');
let catalog=null;
const chosen=new Set();
const el=(tag,className,text)=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=text;
 return node;
};
function announce(message,error=false){status.textContent=message;status.dataset.error=String(error);}
function updateSelection(){
 $('compare-count').textContent=chosen.size+' of 2 selected';
 compareBtn.disabled=chosen.size!==2;
 for(const btn of cards.querySelectorAll('[data-library-select]')){
  const selected=chosen.has(btn.dataset.librarySelect);
  btn.setAttribute('aria-pressed',String(selected));
  btn.textContent=selected?'Remove from comparison':'Select to compare';
 }
 if(chosen.size!==2)$('compare-result').hidden=true;
}
function closePreview(){
 frame.removeAttribute('src');
 preview.hidden=true;
 $('preview-name').textContent='';
}
function openPreview(app){
 closePreview();
 frame.setAttribute('sandbox','allow-scripts'); // NEVER allow-same-origin or top navigation.
 frame.title='Sandbox preview of '+app.name;
 frame.src=app.entry;
 $('preview-name').textContent=app.name+' · isolated static preview';
 preview.hidden=false;
 $('preview-close').focus({preventScroll:true});
 preview.scrollIntoView({block:'start',behavior:'auto'});
}
function render(){
 if(!catalog)return;
 cards.replaceChildren();
 const visible=filterLibrary(catalog.apps,search.value,category.value);
 if(!visible.length){
  cards.append(el('p','library-empty','No reviewed apps match these filters.'));
 }
 for(const app of visible){
  const article=el('article','library-card');
  const kicker=el('p','library-kicker',app.category+' · '+app.version);
  const heading=el('h3','',app.name);
  const description=el('p','library-card__description',app.description);
  const row=el('div','library-meta');
  for(const tag of ['MIT license','No network','No backend'])row.append(el('span','',tag));
  const features=el('ul','library-features');
  for(const item of app.features)features.append(el('li','',item));
  const actions=el('div','library-card__actions');
  const launch=el('button','library-button','Preview in sandbox');
  launch.type='button';launch.addEventListener('click',()=>openPreview(app));
  const select=el('button','library-button library-button--quiet','Select to compare');
  select.type='button';select.dataset.librarySelect=app.id;
  select.addEventListener('click',()=>{
   if(chosen.has(app.id))chosen.delete(app.id);
   else if(chosen.size===2){
    announce('Choose no more than two applications. Remove one selection first.',true);
    select.focus();return;
   }else chosen.add(app.id);
   updateSelection();
   announce('Showing '+visible.length+' of '+catalog.apps.length+' reviewed first-party applications.');
  });
  const source=el('a','library-source','View public source ↗');
  source.href=app.source;source.target='_blank';source.rel='noopener noreferrer nofollow';
  actions.append(launch,select,source);
  article.append(kicker,heading,description,row,features,actions);
  cards.append(article);
 }
 updateSelection();
 announce('Showing '+visible.length+' of '+catalog.apps.length+' reviewed first-party applications.');
}
function appendComparisonRow(key,a,b){
 const tr=el('tr','');
 const label=el('th','',key);label.scope='row';
 tr.append(label,el('td','',a),el('td','',b));
 $('compare-body').append(tr);
}
compareBtn.addEventListener('click',()=>{
 if(!catalog||chosen.size!==2)return;
 const [a,b]=selectComparison(catalog,[...chosen]);
 $('compare-a').textContent=a.name;
 $('compare-b').textContent=b.name;
 $('compare-body').replaceChildren();
 for(const [key,field] of [
  ['Category','category'],['Version','version'],['License','license'],
  ['Runtime','runtime'],['Network access','network']])
  appendComparisonRow(key,a[field],b[field]);
 appendComparisonRow('Source-backed features',a.features.join(' · '),b.features.join(' · '));
 $('compare-result').hidden=false;
 $('compare-result').scrollIntoView({block:'nearest',behavior:'auto'});
 $('compare-result').setAttribute('tabindex','-1');
 $('compare-result').focus({preventScroll:true});
});
resetBtn.addEventListener('click',()=>{
 chosen.clear();updateSelection();announce('Comparison selection cleared.');
});
$('preview-close').addEventListener('click',()=>{
 closePreview();
 const button=cards.querySelector('button');
 if(button)button.focus({preventScroll:true});
});
search.addEventListener('input',render);
category.addEventListener('change',render);

async function start(){
 try{
  const response=await fetch('./catalog.json',{method:'GET',credentials:'omit',redirect:'error'});
  if(!response.ok)throw Error('No catalog');
  if(Number(response.headers.get('content-length')||0)>32768)throw Error('Oversized catalog');
  const raw=await response.text();
  if(new TextEncoder().encode(raw).byteLength>32768)throw Error('Oversized catalog');
  catalog=validateLibraryCatalog(JSON.parse(raw));
  const cats=[...new Set(catalog.apps.map(x=>x.category))].sort();
  for(const name of cats){const option=el('option','',name);option.value=name;category.append(option);}
  render();
 }catch{cards.replaceChildren();announce('Reviewed app catalog unavailable. Try the public source link later.',true);}
}
start();
