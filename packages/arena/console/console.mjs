import {validateArenaSession} from './arena-core.mjs';

const $=id=>document.getElementById(id);
const form=$('console-form'),run=$('run'),status=$('status');
const results=$('results'),select=$('round-choice'),download=$('download');
let auth=null,session=null,remaining=3,pending=false;
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
