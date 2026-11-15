import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {approvedReadingArticles,normalizeReadingPath,encodeReadingPath,
 decodeReadingPath,changeReadingPath,readingPathMarkdown,readingPathMcpArguments,MAX_READING_PATH_ITEMS}
 from '../site/engineering/paths-logic.mjs';
import {PATH_LOCALES,PATH_UI,readingPathUiText,applyReadingPathLocale}
 from '../site/engineering/paths-i18n.mjs';

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
 assert.match(html,/id="path-copy-mcp"/);
 assert.match(html,/id="path-ui-locale"/);
 assert.match(html,/data-path-ui="heading"/);
 assert.match(html,/resolve_reading_path/);
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
 assert.match(ui,/if\(ticket===copyRevision\)[\s\S]*?copyStatus\.textContent=value\.startsWith/);
 assert.match(browser,/async function exerciseReadingPathsClipboardRace\(\)/);
 assert.match(browser,/await c\.call\(exerciseReadingPathsClipboardRace,sessionId\)/);
 assert.match(browser,/copyRace\.newestSuccess/);
 assert.match(browser,/copyRace\.agentCopied/);
 assert.match(browser,/copyRace\.staleTitleSafe/);
 assert.match(browser,/copyRace\.currentFallback/);
 assert.match(browser,/copyRace\.staleResetSafe/);
 assert.match(browser,/copyRace\.requests!==6/);
 assert.match(browser,/width:280,height:600/);
 assert.match(browser,/width:844,height:390/);
 assert.match(browser,/width:1440,height:900/);
});


test('reading-path Markdown download is a manual local-only action with responsive browser coverage',()=>{
 const html=readFileSync(new URL('../site/engineering/reading-paths/index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../site/engineering/paths.js',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../scripts/check-draft-lab-accessibility.mjs',import.meta.url),'utf8');
 assert.match(html,/<button id="path-download-markdown" type="button" disabled data-path-ui="downloadMarkdown">Download Markdown \.md<\/button>/);
 assert.match(ui,/el\('path-download-markdown'\)\.disabled=ids\.length===0/);
 assert.match(ui,/el\('path-copy-mcp'\)\.disabled=ids\.length===0/);
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
 assert.ok(!/(?<!\\)<img/.test(markdown),'no unescaped raw HTML tag');
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

test('local MCP tool input reproduces the same canonical ordered public reading path',()=>{
 const input=readingPathMcpArguments({title:'安全 • ภาษาไทย • Русский',ids:[second.id,first.id]},articles);
 const payload=JSON.parse(input);
 assert.deepEqual(Object.keys(payload),['url']);
 assert.ok(payload.url.startsWith('https://24go.top/engineering/reading-paths/#path='));
 assert.deepEqual(decodeReadingPath(payload.url.slice('https://24go.top/engineering/reading-paths/'.length),articles),
  normalizeReadingPath({title:'安全 • ภาษาไทย • Русский',ids:[second.id,first.id]},articles));
 assert.doesNotMatch(input,/bearer|apiKey|Authorization|localhost/i);
});
test('MCP argument copy rejects unreviewed paths and escapes untrusted titles',()=>{
 for(const input of [
  {title:'X',ids:['../../private']},
  {title:'Invalid\nTitle',ids:[first.id]},
  {title:'Duplicate',ids:[first.id,first.id]},
  {title:'Empty',ids:[]}
 ])assert.throws(()=>readingPathMcpArguments(input,articles),/invalid_reading_path/);
 const suspicious='[Markdown](https://evil.example) <script>';
 const output=readingPathMcpArguments({title:suspicious,ids:[first.id]},articles);
 const payload=JSON.parse(output);
 assert.ok(payload.url.includes('#path='));
 assert.equal(decodeReadingPath(payload.url.slice('https://24go.top/engineering/reading-paths/'.length),articles).title,suspicious);
 assert.ok(!output.includes('<script>'), 'JSON must contain a URL-encoded fragment only');
});


test('reading path interface has reviewed eight-language key coverage and safe English fallback',()=>{
 assert.deepEqual(PATH_LOCALES,['en','ru','th','es','fr','de','pt','zh']);
 const keys=Object.keys(PATH_UI.en);
 assert.ok(keys.length>=55);
 for(const locale of PATH_LOCALES){
  assert.deepEqual(Object.keys(PATH_UI[locale]).sort(),keys.slice().sort(),
   'no missing or unexpected UI key in '+locale);
  for(const key of keys){
   const value=readingPathUiText(locale,key);
   assert.equal(typeof value,'string');
   assert.ok(value.trim().length>0,locale+': '+key);
   assert.ok(!/[\u0000-\u001f\u007f]/u.test(value),'no control characters in UI strings');
   assert.ok(!/<script|onerror\s*=|javascript:/i.test(value),'no executable markup');
  }
 }
 assert.equal(readingPathUiText('missing','heading'),PATH_UI.en.heading);
 assert.throws(()=>readingPathUiText('en','unknown'),TypeError);
 assert.notEqual(readingPathUiText('ru','heading'),PATH_UI.en.heading);
 assert.notEqual(readingPathUiText('th','copyMcp'),PATH_UI.en.copyMcp);
});

test('locale application uses textContent, aria attributes and placeholders only',()=>{
 const dom=[
  {type:'text',key:'heading',textContent:''},
  {type:'label',key:'localeLabel',attributes:{}},
  {type:'placeholder',key:'filterPlaceholder',attributes:{}}
 ];
 const get=type=>dom.filter(x=>x.type===type).map(x=>({
  textContent:x.textContent,
  getAttribute(){return x.key;},
  setAttribute(key,value){x.attributes[key]=value;},
  attributes:x.attributes,
  ...x
 }));
 const doc={documentElement:{lang:'en'},querySelectorAll(q){
  if(q==='[data-path-ui]')return get('text');
  if(q==='[data-path-ui-label]')return get('label');
  if(q==='[data-path-ui-placeholder]')return get('placeholder');
  return [];
 }};
 // Use persistent mock objects for assertions.
 doc.querySelectorAll=q=>dom.filter(x=>(
  q==='[data-path-ui]'?x.type==='text':
  q==='[data-path-ui-label]'?x.type==='label':
  x.type==='placeholder'
 )).map(x=>({
  getAttribute(){return x.key;},
  set textContent(value){x.owner.textContent=value;},
  get textContent(){return x.owner.textContent;},
  setAttribute(k,v){x.attributes[k]=v;},attributes:x.attributes,owner:x
 }));
 assert.equal(applyReadingPathLocale(doc,'ru'),'ru');
 assert.equal(doc.documentElement.lang,'ru');
 assert.equal(dom[0].textContent,PATH_UI.ru.heading);
 assert.equal(dom[1].attributes['aria-label'],PATH_UI.ru.localeLabel);
 assert.equal(dom[2].attributes.placeholder,PATH_UI.ru.filterPlaceholder);
 assert.equal(applyReadingPathLocale(doc,'bad'),'en');
 assert.equal(dom[0].textContent,PATH_UI.en.heading);
});
