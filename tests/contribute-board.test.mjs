import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicProposalSummaries,githubHasNextPage,setupProposalBoard,
 readBoundedPublicIssues} from '../site/contribute-board.js';
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
 const headers={'content-type':'application/json'};
 if(next)headers.link=
  '<https://api.github.com/repos/rf24kja/24GO.top/issues?page=2>; rel="next"';
 if(length!==null)headers['content-length']=length;
 return new Response(JSON.stringify(rows),{status:200,headers});
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

test('public GitHub metadata stream rejects oversized bytes and cancels the reader',async()=>{
 let cancelled=false,released=false,reads=0;
 const reader={
  async read(){reads++;return {done:false,value:new Uint8Array(262145)};},
  async cancel(){cancelled=true;},
  releaseLock(){released=true;}
 };
 const response={
  status:200,redirected:false,
  headers:{get:key=>key==='content-type'?'application/json':null},
  body:{getReader:()=>reader}
 };
 await assert.rejects(readBoundedPublicIssues(response),/metadata too large/);
 assert.equal(reads,1,'do not continue consuming oversized responses');
 assert.equal(cancelled,true);
 assert.equal(released,true);
});

test('metadata stream rejects invalid UTF-8, HTML, redirects and missing body',async()=>{
 const type={'content-type':'application/json'};
 const attempts=[
  new Response(Uint8Array.of(0xff),{status:200,headers:type}),
  new Response('[]',{status:200,headers:{'content-type':'text/html'}}),
  new Response('[]',{status:404,headers:type}),
  {status:200,redirected:true,headers:{get:()=> 'application/json'},
   body:{getReader:()=>{throw Error('redirect must not be read');}}},
  {status:200,headers:{get:()=> 'application/json'}}
 ];
 for(const candidate of attempts){
  await assert.rejects(readBoundedPublicIssues(candidate));
 }
});

test('bounded public JSON stream accepts chunked small results',async()=>{
 const data=JSON.stringify([issue(101,'Safe streamed proposal')]);
 const bytes=new TextEncoder().encode(data);
 let index=0;
 const reader={
  async read(){
   if(index===bytes.length)return {done:true};
   const value=bytes.subarray(index,Math.min(bytes.length,index+3));
   index+=value.length;return {done:false,value};
  },
  releaseLock(){}
 };
 const r={status:200,redirected:false,
  headers:{get:k=>k==='content-type'?'application/vnd.github+json':null},
  body:{getReader:()=>reader}};
 assert.deepEqual(await readBoundedPublicIssues(r),[issue(101,'Safe streamed proposal')]);
});

test('a later malformed streamed page cannot remove already displayed issues',async()=>{
 let calls=0;
 const els=ui(async()=>{
  calls++;
  return calls===1?response([issue(50,'Confirmed first proposal')],{next:true}):
   new Response('<script>malformed</script>',{status:200,
    headers:{'content-type':'application/json'}});
 });
 await els.loadProposals.listeners.click();
 await els.loadOlderProposals.listeners.click();
 assert.equal(calls,2);
 assert.equal(els.proposalBoardItems.children.length,1);
 assert.match(els.proposalBoardStatus.textContent,/remain visible/);
});
