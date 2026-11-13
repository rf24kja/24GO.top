import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {approvedReadingArticles,normalizeReadingPath,encodeReadingPath,
 decodeReadingPath,changeReadingPath,readingPathMarkdown,MAX_READING_PATH_ITEMS}
 from '../site/engineering/paths-logic.mjs';

const feed=JSON.parse(readFileSync(new URL('../site/engineering/feed.json',import.meta.url),'utf8'));
const articles=approvedReadingArticles(feed);
const first=articles[0],second=articles[1],third=articles[2];
test('a real, reviewed JSON Feed supplies canonical, distinct article links',()=>{
 assert.ok(articles.length>=5);
 assert.ok(articles.every(item=>item.url==='https://24go.top/engineering/'+item.id));
 assert.equal(new Set(articles.map(x=>x.id)).size,articles.length);
 assert.equal(MAX_READING_PATH_ITEMS,10);
});
test('readers can create an ordered named path and share it without storage or tokens',()=>{
 const sample={title:'Secure documentation learning path',ids:[third.id,first.id,second.id]};
 const fragment=encodeReadingPath(sample,articles);
 assert.match(fragment,/^#path=%7B/);
 assert.deepEqual(decodeReadingPath(fragment,articles),normalizeReadingPath(sample,articles));
 assert.equal(decodeReadingPath('',articles),null);
 assert.ok(fragment.length<2200);
});
test('valid multi-language titles and emoji round-trip literally',()=>{
 const sample={title:'安全 • ภาษาไทย • Русский 🧪',ids:[first.id]};
 assert.equal(decodeReadingPath(encodeReadingPath(sample,articles),articles).title,sample.title);
});
test('no arbitrary external links, duplicates, unknown articles or unsupported versions',()=>{
 const values=[
  {title:'A',ids:['https://attacker.example/posts']},
  {title:'A',ids:['../../.env']},
  {title:'A',ids:['missing.html']},
  {title:'A',ids:[first.id,first.id]},
  {title:'A',ids:[]},
  {title:'A',ids:new Array(11).fill(first.id)},
  {title:'x'.repeat(81),ids:[first.id]},
  {title:'Bad\nTitle',ids:[first.id]},
  {title:'Bad\uD800Title',ids:[first.id]}
 ];
 for(const item of values)assert.throws(()=>encodeReadingPath(item,articles),/invalid_reading_path/);
 for(const bad of [
  '#path=not-json','#path=%ED%A0%80','#evil=123',
  '#path='+encodeURIComponent(JSON.stringify({v:2,title:'A',ids:[first.id]})),
  '#path='+encodeURIComponent(JSON.stringify({v:1,title:'A',ids:[first.id],token:'secret'})),
  '#path='+encodeURIComponent(JSON.stringify({v:1,title:'A',ids:['https://evil.example']})),
  '#path='+'x'.repeat(2200)
 ])assert.throws(()=>decodeReadingPath(bad,articles),/invalid_reading_path/);
});
test('feed ingestion refuses corrupted metadata, fake identities and extra origins',()=>{
 for(const mutation of [
  item=>({...item,url:'https://evil.example/engineering/'+first.id}),
  item=>({...item,url:'https://24go.top/engineering/../index.html'}),
  item=>({...item,title:'X'}),
  item=>({...item,url:'https://24go.top/engineering/'+first.id+'?tracking=1'}),
  item=>({...item,summary:'\u0000'})
 ]){
  const bad={items:[mutation({...feed.items[0]})]};
  assert.throws(()=>approvedReadingArticles(bad),/invalid_reading_path/);
 }
 assert.throws(()=>approvedReadingArticles({items:[feed.items[0],feed.items[0]]}));
});
test('adding, moving and removing produces explicit, stable reader order',()=>{
 const start=[];
 const a=changeReadingPath(start,first.id,'add',articles);
 const b=changeReadingPath(a,second.id,'add',articles);
 assert.deepEqual(b,[first.id,second.id]);
 assert.deepEqual(changeReadingPath(b,second.id,'up',articles),[second.id,first.id]);
 assert.deepEqual(changeReadingPath(b,first.id,'down',articles),[second.id,first.id]);
 assert.deepEqual(changeReadingPath(b,first.id,'add',articles),b);
 assert.deepEqual(changeReadingPath(b,second.id,'remove',articles),[first.id]);
 assert.throws(()=>changeReadingPath(b,'missing.html','add',articles),/invalid_reading_path/);
 assert.throws(()=>changeReadingPath(b,third.id,'publish',articles),/invalid_reading_path/);
});
test('Markdown sharing points only to the approved ordered public corpus',()=>{
 const output=readingPathMarkdown({title:'Learn in order',ids:[second.id,first.id]},articles);
 assert.ok(output.startsWith('# Learn in order\n\n1. '));
 assert.ok(output.includes('2. ['+first.title+']('+first.url+')'));
 assert.ok(output.indexOf(second.url)<output.indexOf(first.url));
 assert.doesNotMatch(output,/javascript:|<script|Bearer /i);
 assert.throws(()=>readingPathMarkdown({title:'Empty',ids:[]},articles));
});
test('the feature is a genuine accessible, browser-only workflow linked from archive',()=>{
 const html=readFileSync(new URL('../site/engineering/reading-paths/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../site/engineering/paths.js',import.meta.url),'utf8');
 assert.match(html,/id="path-catalog"/);
 assert.match(html,/id="path-selected"/);
 assert.match(html,/id="path-copy-link"/);
 assert.match(html,/id="path-copy-markdown"/);
 assert.match(html,/id="path-manual-copy"/);
 assert.match(html,/role="status"/);
 assert.match(html,/canonical" href="https:\/\/24go.top\/engineering\/reading-paths\/"/);
 assert.match(js,/loadStaticReadingPathCatalog\(\)/);
 assert.match(js,/encodeReadingPath\(/);
 assert.match(js,/navigator\.clipboard/);
 assert.match(js,/textContent/);
 assert.doesNotMatch(js,/\binnerHTML\b|localStorage|sessionStorage|document\.cookie|supabase/i);
 const archive=readFileSync(new URL('../site/engineering/index.html',import.meta.url),'utf8');
 assert.match(archive,/href="\.\/reading-paths\/"/);
});

test('interactive reading paths retain keyboard focus and mobile touch targets after DOM replacement',()=>{
 const js=readFileSync(new URL('../site/engineering/paths.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../site/engineering/paths.css',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../scripts/check-draft-lab-accessibility.mjs',import.meta.url),'utf8');
 assert.match(js,/const keepFocus=document.activeElement===add/);
 assert.match(js,/const keepFocus=selected.contains\(document.activeElement\)/);
 assert.match(js,/\(link\|\|title\)\.focus\(\)/);
 assert.match(js,/\(target\|\|title\)\.focus\(\)/);
 assert.match(css,/\.path-panel button\{[^}]*min-height:44px/);
 assert.match(browser,/waitForReadingPaths/);
 assert.match(browser,/exerciseReadingPaths/);
 assert.match(browser,/width:280,height:600/);
 assert.match(browser,/width:844,height:390/);
 assert.match(browser,/width:1440,height:900/);
 assert.match(browser,/minimumActionHeight>=43\.5/);
});

test('real Chromium runs delayed clipboard permission and focus regression on all reading-path viewports',()=>{
 const ui=readFileSync(new URL('../site/engineering/paths.js',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../scripts/check-draft-lab-accessibility.mjs',import.meta.url),'utf8');
 assert.match(ui,/let copyRevision=0/);
 assert.match(ui,/\+\+copyRevision/);
 assert.match(ui,/if\(ticket===copyRevision\)showManual\(value\)/);
 assert.match(ui,/if\(ticket===copyRevision\)[\s\S]*?copyStatus\.textContent='Copied\./);
 assert.match(browser,/async function exerciseReadingPathsClipboardRace\(\)/);
 assert.match(browser,/await c\.call\(exerciseReadingPathsClipboardRace,sessionId\)/);
 assert.match(browser,/copyRace\.newestSuccess/);
 assert.match(browser,/copyRace\.staleTitleSafe/);
 assert.match(browser,/copyRace\.currentFallback/);
 assert.match(browser,/copyRace\.staleResetSafe/);
 assert.match(browser,/width:280,height:600/);
 assert.match(browser,/width:844,height:390/);
 assert.match(browser,/width:1440,height:900/);
});


test('reading-path Markdown download is a manual local-only action with responsive browser coverage',()=>{
 const html=readFileSync(new URL('../site/engineering/reading-paths/index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../site/engineering/paths.js',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../scripts/check-draft-lab-accessibility.mjs',import.meta.url),'utf8');
 assert.match(html,/<button id="path-download-markdown" type="button" disabled>Download Markdown \.md<\/button>/);
 assert.match(ui,/el\('path-download-markdown'\)\.disabled=ids\.length===0/);
 assert.match(ui,/new Blob\(\[markdown\],\{type:'text\/markdown;charset=utf-8'\}\)/);
 assert.match(ui,/anchor\.download='24gotop-reading-path\.md'/);
 assert.match(ui,/URL\.createObjectURL\(blob\)/);
 assert.match(ui,/URL\.revokeObjectURL\(downloadUrl\)/);
 assert.match(ui,/readingPathMarkdown\(\{title:title\.value,ids\},approved\)/);
 assert.match(browser,/async function exerciseReadingPathsDownload\(\)/);
 assert.match(browser,/await c\.call\(exerciseReadingPathsDownload,sessionId\)/);
 for(const property of ['validContents','cleanedUp','noStorageWrite','originallyEnabled']){
  assert.ok(browser.includes('downloaded.'+property));
 }
 assert.doesNotMatch(ui,/\blocalStorage\b|\bsessionStorage\b|XMLHttpRequest|sendBeacon|document\.cookie/i);
});


test('shared path titles remain inert Markdown text even with external links and HTML',()=>{
 const title='[Fake](https://evil.example) <img src=x> me@example.com';
 const received=decodeReadingPath(encodeReadingPath({title,ids:[first.id]},articles),articles);
 assert.equal(received.title,title,'share fragments may carry untrusted text');
 const markdown=readingPathMarkdown(received,articles);
 assert.ok(markdown.startsWith('# \\[Fake\\]'));
 assert.ok(markdown.includes('https\\://evil\\.example'));
 assert.ok(markdown.includes('\\<img src=x\\>'));
 assert.ok(markdown.includes('me\\@example\\.com'));
 assert.ok(!markdown.includes('https://evil.example'),'no raw external autolink token');
 assert.ok(!markdown.includes('<img'),'no raw HTML markup');
 const articleLinks=[...markdown.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(x=>x[1]);
 assert.deepEqual(articleLinks,[first.url],'only canonical reviewed article links are clickable');
});

test('multilingual Markdown path titles keep ordinary punctuation readable',()=>{
 const title='ภาษาไทย • Русский: 2026. [reading] <tips> @user';
 const markdown=readingPathMarkdown({title,ids:[first.id]},articles);
 assert.ok(markdown.includes('ภาษาไทย • Русский\\: 2026\\.'));
 assert.ok(markdown.includes('\\[reading\\] \\<tips\\> \\@user'));
 assert.equal(markdown.match(/\]\(https:\/\//g)?.length,1);
});
