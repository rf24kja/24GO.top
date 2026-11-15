import {validateArenaSession} from './arena-core.mjs';
import {aggregateTournament,tournamentMarkdown} from './tournament-core.mjs';

const $=id=>document.getElementById(id);
const form=$('console-form'),run=$('run'),status=$('status');
const results=$('results'),select=$('round-choice'),download=$('download');
let auth=null,session=null,remaining=3,pending=false;
let pastMatches=[];
function announce(message,error=false){
 status.textContent=message;
 status.dataset.error=String(error);
}
function credentialFromFragment(){
 const match=/^#auth=([A-Za-z0-9_-]{43})$/.exec(location.hash);
 // Delete token from the displayed URL and history before anything else.
 history.replaceState(null,'',location.pathname);
 return match?.[1]||null;
}
auth=credentialFromFragment();
run.disabled=!auth;
announce(auth?
 'Local console is ready. Model calls start only after you check the cost consent box and press Run.':
 'No valid local console access token. Restart the Node console and open the full loopback link.',!auth);
function render(){
 if(!session)return;
 $('results-prompt').textContent=session.prompt;
 const round=session.rounds.find(r=>r.number===Number(select.value))||session.rounds[0];
 select.value=String(round.number);
 $('round-count').textContent='Round '+round.number+' / '+session.rounds.length;
 for(const [index,id] of ['a','b'].entries()){
  const agent=session.agents[index],response=round.responses[index];
  $('agent-'+id+'-name').textContent=agent.name;
  $('agent-'+id+'-model').textContent=agent.model;
  $('agent-'+id+'-time').textContent=response.durationMs+' ms · '+
   [...response.text].length+' characters';
  $('agent-'+id+'-answer').textContent=response.text;
 }
}
function load(next){
 session=validateArenaSession(next);
 select.replaceChildren();
 for(const round of session.rounds){
  const option=document.createElement('option');
  option.value=String(round.number);
  option.textContent='Round '+round.number;
  select.append(option);
 }
 results.hidden=false;download.disabled=false;
 render();
}
const pastSection=$('history'),pastList=$('history-list');
const pastScores=$('history-scores'),pastExport=$('history-export');
function element(tag,value){
 const n=document.createElement(tag);
 if(value!==undefined)n.textContent=value;
 return n;
}
function renderPast(){
 pastList.replaceChildren();pastScores.replaceChildren();
 if(!pastMatches.length){pastSection.hidden=true;pastExport.disabled=true;return;}
 const tally=aggregateTournament(pastMatches);
 for(const [index,entry] of pastMatches.entries()){
  const match=entry.session;
  const article=element('article');
  article.className='history-match';
  const title=element('h3','Match '+(index+1)+' · '+
   match.agents[0].name+' vs '+match.agents[1].name);
  const description=element('p',match.rounds.length+
   ' actual signed round(s) · '+match.agents.map(a=>a.model).join(' / '));
  const actions=element('div');actions.className='history-actions';
  actions.setAttribute('role','group');
  actions.setAttribute('aria-label','Private review for match '+(index+1));
  const read=element('button','View responses');
  read.type='button';read.className='secondary-action';
  read.addEventListener('click',()=>{
   load(match);
   announce('Viewing existing local match '+(index+1)+'. No model request was sent.');
   $('results-title').focus({preventScroll:true});
  });
  actions.append(read);
  for(const [choice,label] of [
   ['a','Prefer '+match.agents[0].name],
   ['b','Prefer '+match.agents[1].name],
   ['tie','Tie']
  ]){
   const button=element('button',label);
   button.className='secondary-action';
   button.type='button';
   button.setAttribute('aria-pressed',String(entry.choice===choice));
   button.addEventListener('click',()=>{
    pastMatches[index]={session:match,choice:entry.choice===choice?null:choice};
    renderPast();
    const updated=pastList.children[index]?.querySelectorAll('button');
    if(updated)updated[['a','b','tie'].indexOf(choice)+1]?.focus({preventScroll:true});
   });
   actions.append(button);
  }
  article.append(title,description,actions);
  pastList.append(article);
 }
 const intro=element('p','Human-reviewed: '+tally.reviewed+' / '+
  tally.matches+' local signed matches. No unreviewed match is counted as a loss.');
 intro.className='note';
 const wrapper=element('div');wrapper.className='history-table-wrap';
 const table=element('table');table.className='history-table';
 const head=element('thead'),row=element('tr');
 for(const label of ['Declared agent / model','Reviewed','Wins','Ties','Losses','Win points']){
  const cell=element('th',label);cell.scope='col';row.append(cell);
 }
 head.append(row);table.append(head);
 const body=element('tbody');
 for(const agent of tally.scores){
  const line=element('tr');
  const name=element('th',agent.name+' · '+agent.model);
  name.scope='row';line.append(name);
  for(const value of [
   agent.played,agent.wins,agent.ties,agent.losses,
   agent.winRate===null?'—':(100*agent.winRate).toFixed(1)+'%'
  ])line.append(element('td',String(value)));
  body.append(line);
 }
 table.append(body);wrapper.append(table);
 pastScores.append(intro,wrapper);
 pastSection.hidden=false;pastExport.disabled=false;
 $('history-status').textContent=tally.matches+' actual local match(es) in this tab. '+
  tally.reviewed+' reviewed by you.';
}
pastExport.addEventListener('click',()=>{
 if(!pastMatches.length)return;
 const markdown=tournamentMarkdown(pastMatches);
 const blob=new Blob([markdown],{type:'text/markdown;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 link.href=url;link.download='24gotop-local-live-arena-review.md';link.hidden=true;
 document.body.append(link);
 try{link.click();}finally{link.remove();URL.revokeObjectURL(url);}
 $('history-status').textContent='Private review download requested; verify your local file.';
});

form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(pending||!auth||remaining<=0)return;
 const prompt=$('question').value,rounds=Number($('rounds').value);
 if(prompt.trim().length<5||prompt.length>2000||
    !Number.isInteger(rounds)||rounds<1||rounds>3||
    !$('cost-consent').checked){
  announce('Enter a question, choose 1–3 rounds and explicitly approve provider costs.',true);
  return;
 }
 pending=true;run.disabled=true;results.hidden=true;download.disabled=true;
 session=null;
 announce('Calling two model providers and checking signed agent participation. Your keys remain in Node.');
 try{
  const response=await fetch('/api/run',{
   method:'POST',credentials:'omit',redirect:'error',cache:'no-store',
   referrerPolicy:'no-referrer',
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth},
   body:JSON.stringify({prompt,rounds,confirmCosts:true})
  });
  const result=await response.json();
  if(typeof result.remainingRuns==='number'&&
     Number.isInteger(result.remainingRuns)&&result.remainingRuns>=0&&
     result.remainingRuns<=3)remaining=result.remainingRuns;
  if(!response.ok){
   announce(typeof result.error==='string'?result.error:'Local model run failed.',true);
   return;
  }
  load(result.session);
  pastMatches.push({session,choice:null});
  renderPast();
  announce('Real signed local match completed: '+session.rounds.length+
   ' round(s). '+remaining+' run(s) remain in this process. No transcript uploaded.');
  $('results-title').focus({preventScroll:true});
 }catch{
  announce('Local console request failed. Check that the loopback Node process is running.',true);
 }finally{
  pending=false;
  $('cost-consent').checked=false;
  run.disabled=!auth||remaining<=0;
 }
});
$('results-title').setAttribute('tabindex','-1');
select.addEventListener('change',render);
download.addEventListener('click',()=>{
 if(!session)return;
 const data=JSON.stringify(session,null,2)+'\n';
 const blob=new Blob([data],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;a.download='24gotop-local-agent-arena.json';a.hidden=true;
 document.body.append(a);
 try{a.click();}finally{a.remove();URL.revokeObjectURL(url);}
 announce('Transcript download requested. Check that your browser saved the local JSON file.');
});
