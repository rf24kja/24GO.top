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
  const ids=['headline','intro','explore','latest','developerTitle','developerDescription','locale','rss','feed','feedStatus'];
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
    document,location,URLSearchParams,Date,
    fetch(url){return new Promise(resolve=>requests.push({url,resolve}));}
  },{timeout:1000});
  return {nodes,buttons,requests,location};
}

const settle=()=>new Promise(resolve=>setImmediate(resolve));
const okPosts=posts=>({ok:true,json:async()=>({posts})});

test('local reader preserves accessible landmarks and keeps mobile GitHub navigation',()=>{
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<main class="shell" id="main-content">/);
  assert.match(html, /id="posts" aria-labelledby="latest"/);
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
