/** Local static App Studio: no uploads, backend, browser storage or privilege. */
export const STUDIO_LIMITS=Object.freeze({
 name:60,html:16000,css:16000,js:16000,packagedBytes:512*1024
});
export const STUDIO_STARTER=Object.freeze({
 name:'Counter Lab',
 html:'<main class="app">\n  <p class="eyebrow">MY FIRST STATIC APP</p>\n  <h1>Counter Lab</h1>\n  <p>Create interactive tools with just HTML, CSS and JavaScript.</p>\n  <div class="count" id="count" aria-live="polite">0</div>\n  <button id="increase" type="button">Increase count</button>\n</main>',
 css:':root{color-scheme:dark;font-family:system-ui,Arial,sans-serif}\n*{box-sizing:border-box}\nbody{margin:0;min-height:100vh;background:#0b1713;color:#ebf9f0;display:grid;place-items:center;padding:20px}\n.app{max-width:600px;width:100%;background:#17271f;padding:26px;border:1px solid #325746;border-radius:16px}\n.eyebrow{letter-spacing:.12em;color:#4fe1a0;font-size:11px;font-weight:800}\nh1{font-size:clamp(30px,7vw,52px);margin:10px 0}\np{line-height:1.6}\n.count{font-size:70px;font-weight:850;color:#4fe1a0;margin:20px 0}\nbutton{min-height:46px;padding:12px 18px;border:0;border-radius:10px;font:inherit;font-weight:800;background:#4fe1a0;color:#092219;cursor:pointer}\nbutton:focus-visible{outline:3px solid #fff;outline-offset:3px}',
 js:"let count = 0;\nconst output = document.getElementById('count');\ndocument.getElementById('increase').addEventListener('click', () => {\n  count += 1;\n  output.textContent = String(count);\n});"
});
/** An original no-JavaScript starter: useful for static guides and resources. */
export const STUDIO_STATIC_STARTER=Object.freeze({
 name:'Static Resource Card',
 html:'<main class="card">\n  <p class="eyebrow">STATIC PAGE</p>\n  <h1>Useful resources</h1>\n  <p>A readable page with HTML and CSS only. No JavaScript is necessary.</p>\n  <ul><li>Describe a tool</li><li>List practical steps</li><li>Share an offline reference</li></ul>\n</main>',
 css:'body{margin:0;min-height:100vh;padding:24px;display:grid;place-items:center;background:#10221b;color:#f0fff8;font-family:system-ui,sans-serif} .card{max-width:560px;padding:30px;border:1px solid #3f7e60;border-radius:14px;background:#193628} .eyebrow{color:#6cedae;font-weight:800;letter-spacing:.1em} h1{font-size:clamp(28px,6vw,46px)} li{margin:12px 0} p{line-height:1.6}',
 js:''
});
const fail=()=>{throw new TypeError('Unsafe or unsupported Studio source');};
const htmlForbidden=/<(?:iframe|object|embed|form|base|meta|script|style|link|svg|math)\b|<\/?(?:html|head|body)\b|\son[a-z]+\s*=|\b(?:src|href|srcset|action|formaction)\s*=/i;
const codeForbidden=[
 /<\s*\/\s*(?:script|style)\b/i,
 /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|eval)\s*\(/i,
 /\b(?:localStorage|sessionStorage|indexedDB|serviceWorker|document\.cookie)\b/i,
 /\b(?:window\.top|window\.parent|window\.opener|window\.open)\b/i,
 /new\s+Function\s*\(/i,
 /\bimport\s*\(|\bimport\s+.*\s+from\s+|\bexport\s+default\b/i
];
const csp="default-src 'none'; base-uri 'none'; connect-src 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; img-src data:; font-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'";
const safeSource=(value,max)=>typeof value==='string'&&value.length<=max&&
 !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
const safeString=(value,max)=>safeSource(value,max)&&value.length>0;
export function validateStudioDraft(draft){
 if(!draft||typeof draft!=='object'||Array.isArray(draft)||
    Object.keys(draft).sort().join(',')!=='css,html,js,name')fail();
 const {name,html,css,js}=draft;
 if(!safeString(name,STUDIO_LIMITS.name)||
    !/^[a-zA-Z0-9][a-zA-Z0-9 ._-]{2,59}$/.test(name)||
    !safeString(html,STUDIO_LIMITS.html)||!html.trim()||
    !safeSource(css,STUDIO_LIMITS.css)||
    !safeSource(js,STUDIO_LIMITS.js)||
    htmlForbidden.test(html)||
    /<\s*\/\s*(?:script|style)\b/i.test(html)||
    /<\/style\b/i.test(css)||
    /@import\b|url\s*\(|expression\s*\(/i.test(css)||
    codeForbidden.some(pattern=>pattern.test(js)))fail();
 return Object.freeze({name,html,css,js});
}
const escapeMarkup=s=>s.replace(/&/g,'&amp;')
 .replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
/** The same single-file HTML runs in opaque srcdoc and goes into the ZIP. */
export function buildStudioHtml(raw){
 const draft=validateStudioDraft(raw);
 const page=[
  '<!doctype html><html lang="en"><head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<meta http-equiv="Content-Security-Policy" content="'+csp+'">',
  '<title>'+escapeMarkup(draft.name)+'</title>',
  '<style>'+draft.css+'</style>',
  '</head><body>',
  draft.html,
  '<script>'+draft.js+'</script>',
  '</body></html>'
 ].join('\n');
 if(new TextEncoder().encode(page).length>STUDIO_LIMITS.packagedBytes)fail();
 return page;
}
function crc32(data){
 let result=0xffffffff;
 for(const x of data){
  result^=x;
  for(let i=0;i<8;i++)result=(result>>>1)^((result&1)?0xedb88320:0);
 }
 return (result^0xffffffff)>>>0;
}
/** Canonical one-file ZIP32, STORE method; deterministic and portable. */
export function buildStudioZip(raw){
 const content=new TextEncoder().encode(buildStudioHtml(raw));
 const name=new TextEncoder().encode('index.html');
 const local=new Uint8Array(30),central=new Uint8Array(46),eocd=new Uint8Array(22);
 const lv=new DataView(local.buffer),cv=new DataView(central.buffer),
  ev=new DataView(eocd.buffer);
 const l16=(offset,value)=>lv.setUint16(offset,value,true);
 const l32=(offset,value)=>lv.setUint32(offset,value,true);
 const c16=(offset,value)=>cv.setUint16(offset,value,true);
 const c32=(offset,value)=>cv.setUint32(offset,value,true);
 const crc=crc32(content);
 l32(0,0x04034b50);l16(4,20);l32(14,crc);
 l32(18,content.length);l32(22,content.length);l16(26,name.length);
 const offset=local.length+name.length+content.length;
 c32(0,0x02014b50);c16(4,20);c16(6,20);
 c32(16,crc);c32(20,content.length);c32(24,content.length);
 c16(28,name.length);c32(42,0);
 ev.setUint32(0,0x06054b50,true);
 ev.setUint16(8,1,true);ev.setUint16(10,1,true);
 ev.setUint32(12,central.length+name.length,true);
 ev.setUint32(16,offset,true);
 const output=new Uint8Array(offset+central.length+name.length+eocd.length);
 let pos=0;
 for(const part of [local,name,content,central,name,eocd]){
  output.set(part,pos);pos+=part.length;
 }
 return output;
}
