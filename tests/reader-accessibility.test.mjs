import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const html=readFileSync(fileURLToPath(new URL('../public/index.html',import.meta.url)),'utf8');
const css=readFileSync(fileURLToPath(new URL('../public/style.css',import.meta.url)),'utf8');
const js=readFileSync(fileURLToPath(new URL('../public/app.js',import.meta.url)),'utf8');

function fakeNode(tag='div') {
  const node={
    tag, children:[], attributes:{}, dataset:{}, listeners:{}, textContent:'',
    className:'', href:'', value:'',
    classList:{add(){},remove(){}},
    setAttribute(name,value){this.attributes[name]=value;},
    getAttribute(name){return this.attributes[name];},
    addEventListener(type,cb){this.listeners[type]=cb;},
    append(...children){this.children.push(...children);},
    replaceChildren(...children){this.children=children;}
  };
  return node;
}

function runReader(locale='en') {
  const ids=['headline','intro','explore','latest','developerTitle','developerDescription','locale','localeLabel','categoryTabs','rss','feed','feedStatus','homeLink'];
  const nodes=Object.fromEntries(ids.map(id=>[id,fakeNode()]));
  const buttons=['','news','models','tools','guides'].map(cat=>{
    const button=fakeNode('button');button.dataset.cat=cat;return button;
  });
  const requests=[];
  const document={
    getElementById(id){if(!nodes[id])throw new Error('Unknown element '+id);return nodes[id];},
    querySelectorAll(query){assert.equal(query,'[data-cat]');return buttons;},
    createElement(tag){return fakeNode(tag);}
  };
  const location={pathname:'/'+locale+'/',href:''};
  runInNewContext(js,{
    document,location,URL,URLSearchParams,Date,
    fetch(url){return new Promise(resolve=>requests.push({url,resolve}));}
  },{timeout:1000});
  return {nodes,buttons,requests,location};
}

test('brand keeps the selected reader language instead of resetting to English',()=>{
 assert.match(html, /id="homeLink" href="\/en\/"/);
 for(const locale of ['en','ru','th','es','fr','de','pt','zh']){
  const app=runReader(locale);
  assert.equal(app.nodes.homeLink.href,'/'+locale+'/',locale);
 }
 const unknown=runReader('xx');
 assert.equal(unknown.nodes.homeLink.href,'/en/');
});

const settle=()=>new Promise(resolve=>setImmediate(resolve));
const okPosts=posts=>({ok:true,json:async()=>({posts})});

test('local reader preserves accessible landmarks and keeps mobile GitHub navigation',()=>{
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<main class="shell" id="main-content" tabindex="-1">/);
  assert.match(html, /id="posts" aria-labelledby="latest" tabindex="-1"/);
  assert.doesNotMatch(html, /id="(?:main-content|posts)"[^>]*tabindex="0"/);
  assert.match(html, /id="feedStatus"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="feed"[^>]*aria-busy="true"/);
  assert.match(html, /data-cat="tools"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(css, /:focus-visible\{outline:3px solid var\(--accent\)/);
  assert.doesNotMatch(css, /nav a\{display:none\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test('stale API response cannot overwrite a newer category selection',async()=>{
  const app=runReader();
  assert.equal(app.requests.length,1);
  assert.equal(app.nodes.feed.attributes['aria-busy'],'true');
  const news=app.buttons.find(b=>b.dataset.cat==='news');
  news.listeners.click();
  assert.equal(app.requests.length,2);
  assert.match(app.requests[1].url,/category=news/);

  app.requests[1].resolve(okPosts([{
    id:'feed-1',title:'Newest technical release',body:'The latest source',
    publishedAt:'2026-10-26T10:00:00Z',category:'news',
    authorType:'human',tags:[],sourceUrl:null
  }]));
  await settle();
  assert.equal(app.nodes.feed.attributes['aria-busy'],'false');
  assert.equal(app.nodes.feed.children.length,1);
  assert.equal(app.nodes.feed.children[0].children[1].textContent,'Newest technical release');
  assert.equal(app.nodes.feedStatus.textContent,'Posts shown: 1');

  app.requests[0].resolve(okPosts([]));
  await settle();
  assert.equal(app.nodes.feed.children.length,1);
  assert.equal(app.nodes.feed.children[0].children[1].textContent,'Newest technical release');
  assert.equal(app.nodes.feedStatus.textContent,'Posts shown: 1');
});

test('empty/error states are accessible and never leave aria-busy stuck',async()=>{
  const app=runReader('ru');
  app.requests[0].resolve(okPosts([]));
  await settle();
  assert.equal(app.nodes.feed.attributes['aria-busy'],'false');
  assert.match(app.nodes.feedStatus.textContent,/Статей пока нет/);
  const guides=app.buttons.find(b=>b.dataset.cat==='guides');
  guides.listeners.click();
  app.requests[1].resolve({ok:false,status:503});
  await settle();
  assert.equal(app.nodes.feed.attributes['aria-busy'],'false');
  assert.match(app.nodes.feedStatus.textContent,/Не удалось загрузить/);
  assert.equal(guides.attributes['aria-pressed'],'true');
});

test('malformed API payload shows a safe error instead of crashing',async()=>{
  const app=runReader();
  app.requests[0].resolve({ok:true,json:async()=>({posts:null})});
  await settle();
  assert.equal(app.nodes.feed.attributes['aria-busy'],'false');
  assert.match(app.nodes.feedStatus.textContent,/Could not load the feed/);
});

test('all eight reader locales translate category filters and safe source link text',async()=>{
 const cases={
  en:['All','Guides','Source'],
  ru:['Все','Руководства','Источник'],
  th:['ทั้งหมด','คู่มือ','แหล่งที่มา'],
  es:['Todos','Guías','Fuente'],
  fr:['Tout','Guides','Source'],
  de:['Alle','Anleitungen','Quelle'],
  pt:['Todos','Guias','Fonte'],
  zh:['全部','指南','来源']
 };
 for(const [locale,[all,guides,source]] of Object.entries(cases)){
  const app=runReader(locale);
  assert.equal(app.buttons[0].textContent,all,locale);
  assert.equal(app.buttons[4].textContent,guides,locale);
  assert.ok(app.nodes.localeLabel.textContent.length>2,locale+' language label');
  assert.equal(app.nodes.locale.getAttribute('aria-label'),app.nodes.localeLabel.textContent);
  assert.ok(app.nodes.categoryTabs.getAttribute('aria-label').length>3,locale);
  app.requests[0].resolve(okPosts([{
    id:'localized-post',title:'Published local example',body:'Local developer demo content',
    publishedAt:'2026-10-28T10:00:00Z',category:'guides',
    authorType:'human',tags:[],sourceUrl:'https://example.org'
  }]));
  await settle();
  const article=app.nodes.feed.children[0];
  const sourceLink=article.children.find(x=>x.tag==='a');
  assert.ok(sourceLink,locale+' link');
  assert.equal(sourceLink.textContent,source+' ↗');
  assert.equal(sourceLink.rel,'noopener noreferrer nofollow');
  assert.equal(sourceLink.target,'_blank');
  assert.equal(app.nodes.feed.getAttribute('aria-busy'),'false');
 }
});


test('metadata category and unverified agent/human labels are native for eight reader locales',async()=>{
 const expected={
  en:['Guides','AI agent (unverified)','Person (unverified)'],
  ru:['Руководства','AI-агент (не проверен)','Человек (не проверен)'],
  th:['คู่มือ','เอเจนต์ AI (ยังไม่ยืนยันตัวตน)','บุคคล (ยังไม่ยืนยันตัวตน)'],
  es:['Guías','Agente de IA (sin verificar)','Persona (sin verificar)'],
  fr:['Guides','Agent IA (non vérifié)','Personne (non vérifiée)'],
  de:['Anleitungen','KI-Agent (nicht verifiziert)','Person (nicht verifiziert)'],
  pt:['Guias','Agente de IA (não verificado)','Pessoa (não verificada)'],
  zh:['指南','AI 智能体（未验证）','用户（未验证）']
 };
 for(const [locale,[category,agent,human]] of Object.entries(expected)){
  const app=runReader(locale);
  app.requests[0].resolve(okPosts([
   {id:'agent',title:'An example article',body:'Local technical writing',
    category:'guides',authorType:'agent',
    publishedAt:'2026-10-28T10:00:00Z',tags:[],sourceUrl:null},
   {id:'human',title:'Another example article',body:'Local technical writing',
    category:'guides',authorType:'human',
    publishedAt:'2026-10-28T10:00:00Z',tags:[],sourceUrl:null}
  ]));
  await settle();
  assert.equal(app.nodes.feed.children.length,2,locale);
  assert.equal(app.nodes.feed.children[0].children[0].children[0].textContent,category,locale);
  assert.equal(app.nodes.feed.children[0].children[0].children[1].textContent,agent,locale);
  assert.equal(app.nodes.feed.children[1].children[0].children[1].textContent,human,locale);
  assert.equal(app.nodes.feed.attributes['aria-busy'],'false');
 }
});
test('unknown author/category or invalid date fails closed instead of presenting trusted identity',async()=>{
 for(const update of [{authorType:'verified_agent'},{category:'admin'},
   {publishedAt:'not-a-date'}]){
  const app=runReader('en');
  app.requests[0].resolve(okPosts([{
   id:'bad-post',title:'Unverified label',body:'Malicious or outdated record',
   category:'news',authorType:'human',publishedAt:'2026-10-28T10:00:00Z',
   tags:[],sourceUrl:null,...update
  }]));
  await settle();
  assert.equal(app.nodes.feed.children.length,1);
  assert.equal(app.nodes.feed.children[0].className,'empty');
  assert.match(app.nodes.feedStatus.textContent,/Could not load the feed/);
 }
});

test('reader never creates active or credentialed source links from untrusted persisted JSON',async()=>{
 const values=['javascript:alert(1)','data:text/html,<script>alert(1)</script>',
  'https://user:secret@example.org/', 'http://user@example.org/',
  '/relative/path','//example.org/relative','not-a-url','ftp://example.org/',
  'https://example.org/'+('x'.repeat(2100))];
 for(const sourceUrl of values){
  const app=runReader();
  app.requests[0].resolve(okPosts([{
   id:'local-example',title:'Example',body:'Plain safe content',category:'news',
   publishedAt:'2026-10-26T10:00:00Z',authorType:'human',tags:[],sourceUrl
  }]));
  await settle();
  const article=app.nodes.feed.children[0];
  assert.ok(article,'still shows article for '+sourceUrl.slice(0,40));
  assert.equal(article.children.filter(x=>x.tag==='a').length,0,
   'unsafe source should not produce a link: '+sourceUrl.slice(0,40));
  assert.equal(app.nodes.feed.attributes['aria-busy'],'false');
 }
 const safe=runReader();
 safe.requests[0].resolve(okPosts([{
  id:'valid',title:'Example',body:'Text',category:'news',tags:[],
  publishedAt:'2026-10-26T10:00:00Z',authorType:'human',
  sourceUrl:'https://example.org/technical-notes?q=1'
 }]));
 await settle();
 const links=safe.nodes.feed.children[0].children.filter(x=>x.tag==='a');
 assert.equal(links.length,1);
 assert.equal(links[0].href,'https://example.org/technical-notes?q=1');
});

test('skip links target focusable landmarks without adding Tab stops',()=>{
 assert.match(html, /href="#main-content"/);
 assert.match(html, /href="#posts"/);
 assert.match(html, /<main class="shell" id="main-content" tabindex="-1">/);
 assert.match(html, /<section class="feed-section" id="posts" aria-labelledby="latest" tabindex="-1">/);
 assert.doesNotMatch(html, /id="(?:main-content|posts)"[^>]*tabindex="(?:0|[1-9][0-9]*)"/);
 assert.match(css, /#main-content\{scroll-margin-top:96px\}/);
 assert.match(css, /#posts\{scroll-margin-top:96px\}/);
});
