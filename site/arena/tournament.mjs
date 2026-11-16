import {parseArenaSession,MAX_ARENA_BYTES} from './arena-core.mjs';
import {aggregateTournament,tournamentMarkdown} from './tournament-core.mjs';

const $=id=>document.getElementById(id);
const file=$('arena-tournament-files'),clear=$('arena-tournament-clear');
const list=$('arena-tournament-matches'),scores=$('arena-tournament-scores');
const status=$('arena-tournament-status'),download=$('arena-tournament-export');
const scoreReveal=$('arena-tournament-score-reveal');
let entries=[],epoch=0,revealedMatches=new Set(),revealedScores=false;
function updateStatus(value,error=false){
 status.textContent=value;status.dataset.error=String(error);
}
function reset(){
 epoch++;file.value='';entries=[];revealedMatches=new Set();revealedScores=false;
 list.replaceChildren();scores.replaceChildren();
 download.disabled=true;clear.disabled=true;scoreReveal.disabled=true;
 scoreReveal.setAttribute('aria-pressed','false');
 scoreReveal.textContent='Reveal scoreboard identities';
 updateStatus('Choose two to eight local match JSON files to begin reviewing.');
}
function create(tag,cls,content){
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(content!==undefined)element.textContent=content;
 return element;
}
function render(){
 // Voting or revealing a model re-renders a row; do not collapse the
 // reader's open transcript or make it impossible to finish the comparison.
 const opened=new Set([...list.children].flatMap((node,i)=>
  node.querySelector('.arena-tournament-review')?.open?[i]:[]));
 list.replaceChildren();scores.replaceChildren();
 const report=aggregateTournament(entries);
 const aliases=new Map();
 for(const entry of entries)for(const agent of entry.session.agents){
  const identity=JSON.stringify([agent.name,agent.model]);
  if(!aliases.has(identity))aliases.set(identity,'Participant '+(aliases.size+1));
 }
 scoreReveal.setAttribute('aria-pressed',String(revealedScores));
 scoreReveal.textContent=revealedScores?'Hide scoreboard identities':
  'Reveal scoreboard identities';
 for(const [index,entry] of entries.entries()){
  const s=entry.session;
  const article=create('article','arena-tournament-match');
  const revealed=revealedMatches.has(index);
  const heading=create('h4','','Match '+(index+1)+': '+
   (revealed?s.agents[0].name+' vs '+s.agents[1].name:'Response A vs Response B'));
  const subtitle=create('p','',revealed?
   'Declared models: '+s.agents.map(x=>x.model).join(' / ')+
     ' · '+s.rounds.length+' actual local round(s)':
   'Declared model identities hidden · '+s.rounds.length+' actual local round(s)');
  const review=create('details','arena-tournament-review');
  review.open=opened.has(index);
  review.append(create('summary','','Read question and '+s.rounds.length+' round(s) of real responses'));
  review.append(create('p','arena-tournament-question','Technical question: '+s.prompt));
  for(const round of s.rounds){
   const panel=create('section','arena-tournament-round');
   panel.append(create('h5','','Round '+round.number));
   const columns=create('div','arena-tournament-duel');
   for(let i=0;i<2;i++){
    const side=create('div','arena-tournament-response');
    side.append(create('strong','','Response '+(i===0?'A':'B')));
    side.append(create('pre','arena-tournament-answer',round.responses[i].text));
    columns.append(side);
   }
   panel.append(columns);review.append(panel);
  }
  const actions=create('div','arena-tournament-decisions');
  actions.setAttribute('role','group');
  actions.setAttribute('aria-label','Human preference for match '+(index+1));
  for(const [choice,label] of [
   ['a',revealed?'Prefer '+s.agents[0].name:'Prefer Response A'],
   ['b',revealed?'Prefer '+s.agents[1].name:'Prefer Response B'],
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
  const reveal=create('button','arena-button arena-button--quiet arena-tournament-reveal',
   revealed?'Hide model identities for this match':'Reveal model identities for this match');
  reveal.type='button';reveal.setAttribute('aria-pressed',String(revealed));
  reveal.addEventListener('click',()=>{
   if(revealedMatches.has(index))revealedMatches.delete(index);
   else revealedMatches.add(index);
   render();
   list.children[index]?.querySelector('.arena-tournament-reveal')?.focus({preventScroll:true});
  });
  article.append(heading,subtitle,review,actions,reveal);list.append(article);
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
   const first=create('th','',revealedScores?row.name+' · '+row.model:
    aliases.get(JSON.stringify([row.name,row.model])));first.scope='row';tr.append(first);
   for(const value of [row.played,row.wins,row.ties,row.losses,
     row.winRate===null?'—':(row.winRate*100).toFixed(1)+'%']){
    tr.append(create('td','',String(value)));
   }
   body.append(tr);
  }
  table.append(body);wrapper.append(table);scores.append(caption,wrapper);
 }
 download.disabled=!entries.length;clear.disabled=!entries.length;
 scoreReveal.disabled=!entries.length;
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
  entries=parsed;revealedMatches=new Set();revealedScores=false;render();
 }catch{
  if(current!==epoch)return;
  reset();updateStatus('Invalid, duplicate, or incompatible match files. No matches imported.',true);
 }
});
clear.addEventListener('click',reset);
scoreReveal.addEventListener('click',()=>{
 if(!entries.length)return;
 revealedScores=!revealedScores;
 render();
 scoreReveal.focus({preventScroll:true});
});
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
