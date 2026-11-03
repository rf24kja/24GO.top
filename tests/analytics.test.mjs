import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const code = readFileSync(new URL('../site/analytics.js', import.meta.url), 'utf8');
const KEY = '24gotop_analytics_consent_v1';
function setup({ path = '/', choice, language = 'en', storageBlocked = false } = {}) {
  class Element {
    constructor(tag) { this.tagName=tag; this.children=[]; this.dataset={}; this.events={}; this.classList={add: value => {this.masked=value;}}; }
    appendChild(el) { this.children.push(el); el.parent=this; return el; }
    append(...elements) { elements.forEach(el => this.appendChild(el)); }
    setAttribute(key,value) { this[key]=value; }
    addEventListener(key,fn) { this.events[key]=fn; }
    remove() { this.parent.children=this.parent.children.filter(el => el!==this); }
    focus() { this.focused=true; }
    click() { this.events.click(); }
  }
  const head=new Element('head'),body=new Element('body'),footer=new Element('footer');body.append(footer);
  const fields=[new Element('input')],events={},storage=new Map(choice ? [[KEY,choice]] : []);
  let observer;
  const document={head,body,documentElement:{lang:language},referrer:'https://24go.top/?private=ignored',
    createElement: tag=>new Element(tag),querySelector: selector=>selector==='footer'?footer:null,
    querySelectorAll: ()=>fields,get scripts(){return head.children.filter(el=>el.tagName==='script');}};
  const window={addEventListener:(name,fn)=>{events[name]=fn;}};
  const context={document,window,location:new URL('https://24go.top'+path),URL,Date,
    localStorage:{getItem:key=>{if(storageBlocked)throw Error('denied');return storage.get(key)??null;},setItem:(key,value)=>{if(storageBlocked)throw Error('denied');storage.set(key,value);}},
    MutationObserver:class{constructor(fn){observer=fn;}observe(){}}};
  runInNewContext(code,context,{timeout:5000});
  return {document,window,storage,footer,fields,events,Element,
    notice:()=>body.children.find(el=>Object.hasOwn(el.dataset,'metrikaConsent')),
    calls:()=>Array.from(window.ym?.a||[],args=>Array.from(args)),
    repeat:()=>runInNewContext(code,context,{timeout:5000}),observe:()=>observer?.()};
}

test('fresh visitor gets a choice but no provider request or counter initialization',()=>{
  const app=setup();assert.ok(app.notice());assert.equal(app.document.scripts.length,0);assert.equal(app.window.ym,undefined);
});
test('accept uses the exact counter and requested features once, excluding query and hash',()=>{
  const app=setup({path:'/?private=not-for-analytics#private'});
  app.notice().children[2].children[1].click();
  assert.equal(app.document.scripts.length,1);
  assert.equal(app.document.scripts[0].src,'https://mc.yandex.ru/metrika/tag.js?id=114039802');
  const [id,method,options]=app.calls()[0];assert.equal(id,114039802);assert.equal(method,'init');
  for(const key of ['ssr','webvisor','clickmap','accurateTrackBounce','trackLinks'])assert.equal(options[key],true);
  assert.equal(options.ecommerce,'dataLayer');assert.equal(options.url,'https://24go.top/');assert.equal(options.referrer,'https://24go.top/');
  assert.equal(app.fields[0].masked,'ym-disable-keys');app.repeat();assert.equal(app.calls().length,1);
});
test('decline persists without provider traffic',()=>{
  const app=setup();app.notice().children[2].children[0].click();
  assert.equal(app.storage.get(KEY),'declined');assert.equal(app.document.scripts.length,0);assert.equal(app.notice(),undefined);
});
test('saved acceptance is reused but saved decline does not initialize',()=>{
  assert.equal(setup({choice:'accepted'}).document.scripts.length,1);
  const declined=setup({choice:'declined'});assert.equal(declined.document.scripts.length,0);assert.equal(declined.notice(),undefined);
});
test('preferences stop the active counter and request a new choice',()=>{
  const app=setup({choice:'accepted'});app.footer.children[0].click();
  assert.equal(app.calls()[1][1],'destruct');assert.equal(app.storage.get(KEY),'declined');assert.ok(app.notice());
});
for(const path of ['/draft-lab.html','/engineering/reading-paths/','/api/private','/admin/account']) {
  test('private local workflow excluded: '+path,()=>{const app=setup({path,choice:'accepted'});assert.equal(app.document.scripts.length,0);assert.equal(app.window.ym,undefined);});
}
test('a newly inserted field is masked before later recording',()=>{
  const app=setup({choice:'accepted'});const field=new app.Element('textarea');app.fields.push(field);app.observe();assert.equal(field.masked,'ym-disable-keys');
});
test('blocked storage does not break page or start analytics without a choice',()=>{
  const app=setup({storageBlocked:true});assert.ok(app.notice());assert.equal(app.document.scripts.length,0);
});
