import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicProposalSummaries,githubHasNextPage,setupProposalBoard}
 from '../site/contribute-board.js';
const root=new URL('../site/',import.meta.url);
const page=readFileSync(new URL('contribute.html',root),'utf8');
const script=readFileSync(new URL('contribute-board.js',root),'utf8');
class Node{
 constructor(){this.children=[];this.listeners={};this.disabled=false;
  this.hidden=false;this.textContent='';this.href='';}
 addEventListener(t,callback){this.listeners[t]=callback;}
 append(...v){this.children.push(...v);}
 replaceChildren(){this.children=[];}
}
function ui(fetcher){
 const els=Object.fromEntries(
  ['loadProposals','loadOlderProposals','proposalBoardItems','proposalBoardStatus']
  .map(id=>[id,new Node()]));
 setupProposalBoard({doc:{getElementById:id=>els[id],
  createElement:()=>new Node()},fetcher});
 return els;
}
const issue=(number,title='Reproducible technical guidance')=>({
 number,title:'Article proposal: '+title,state:'open',
 created_at:'2026-10-31T11:00:00Z'
});
function response(rows,{next=false,length=null}={}){
 return {ok:true,headers:{get:key=>
   key==='link'&&next?
    '<https://api.github.com/repos/rf24kja/24GO.top/issues?page=2>; rel="next"':
    key==='content-length'?length:null},
  text:async()=>JSON.stringify(rows)};
}
test('network requests require an explicit user action; no content is auto-transmitted',()=>{
 assert.match(page,/id="loadProposals"/);
 assert.match(page,/id="loadOlderProposals"[^>]*hidden/);
 assert.match(page,/GitHub receives the network request/);
 assert.match(page,/script type="module" src="\.\/contribute-board.js"/);
 assert.doesNotMatch(script,/localStorage|sessionStorage|sendBeacon|document.cookie|innerHTML/);
});
test('only public proposal issue titles, never PRs or arbitrary URLs, are shown',()=>{
 const rows=[issue(16,'Show a reproducible SQL issue'),
  {...issue(17,'Published is different from closed'),state:'closed'},
  {...issue(18,'This came from a PR'),pull_request:{url:'x'}},
  {number:19,title:'Unrelated issue',state:'open',created_at:'2026-10-30T10:00:00Z'},
  issue(20,'X')];
 const items=publicProposalSummaries(rows);
 assert.deepEqual(items.map(x=>x.number),[16,17]);
 assert.equal(items[0].url,'https://github.com/rf24kja/24GO.top/issues/16');
 assert.equal(items[1].state,'closed');
 assert.throws(()=>publicProposalSummaries(Array(61).fill(issue(1))));
});
test('GitHub Link only allows another fixed same-origin API page, never an arbitrary URL',async()=>{
 assert.equal(githubHasNextPage('<https://evil.example/a>; rel="next"'),true);
 assert.equal(githubHasNextPage('<https://api.github.com/a>; rel="last"'),false);
 assert.equal(githubHasNextPage('x'.repeat(5000)),false);
 const requested=[];
 const els=ui(async(url,opts)=>{
  requested.push({url,opts});
  return requested.length===1?
   response([issue(27,'Technical <script>alert(1)</script>')],{next:true}):
   response([issue(27),issue(28,'Second valid proposal')]);
 });
 assert.equal(requested.length,0);
 assert.equal(els.loadOlderProposals.hidden,true);
 await els.loadProposals.listeners.click();
 assert.equal(requested.length,1);
 assert.equal(els.loadOlderProposals.hidden,false);
 const link=els.proposalBoardItems.children[0].children[0].children[0];
 assert.equal(link.textContent,'Technical <script>alert(1)</script>');
 assert.equal(link.href,'https://github.com/rf24kja/24GO.top/issues/27');
 assert.equal(requested[0].opts.credentials,'omit');
 await els.loadOlderProposals.listeners.click();
 assert.equal(requested.length,2);
 assert.equal(new URL(requested[1].url).origin,'https://api.github.com');
 assert.equal(new URL(requested[1].url).searchParams.get('page'),'2');
 assert.equal(els.proposalBoardItems.children.length,2,'duplicates across pages excluded');
 assert.equal(els.loadOlderProposals.hidden,true);
});
test('user-initiated paging stops after four pages with no automatic loops',async()=>{
 let calls=0;
 const els=ui(async()=>{calls++;return response([],{next:true});});
 await els.loadProposals.listeners.click();
 for(let n=0;n<3;n++)await els.loadOlderProposals.listeners.click();
 assert.equal(calls,4);
 assert.equal(els.loadOlderProposals.hidden,true);
 await els.loadOlderProposals.listeners.click();
 assert.equal(calls,4);
 assert.match(els.proposalBoardStatus.textContent,/Browse the full GitHub/);
});
test('card limit prevents extra requests even when GitHub advertises another page',async()=>{
 let calls=0;
 const els=ui(async()=>{calls++;return response(Array.from({length:12},(_,i)=>issue(i+1)),{next:true});});
 await els.loadProposals.listeners.click();
 assert.equal(els.proposalBoardItems.children.length,12);
 assert.equal(els.loadOlderProposals.hidden,true);
 await els.loadOlderProposals.listeners.click();
 assert.equal(calls,1);
});
test('partial results survive rate limits and excessive response budgets',async()=>{
 let calls=0;
 const els=ui(async()=>{calls++;
  return calls===1?response([issue(80)],{next:true}):
   response([issue(81)],{length:'9999999'});});
 await els.loadProposals.listeners.click();
 await els.loadOlderProposals.listeners.click();
 assert.equal(els.proposalBoardItems.children.length,1);
 assert.equal(els.loadOlderProposals.hidden,false);
 assert.match(els.proposalBoardStatus.textContent,/remain visible/);
 await els.loadOlderProposals.listeners.click();
 assert.equal(calls,3,'retries remain explicitly user-triggered');
});
