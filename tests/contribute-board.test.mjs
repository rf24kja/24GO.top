import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicProposalSummaries,setupProposalBoard}
 from '../site/contribute-board.js';
const root=new URL('../site/',import.meta.url);
const page=readFileSync(new URL('contribute.html',root),'utf8');
const script=readFileSync(new URL('contribute-board.js',root),'utf8');
test('an explicit consent action is the only way to request public GitHub issues',()=>{
 assert.match(page,/id="loadProposals"/);
 assert.match(page,/GitHub receives the network request/);
 assert.match(page,/script type="module" src=".\/contribute-board.js"/);
 assert.doesNotMatch(script,/localStorage|sessionStorage|sendBeacon|document.cookie|innerHTML/);
});
test('only real public article proposal issue titles are returned, never PRs or arbitrary links',()=>{
 const rows=[
  {number:16,title:'Article proposal: Show a reproducible SQL issue',state:'open',created_at:'2026-10-31T10:00:00Z'},
  {number:17,title:'Article proposal: Published is different from closed',state:'closed',created_at:'2026-10-30T10:00:00Z'},
  {number:18,title:'Article proposal: This came from a PR',pull_request:{url:'x'},state:'open',created_at:'2026-10-30T10:00:00Z'},
  {number:19,title:'Unrelated issue',state:'open',created_at:'2026-10-30T10:00:00Z'},
  {number:20,title:'Article proposal: X',state:'open',created_at:'2026-10-30T10:00:00Z'}
 ];
 const summary=publicProposalSummaries(rows);
 assert.equal(summary.length,2);
 assert.equal(summary[0].url,'https://github.com/rf24kja/24GO.top/issues/16');
 assert.equal(summary[1].state,'closed');
 assert.deepEqual(summary.map(x=>x.number),[16,17]);
});
test('GitHub request never occurs before user clicks and renders text, not HTML',async()=>{
 class Node{
  constructor(){this.children=[];this.listeners={};this.disabled=false;this.textContent='';this.href='';}
  addEventListener(t,callback){this.listeners[t]=callback;}
  append(...v){this.children.push(...v);}
  replaceChildren(){this.children=[];}
 }
 const els=Object.fromEntries(['loadProposals','proposalBoardItems','proposalBoardStatus'].map(id=>[id,new Node()]));
 let called=0,options;
 setupProposalBoard({doc:{getElementById:id=>els[id],createElement:()=>new Node()},
  fetcher:async(url,opts)=>{
   called++;options={url,opts};
   return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify([{
    number:27,title:'Article proposal: Technical <script>alert(1)</script>',
    state:'open',created_at:'2026-10-31T11:00:00Z'
   }])};
  }});
 assert.equal(called,0);
 await els.loadProposals.listeners.click();
 assert.equal(called,1);
 assert.ok(options.url.startsWith('https://api.github.com/repos/rf24kja/24GO.top/issues?'));
 assert.equal(options.opts.credentials,'omit');
 assert.equal(els.proposalBoardItems.children.length,1);
 const link=els.proposalBoardItems.children[0].children[0].children[0];
 assert.equal(link.textContent,'Technical <script>alert(1)</script>');
 assert.equal(link.href,'https://github.com/rf24kja/24GO.top/issues/27');
});
