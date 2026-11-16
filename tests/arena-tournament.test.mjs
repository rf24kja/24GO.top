import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateArenaSession} from '../site/arena/arena-core.mjs';
import {aggregateTournament,tournamentMarkdown} from '../site/arena/tournament-core.mjs';

const match=({nameA='Agent Alpha',nameB='Agent Bravo',modelA='model-a',
 modelB='model-b',prompt='A fair and reproducible technical evaluation',id=1}={})=>
 validateArenaSession({
  version:1,source:'local-byok',
  createdAt:'2026-11-15T09:15:00.000Z',
  prompt,agents:[{id:'a',name:nameA,model:modelA},{id:'b',name:nameB,model:modelB}],
  rounds:[{number:1,responses:[
   {agentId:'a',text:'Evidence from participant A, match '+id,durationMs:125},
   {agentId:'b',text:'Evidence from participant B, match '+id,durationMs:135}
  ]}]
 });
test('scores use human-reviewed local matches only and normalize uneven participation',()=>{
 const items=[
  {session:match({id:1}),choice:'a'},
  {session:match({id:2}),choice:'tie'},
  {session:match({nameB:'Agent Charlie',modelB:'model-c',id:3}),choice:'b'},
  {session:match({nameA:'Agent Charlie',modelA:'model-c',id:4}),choice:null}
 ];
 const report=aggregateTournament(items);
 assert.equal(report.matches,4);
 assert.equal(report.reviewed,3);
 const alpha=report.scores.find(x=>x.name==='Agent Alpha');
 assert.equal(alpha.played,3);
 assert.equal(alpha.wins,1);
 assert.equal(alpha.losses,1);
 assert.equal(alpha.ties,1);
 assert.equal(alpha.winRate,.5);
 const bravo=report.scores.find(x=>x.name==='Agent Bravo');
 assert.equal(bravo.played,2);
 assert.equal(bravo.wins,0);
 assert.equal(bravo.ties,1);
 assert.equal(bravo.losses,1);
 assert.equal(bravo.winRate,.25);
 const charlie=report.scores.find(x=>x.name==='Agent Charlie');
 assert.equal(charlie.played,1);
 assert.equal(charlie.wins,1);
 assert.equal(charlie.losses,0);
 assert.equal(charlie.winRate,1);
 assert.equal(report.scores[0].name,'Agent Charlie');
 assert.equal(Object.isFrozen(report.scores),true);
});
test('unrated transcripts are excluded from wins/losses and do not invent global ranking',()=>{
 const items=[{session:match(),choice:null}];
 const result=aggregateTournament(items);
 assert.equal(result.reviewed,0);
 assert.equal(result.scores.length,2);
 assert.ok(result.scores.every(x=>x.played===0&&x.winRate===null));
 const md=tournamentMarkdown(items);
 assert.match(md,/NOT a platform-verified agent ranking/);
 assert.match(md,/Not yet reviewed/);
 assert.match(md,/Win points/);
 assert.match(md,/\| — \|/);
 assert.doesNotMatch(md,/Evidence from participant/);
 assert.doesNotMatch(md,/reproducible technical evaluation/);
});
test('same self-declared model names cannot erase match seat identity',()=>{
 const good=match();
 for(const invalid of [
  [{session:good,choice:'other'}],
  [{session:good,choice:'win'}],
  [{session:good,choice:undefined}],
  [{session:good,choice:null,credentials:'forbidden'}],
  [{session:match({nameA:'Duplicate',modelA:'same',nameB:'Duplicate',modelB:'same'}),choice:'a'}],
  Array.from({length:9},(_,i)=>({session:match({id:i}),choice:'tie'}))
 ])assert.throws(()=>aggregateTournament(invalid),TypeError);
 assert.throws(()=>aggregateTournament('not an array'),TypeError);
});
test('private Markdown report omits prompts, model answer bodies and keys, escapes pipes',()=>{
 const data=[
  {session:match({nameA:'Agent | One',nameB:'Agent Two',prompt:'secret confidential prompt'}),choice:'a'},
  {session:match({nameA:'Agent | One',nameB:'Agent Three',modelB:'model-c',id:2}),choice:'tie'}
 ];
 const md=tournamentMarkdown(data);
 assert.ok(md.includes('Agent \\| One'));
 assert.match(md,/Human-reviewed: 2/);
 assert.match(md,/50\.0%|75\.0%/);
 assert.doesNotMatch(md,/confidential prompt/);
 assert.doesNotMatch(md,/Evidence from/);
 assert.doesNotMatch(md,/Bearer |PRIVATE KEY|API_KEY/);
});
test('browser viewer exposes bounded import, per-match votes and local-only export',()=>{
 const ui=readFileSync(new URL('../site/arena/tournament.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('../site/arena/index.html',import.meta.url),'utf8');
 assert.match(html,/id="arena-tournament-files"/);
 assert.match(html,/\smultiple>/);
 assert.match(html,/id="arena-tournament-export"/);
 assert.match(html,/src="\.\/tournament\.mjs"/);
 assert.match(ui,/new Set\(raw\)/);
 assert.match(ui,/MAX_ARENA_BYTES/);
 assert.match(ui,/chosen\.length>8/);
 assert.match(ui,/epoch/);
 assert.match(ui,/\.textContent=/);
 assert.doesNotMatch(ui,/innerHTML|localStorage|sessionStorage|fetch\(|sendBeacon|eval\(/);
 assert.match(ui,/URL\.revokeObjectURL/);
 assert.match(html,/not verified 24GOTOP accounts/);
});

test('tournament judges can inspect real responses while all participant labels stay blind',()=>{
 const ui=readFileSync(new URL('../site/arena/tournament.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('../site/arena/index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../site/arena/arena.css',import.meta.url),'utf8');
 const chrome=readFileSync(new URL('../scripts/check-agent-arena.mjs',import.meta.url),'utf8');
 assert.match(ui,/create\('details','arena-tournament-review'\)/);
 assert.match(ui,/create\('p','arena-tournament-question','Technical question: '/);
 assert.match(ui,/create\('pre','arena-tournament-answer',round\.responses\[i\]\.text\)/);
 assert.match(ui,/create\('strong','','Response '/);
 assert.match(ui,/revealedMatches=new Set\(\)/);
 assert.match(ui,/revealedScores=false/);
 assert.match(ui,/JSON\.stringify\(\[agent\.name,agent\.model\]\)/);
 assert.match(ui,/JSON\.stringify\(\[row\.name,row\.model\]\)/);
 assert.match(ui,/aliases\.get\(/);
 assert.match(ui,/review\.open=opened\.has\(index\)/);
 assert.match(html,/id="arena-tournament-score-reveal"/);
 assert.match(html,/aria-pressed="false" disabled>Reveal scoreboard identities/);
 assert.match(css,/\.arena-tournament-answer\{[^}]*overflow-wrap:anywhere/);
 assert.match(css,/\.arena-tournament-review summary/);
 assert.match(chrome,/reviewStaysOpen/);
 assert.match(chrome,/window\.tournamentXss!==true/);
 assert.match(chrome,/namesShown/);
 assert.match(chrome,/scoreRehidden/);
 assert.doesNotMatch(ui,/innerHTML|localStorage|sessionStorage|\bfetch\s*\(|sendBeacon|eval\(/);
});
