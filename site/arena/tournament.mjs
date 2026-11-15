import {parseArenaSession,MAX_ARENA_BYTES} from './arena-core.mjs';
import {aggregateTournament,tournamentMarkdown} from './tournament-core.mjs';

const $=id=>document.getElementById(id);
const file=$('arena-tournament-files'),clear=$('arena-tournament-clear');
const list=$('arena-tournament-matches'),scores=$('arena-tournament-scores');
const status=$('arena-tournament-status'),download=$('arena-tournament-export');
let entries=[],epoch=0;
function updateStatus(value,error=false){
 status.textContent=value;status.dataset.error=String(error);
}
function reset(){
 epoch++;file.value='';entries=[];
 list.replaceChildren();scores.replaceChildren();
 download.disabled=true;clear.disabled=true;
 updateStatus('Choose two to eight local match JSON files to begin reviewing.');
}
function create(tag,cls,content){
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(content!==undefined)element.textContent=content;
 return element;
}
function render(){
 list.replaceChildren();scores.replaceChildren();
 const report=aggregateTournament(entries);
 for(const [index,entry] of entries.entries()){
  const s=entry.session;
  const article=create('article','arena-tournament-match');
  const heading=create('h4','','Match '+(index+1)+': '+s.agents[0].name+' vs '+s.agents[1].name);
  const subtitle=create('p','','Models: '+s.agents.map(x=>x.model).join(' / ')+
   ' · '+s.rounds.length+' actual local round(s)');
  const actions=create('div','arena-tournament-decisions');
  actions.setAttribute('role','group');
  actions.setAttribute('aria-label','Human preference for match '+(index+1));
  for(const [choice,label] of [
   ['a','Prefer '+s.agents[0].name],['b','Prefer '+s.agents[1].name],
   ['tie','Tie / equal']
  ]){
   const btn=create('button','arena-button arena-button--quiet',label);
   btn.type='button';btn.setAttribute('aria-pressed',String(entry.choice===choice));
   btn.addEventListener('click',()=>{
    entries[index]={...entry,choice:entry.choice===choice?null:choice};
    render();
    const updated=list.children[index]?.querySelectorAll('button');
    const focus=updated?.[['a','b','tie'].indexOf(choice)];
    if(focus)focus.focus({preventScroll:true});
   });
   actions.append(btn);
  }
  article.append(heading,subtitle,actions);list.append(article);
 }
 if(report.scores.length){
  const caption=create('p','arena-tournament-table-title',
   'Declared models · '+report.reviewed+' of '+report.matches+' human-reviewed matches');
  const wrapper=create('div','arena-tournament-table-scroll');
  const table=create('table','arena-tournament-table');
  const thead=create('thead',''),headers=create('tr','');
  for(const name of ['Agent / model','Evaluated','Wins','Ties','Losses','Win points']){
   const th=create('th','',name);th.scope='col';headers.append(th);
  }
  thead.append(headers);table.append(thead);
  const body=create('tbody','');
  for(const row of report.scores){
   const tr=create('tr','');
   const first=create('th','',row.name+' · '+row.model);first.scope='row';tr.append(first);
   for(const value of [row.played,row.wins,row.ties,row.losses,
     row.winRate===null?'—':(row.winRate*100).toFixed(1)+'%']){
    tr.append(create('td','',String(value)));
   }
   body.append(tr);
  }
  table.append(body);wrapper.append(table);scores.append(caption,wrapper);
 }
 download.disabled=!entries.length;clear.disabled=!entries.length;
 updateStatus('Loaded '+report.matches+' local matches. Human decisions: '+
  report.reviewed+'. This is a private comparison, not a public rating.');
}
file.addEventListener('change',async()=>{
 const current=++epoch,chosen=[...(file.files||[])];
 if(chosen.length<2||chosen.length>8){
  reset();updateStatus('Choose between 2 and 8 local Arena JSON files.',true);
  return;
 }
 if(chosen.some(x=>x.size===0||x.size>MAX_ARENA_BYTES)){
  reset();updateStatus('One or more match files exceed the 64 KiB limit or are empty.',true);
  return;
 }
 try{
  const raw=await Promise.all(chosen.map(x=>x.text()));
  if(current!==epoch)return;
  const unique=new Set(raw);
  if(unique.size!==raw.length)throw Error('Duplicate match');
  const parsed=raw.map(text=>({session:parseArenaSession(text),choice:null}));
  // Reject duplicate model identities inside one match; no false aggregation.
  aggregateTournament(parsed);
  entries=parsed;render();
 }catch{
  if(current!==epoch)return;
  reset();updateStatus('Invalid, duplicate, or incompatible match files. No matches imported.',true);
 }
});
clear.addEventListener('click',reset);
download.addEventListener('click',()=>{
 if(!entries.length)return;
 const markdown=tournamentMarkdown(entries);
 const url=URL.createObjectURL(new Blob([markdown],{type:'text/markdown;charset=utf-8'}));
 const anchor=document.createElement('a');
 anchor.href=url;anchor.download='24gotop-local-arena-review.md';anchor.hidden=true;
 document.body.append(anchor);
 try{anchor.click();}
 finally{anchor.remove();URL.revokeObjectURL(url);}
 updateStatus('Local review download requested. Confirm that your browser saved the file.');
});
