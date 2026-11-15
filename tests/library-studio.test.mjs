import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {STUDIO_STARTER,validateStudioDraft,buildStudioHtml,buildStudioZip,STUDIO_LIMITS}
 from '../site/library/studio/studio-core.mjs';
import {validateStaticZip} from '../packages/library/validator.mjs';
import {validateBrowserZip} from '../site/library/intake-core.mjs';

const digest=async bytes=>createHash('sha256').update(bytes).digest('hex');
const inflate=async bytes=>new Uint8Array(inflateRawSync(bytes,{maxOutputLength:512*1024+1}));
const path=new URL('../site/library/studio/',import.meta.url);
const read=name=>readFileSync(new URL(name,path),'utf8');

test('real Studio starter produces a genuine stored ZIP32 accepted by both independent validators',async()=>{
 const draft=validateStudioDraft(STUDIO_STARTER);
 assert.equal(draft.name,'Counter Lab');
 assert.equal(Object.isFrozen(draft),true);
 const html=buildStudioHtml(STUDIO_STARTER);
 assert.ok(html.startsWith('<!doctype html>'));
 assert.ok(html.includes('Counter Lab'));
 assert.match(html,/default-src 'none'/);
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/style-src 'unsafe-inline'/);
 assert.match(html,/script-src 'unsafe-inline'/);
 assert.match(html,/document\.getElementById\('increase'\)/);
 const zip=buildStudioZip(STUDIO_STARTER);
 assert.ok(zip instanceof Uint8Array);
 assert.ok(zip.byteLength<STUDIO_LIMITS.packagedBytes);
 const node=validateStaticZip(Buffer.from(zip));
 const browser=await validateBrowserZip(zip,{digest,inflate});
 assert.deepEqual(browser,node);
 assert.equal(node.files.length,1);
 assert.equal(node.files[0].path,'index.html');
 assert.equal(node.files[0].size,Buffer.byteLength(html));
 assert.equal(node.files[0].sha256,digest instanceof Function?
  await digest(new TextEncoder().encode(html)):null);
 assert.equal(node.automaticHosting,false);
 assert.equal(node.reviewRequired,true);
 assert.equal(node.archiveSha256,createHash('sha256').update(zip).digest('hex'));
 assert.deepEqual([...buildStudioZip(STUDIO_STARTER)], [...zip],'deterministic archives');
});
test('Studio escapes app title and strips HTML document injection opportunities',()=>{
 const safe={...STUDIO_STARTER,name:'Your First App'};
 assert.match(buildStudioHtml(safe),/<title>Your First App<\/title>/);
 for(const draft of [
  {...safe,name:'<img src=x onerror=1>'},
  {...safe,name:'a'.repeat(61)},
  {...safe,name:''},
  {...safe,html:'<script>alert("x")</script>'},
  {...safe,html:'<iframe src="//evil"></iframe>'},
  {...safe,html:'<img src="https://evil.example/pixel">'},
  {...safe,html:'<button onclick="alert(1)">Run</button>'},
  {...safe,html:'</body><meta http-equiv="refresh" content="1">'},
  {...safe,css:'body{background:url(https://evil.example/a)}'},
  {...safe,css:'@import "https://evil.example/a.css";'},
  {...safe,css:'</style><script>alert(1)</script>'},
  {...safe,js:'fetch("https://evil.example/track")'},
  {...safe,js:'window.parent.postMessage("data","*")'},
  {...safe,js:'localStorage.setItem("foo","bar")'},
  {...safe,js:'eval("evil")'},
  {...safe,js:'</script><img src=x>'},
  {...safe,js:'a'.repeat(16001)},
  {...safe,html:'a'.repeat(16001)},
  {...safe,css:'a'.repeat(16001)},
  {...safe,extra:'not-allowed'}
 ])assert.throws(()=>buildStudioZip(draft),TypeError,JSON.stringify(draft).slice(0,120));
});
test('Studio HTML is a single static package, not a production publication path',()=>{
 const html=read('index.html');
 const ui=read('studio.mjs');
 const core=read('studio-core.mjs');
 assert.match(html,/id="studio-frame" title="Untrusted local app preview" sandbox="allow-scripts" referrerpolicy="no-referrer"/);
 assert.doesNotMatch(html,/allow-same-origin|allow-top-navigation|allow-popups|allow-downloads/);
 assert.match(html,/id="studio-html"/);
 assert.match(html,/id="studio-css"/);
 assert.match(html,/id="studio-js"/);
 assert.match(html,/id="studio-download"/);
 assert.match(html,/not a malware clearance/);
 assert.match(ui,/frame\.srcdoc=ready\.html/);
 assert.match(ui,/validateBrowserZip\(zip\)/);
 assert.match(ui,/URL\.revokeObjectURL/);
 assert.doesNotMatch(ui,/\bfetch\s*\(|localStorage|sessionStorage|innerHTML|sendBeacon/);
 assert.doesNotMatch(core,/\bfetch\s*\(|localStorage|sessionStorage|sendBeacon/);
 const result=buildStudioHtml(STUDIO_STARTER);
 assert.doesNotMatch(result,/<script\b[^>]*src=/);
 assert.doesNotMatch(result,/<link\b[^>]*href=/);
 assert.doesNotMatch(result,/<iframe/);
});
