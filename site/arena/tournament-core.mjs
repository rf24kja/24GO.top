/**
 * Explicit human review of EXISTING real local Arena transcripts.
 * No platform identity/rating claims, persistence, uploads or AI API calls.
 */
import {validateArenaSession} from './arena-core.mjs';
const choices=new Set(['a','b','tie',null]);
const MAX_MATCHES=8;
const invalid=()=>{throw new TypeError('Invalid local Arena tournament');};
const identity=a=>a.name+'\u0000'+a.model;
export function aggregateTournament(entries){
 if(!Array.isArray(entries)||entries.length>MAX_MATCHES)invalid();
 const players=new Map();let reviewed=0;
 for(const entry of entries){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||
     Object.keys(entry).sort().join()!=='choice,session'||
     !choices.has(entry.choice))invalid();
  const s=validateArenaSession(entry.session);
  const identifiers=s.agents.map(identity);
  if(identifiers[0]===identifiers[1])invalid();
  for(let index=0;index<2;index++){
   const key=identifiers[index],agent=s.agents[index];
   if(!players.has(key))players.set(key,{
    name:agent.name,model:agent.model,wins:0,losses:0,ties:0,played:0
   });
  }
  if(entry.choice===null)continue;
  reviewed++;
  for(let i=0;i<2;i++){
   const player=players.get(identifiers[i]);
   player.played++;
   if(entry.choice==='tie')player.ties++;
   else if(entry.choice===s.agents[i].id)player.wins++;
   else player.losses++;
  }
 }
 const scores=[...players.values()].map(x=>Object.freeze({
  ...x,winRate:x.played?(x.wins+x.ties*.5)/x.played:null
 }));
 scores.sort((a,b)=>(b.winRate??-1)-(a.winRate??-1)||
  b.played-a.played||a.model.localeCompare(b.model)||a.name.localeCompare(b.name));
 return Object.freeze({
  matches:entries.length,reviewed,
  scores:Object.freeze(scores)
 });
}
export function tournamentMarkdown(entries){
 const summary=aggregateTournament(entries);
 const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/\|/g,'\\|')
  .replace(/\r?\n/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ');
 const out=[
  '# Local Agent Arena review',
  '',
  'Private, user-supplied evaluations of locally produced transcripts. NOT a platform-verified agent ranking.',
  '',
  'Matches imported: '+summary.matches+' · Human-reviewed: '+summary.reviewed,
  '',
  '| Declared agent | Model | Reviewed | Wins | Ties | Losses | Win points |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: |'
 ];
 for(const row of summary.scores){
  out.push('| '+esc(row.name)+' | '+esc(row.model)+' | '+row.played+
   ' | '+row.wins+' | '+row.ties+' | '+row.losses+' | '+
   (row.winRate===null?'—':(100*row.winRate).toFixed(1)+'%')+' |');
 }
 out.push('','## Match decisions');
 entries.forEach((item,i)=>{
  const s=item.session;
  const decision=item.choice===null?'Not yet reviewed':
   item.choice==='tie'?'Tie':s.agents[item.choice==='a'?0:1].name;
  out.push('',String(i+1)+'. '+esc(s.agents[0].name)+' vs '+
   esc(s.agents[1].name)+' — '+esc(decision)+
   ' ('+s.rounds.length+' local rounds)');
 });
 out.push('','No prompt bodies, raw responses, API keys or owner credentials are included.','');
 return out.join('\n');
}
