import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../site/arena/arena.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../site/arena/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../site/arena/arena.css',import.meta.url),'utf8');
const browser=readFileSync(new URL('../scripts/check-agent-arena.mjs',import.meta.url),'utf8');

test('blind review starts with identities and timing masked, not merely hidden by CSS',()=>{
 assert.match(source,/revealedRounds=new Set\(\)/);
 assert.match(source,/revealedRounds\.clear\(\)/);
 assert.match(source,/revealed\?agent\.name:'Response '/);
 assert.match(source,/revealed\?agent\.model:/);
 assert.match(source,/revealed\?\s*'Response time:/);
 assert.ok(source.includes("'Timing hidden until revealed'"));
 assert.match(source,/identityStatus\.textContent=revealed\?/);
 assert.doesNotMatch(source,/innerHTML|\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon/);
});

test('reveal is explicit, reversible and independently scoped to each round',()=>{
 assert.match(html,/id="arena-reveal"[^>]*type="button" aria-pressed="false"/);
 assert.match(html,/id="arena-identity-status"[^>]*role="status" aria-live="polite"/);
 assert.match(source,/reveal\.addEventListener\('click'/);
 assert.match(source,/revealedRounds\.has\(round\)/);
 assert.match(source,/revealedRounds\.delete\(round\)/);
 assert.match(source,/revealedRounds\.add\(round\)/);
 assert.match(source,/reveal\.setAttribute\('aria-pressed',String\(revealed\)\)/);
 assert.match(css,/#arena-reveal\[aria-pressed="true"\]/);
 assert.match(browser,/independentBlind/);
 assert.match(browser,/rememberedReveal/);
 assert.match(browser,/reblinded/);
 for(const width of ['280','390','844','1440'])assert.ok(browser.includes(width));
});
