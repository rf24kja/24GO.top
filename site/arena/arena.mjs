import {parseArenaSession,MAX_ARENA_BYTES} from './arena-core.mjs';

const $=id=>document.getElementById(id);
const source=$('arena-file'),clear=$('arena-clear'),status=$('arena-status');
const view=$('arena-results'),roundSelect=$('arena-round');
let session=null,epoch=0,preferences=new Map();
const voteButtons=[...document.querySelectorAll('[data-arena-vote]')];
function showStatus(message,error=false){
 status.textContent=message;
 status.dataset.error=String(error);
}
function reset(){
 epoch++;
 session=null;preferences=new Map();
 source.value='';roundSelect.replaceChildren();view.hidden=true;
 clear.disabled=true;
 showStatus('No session loaded. Choose a locally produced Arena JSON file.');
}
function currentRound(){return Number(roundSelect.value);}
function render(){
 if(!session)return;
 const number=currentRound();
 const round=session.rounds[number-1]||session.rounds[0];
 roundSelect.value=String(round.number);
 $('arena-round-count').textContent='Round '+round.number+' of '+session.rounds.length;
 for(const [index,id] of ['a','b'].entries()){
  const agent=session.agents[index],answer=round.responses[index];
  $( 'arena-'+id+'-name').textContent=agent.name;
  $( 'arena-'+id+'-model').textContent=agent.model;
  $( 'arena-'+id+'-meta').textContent='Response time: '+answer.durationMs+' ms · '+[...answer.text].length+' characters';
  $( 'arena-'+id+'-text').textContent=answer.text;
 }
 const choice=preferences.get(number)||'';
 for(const b of voteButtons)b.setAttribute('aria-pressed',String(b.dataset.arenaVote===choice));
 $('arena-vote-status').textContent=choice?
  'Local preference for round '+number+': '+(choice==='tie'?'Equal / tie':'Agent '+choice.toUpperCase())+'.':
  'No preference selected for this round.';
}
function showSession(parsed){
 session=parsed;preferences.clear();
 $('arena-question').textContent=parsed.prompt;
 roundSelect.replaceChildren();
 for(const round of parsed.rounds){
  const opt=document.createElement('option');
  opt.value=String(round.number);opt.textContent='Round '+round.number;
  roundSelect.append(opt);
 }
 view.hidden=false;clear.disabled=false;
 showStatus('Loaded '+parsed.rounds.length+' local comparison round(s). No upload or browser storage.');
 render();
}
source.addEventListener('change',async()=>{
 const ticket=++epoch;
 const file=source.files?.[0];
 if(!file){reset();return;}
 if(file.size>MAX_ARENA_BYTES){
  reset();showStatus('File exceeds the 64 KiB Arena session limit.',true);return;
 }
 try{
  const raw=await file.text();
  if(ticket!==epoch)return; // obsolete FileReader cannot replace a newer choice
  showSession(parseArenaSession(raw));
 }catch{
  if(ticket!==epoch)return;
  reset();
  showStatus('Invalid or unsupported Arena transcript. Nothing was imported.',true);
 }
});
clear.addEventListener('click',reset);
roundSelect.addEventListener('change',render);
for(const button of voteButtons){
 button.addEventListener('click',()=>{
  if(!session)return;
  const choice=button.dataset.arenaVote;
  if(!['a','b','tie'].includes(choice))return;
  const round=currentRound();
  if(preferences.get(round)===choice)preferences.delete(round);
  else preferences.set(round,choice);
  render();
 });
}
