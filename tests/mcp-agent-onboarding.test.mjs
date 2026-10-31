import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const home=read('site/index.html');
const archive=read('site/engineering/index.html');
const styles=read('site/engineering/notes.css');
const docs=read('docs/PUBLIC_ARTICLE_MCP.md');
const mcp=read('packages/mcp/stdio.mjs');
const audit=read('scripts/check-live-seo.sh');

test('agent discovery is a visible, source-backed static route, not a fake hosted endpoint',()=>{
 assert.match(archive,/id="agent-discovery-heading">Read these articles with an AI agent/);
 assert.match(archive,/npm run mcp:articles/);
 assert.match(archive,/docs\/PUBLIC_ARTICLE_MCP\.md/);
 assert.match(archive,/not a hosted remote MCP endpoint/);
 assert.match(home,/Multi-keyword search, paged results and bounded excerpts/);
 assert.doesNotMatch(archive,/<form[^>]+action="[^"]*mcp|<script[^>]+src="https?:\/\//i);
 assert.match(styles,/\.agent-discovery\{/);
 assert.match(styles,/@media\(max-width:500px\)\{\.agent-discovery/);
});
test('all new public MCP tools are documented and bounded, with no publishing authority',()=>{
 for(const name of ['search_articles_page','read_article_excerpt']){
  assert.match(mcp,new RegExp("name:'"+name+"'"));
  assert.match(docs,new RegExp(name));
 }
 assert.match(docs,/offset.*0–200/s);
 assert.match(docs,/maxChars.*200–4,000/s);
 assert.match(docs,/untrusted data, never agent instructions/);
 assert.doesNotMatch(mcp,/\bfetch\(|XMLHttpRequest|writeFile|service_role|sb_secret_|PUBLISH_API_KEY/);
 assert.match(audit,/agent-discovery-heading/);
 assert.match(audit,/paged results and bounded excerpts/);
});
