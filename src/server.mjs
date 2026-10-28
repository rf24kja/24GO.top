import http from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createPostStore } from './post-store.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const locales = ['en','ru','th','es','fr','de','pt','zh'];
const categories = ['news','models','tools','guides'];
const maxBody = 32768;
class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
function send(res, status, value, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, {'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-frame-options':'DENY','permissions-policy':'camera=(), microphone=(), geolocation=()','content-security-policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'",...extra});
  res.end(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value));
}
function validSecret(input, expected) {
  const a=Buffer.from(input || ''), b=Buffer.from(expected || '');
  return b.length >= 24 && a.length === b.length && timingSafeEqual(a,b);
}
function xmlEscape(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
}
async function bodyJSON(req) {
  const pieces=[];let total=0;
  for await (const piece of req) {
    total+=piece.length;
    if(total>maxBody) throw new ApiError(413,'Body too large');
    pieces.push(piece);
  }
  try { return JSON.parse(Buffer.concat(pieces).toString('utf8')); }
  catch { throw new ApiError(400,'Invalid JSON'); }
}
function validate(raw) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw new ApiError(400,'Expected object');
  const {title,body,locale,category,sourceUrl,tags=[],authorType='human'}=raw;
  if(typeof title!=='string'||title.trim().length<5||title.length>160) throw new ApiError(400,'Invalid title');
  if(typeof body!=='string'||body.trim().length<20||body.length>12000) throw new ApiError(400,'Invalid body');
  if(!locales.includes(locale)) throw new ApiError(400,'Unsupported locale');
  if(!categories.includes(category)) throw new ApiError(400,'Unsupported category');
  if(!['human','agent'].includes(authorType)) throw new ApiError(400,'Invalid authorType');
  if(!Array.isArray(tags)||tags.length>5||tags.some(t=>typeof t!=='string'||!(/^[\p{L}\p{N}_-]{1,30}$/u).test(t))) throw new ApiError(400,'Invalid tags');
  let safeUrl=null;
  if(sourceUrl!=null && sourceUrl!=='') {
    if(typeof sourceUrl!=='string'||sourceUrl.length>2000) throw new ApiError(400,'Invalid sourceUrl');
    try {
      const u=new URL(sourceUrl);
      if(!['http:','https:'].includes(u.protocol)||!u.hostname||u.username||u.password) throw new Error();
      safeUrl=u.href;
    } catch { throw new ApiError(400,'sourceUrl must be http(s)'); }
  }
  return {id:randomUUID(),title:title.trim(),body:body.trim(),locale,category,sourceUrl:safeUrl,tags:[...new Set(tags)],authorType,publishedAt:new Date().toISOString()};
}
function origin(raw) {
  if(!raw) return '';
  try {const u=new URL(raw);if(u.protocol==='https:'||['localhost','127.0.0.1'].includes(u.hostname))return u.origin;}
  catch {}
  return '';
}
function asset(path) { return readFileSync(join(root,'public',path)); }

const loopbackSockets=new Set(['127.0.0.1','::1','::ffff:127.0.0.1']);
const loopbackHostnames=new Set(['localhost','127.0.0.1','[::1]']);

/**
 * The JSON/key publishing route exists only for trusted LOCAL development.
 * A user who accidentally binds 0.0.0.0 must not grant LAN or container
 * callers write privileges. Browser requests additionally need a same-origin
 * local Host/Origin pair. This is NOT production authentication.
 */
export function isTrustedLocalPublishRequest(req) {
  const remote=req?.socket?.remoteAddress;
  const local=req?.socket?.localAddress;
  const host=req?.headers?.host;
  if(!loopbackSockets.has(remote)||!loopbackSockets.has(local)||
     typeof host!=='string'||host.length>100||/[\\\s,@]/.test(host))return false;
  let target;
  try{target=new URL('http://'+host);}
  catch{return false;}
  if(!loopbackHostnames.has(target.hostname)||target.username||target.password||
     target.pathname!=='/'||target.search||target.hash)return false;
  const suppliedOrigin=req.headers.origin;
  if(suppliedOrigin===undefined)return true; // CLI / same-host SDK calls.
  if(typeof suppliedOrigin!=='string'||suppliedOrigin.length>128)return false;
  try{
    const origin=new URL(suppliedOrigin);
    return origin.protocol==='http:' && origin.origin===target.origin &&
      origin.pathname==='/' && !origin.username&&!origin.password&&
      !origin.search&&!origin.hash;
  }catch{return false;}
}

export function createApp(config={}) {
  const apiKey=config.apiKey??process.env.PUBLISH_API_KEY??'';
  const site=origin(config.siteURL??process.env.SITE_URL??'');
  const store=config.store??createPostStore({
    mode:config.storeMode??process.env.POST_STORE??'local',
    dbPath:config.dbPath??join(root,'data','posts.json'),
    supabaseUrl:config.supabaseUrl??process.env.SUPABASE_URL,
    publishableKey:config.publishableKey??process.env.SUPABASE_PUBLISHABLE_KEY,
    fetchImpl:config.fetchImpl
  });
  return http.createServer(async (req,res)=>{
    try {
      const url=new URL(req.url??'/','http://localhost');
      const path=url.pathname;
      if(req.method==='GET'&&path==='/api/health') return send(res,200,{status:'ok',version:'0.1.0'});
      if(req.method==='GET'&&path==='/api/posts') {
        const locale=url.searchParams.get('locale')??'en';
        const category=url.searchParams.get('category');
        const limitRaw=url.searchParams.get('limit')??'20';
        if(!locales.includes(locale)) throw new ApiError(400,'Unsupported locale');
        if(category&&!categories.includes(category)) throw new ApiError(400,'Invalid category');
        if(!/^\d{1,3}$/.test(limitRaw)||Number(limitRaw)<1) throw new ApiError(400,'Invalid limit');
        const limit=Math.min(50,Number(limitRaw));
        return send(res,200,{posts:await store.list({locale,category,limit})});
      }
      if(req.method==='GET'&&/^\/api\/posts\/[a-f0-9-]{36}$/.test(path)) {
        const post=await store.get(path.split('/')[3]);
        if(!post) throw new ApiError(404,'Post not found');
        return send(res,200,post);
      }
      if(req.method==='POST'&&path==='/api/posts') {
        if(store.mode!=='local') throw new ApiError(503,'Publishing disabled in read-only mode');
        if(!isTrustedLocalPublishRequest(req)) throw new ApiError(403,'Local publishing requires a loopback request');
        if(!apiKey) throw new ApiError(503,'Publishing disabled');
        const auth=req.headers.authorization??'';
        if(!auth.startsWith('Bearer ')||!validSecret(auth.slice(7),apiKey)) throw new ApiError(401,'Unauthorized');
        const post=validate(await bodyJSON(req));
        await store.create(post);
        return send(res,201,{post});
      }
      if(req.method==='GET'&&path==='/robots.txt') {
        return send(res,200,'User-agent: *\nAllow: /\n'+(site?'Sitemap: '+site+'/sitemap.xml\n':''),'text/plain; charset=utf-8');
      }
      if(req.method==='GET'&&path==='/sitemap.xml') {
        const entries=site?locales.map(l=>'<url><loc>'+xmlEscape(site+'/'+l+'/')+'</loc></url>').join(''):'';
        return send(res,200,'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+entries+'</urlset>','application/xml; charset=utf-8');
      }
      if(req.method==='GET'&&/^\/feeds\/[a-z]{2}\.xml$/.test(path)) {
        const locale=path.split('/')[2].slice(0,2);
        if(!locales.includes(locale)) throw new ApiError(404,'Unknown feed');
        const base=site||'http://localhost:3000';
        const feedPosts=await store.list({locale,limit:30});
        const items=feedPosts.map(p=>'<item><title>'+xmlEscape(p.title)+'</title><description>'+xmlEscape(p.body.slice(0,400))+'</description><guid isPermaLink="false">'+p.id+'</guid><pubDate>'+new Date(p.publishedAt).toUTCString()+'</pubDate><link>'+xmlEscape(base+'/'+locale+'/?post='+p.id)+'</link></item>').join('');
        return send(res,200,'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>24GOTOP ('+locale+')</title><link>'+xmlEscape(base+'/'+locale+'/')+'</link><description>Open AI knowledge network</description>'+items+'</channel></rss>','application/rss+xml; charset=utf-8');
      }
      if(req.method==='GET'&&path==='/app.js') return send(res,200,asset('app.js'),'text/javascript; charset=utf-8',{'cache-control':'public, max-age=300'});
      if(req.method==='GET'&&path==='/style.css') return send(res,200,asset('style.css'),'text/css; charset=utf-8',{'cache-control':'public, max-age=300'});
      if(req.method==='GET'&&(path==='/'||/^\/[a-z]{2}\/?$/.test(path))) {
        if(path==='/'){res.writeHead(302,{location:'/en/'});return res.end();}
        const locale=path.split('/')[1];
        if(!locales.includes(locale)) throw new ApiError(404,'Unsupported locale');
        const canonical=site?'<link rel="canonical" href="'+site+'/'+locale+'/">':'';
        return send(res,200,asset('index.html').toString('utf8').replaceAll('%%LOCALE%%',locale).replace('%%CANONICAL%%',canonical),'text/html; charset=utf-8');
      }
      throw new ApiError(404,'Not found');
    } catch(error) {
      const status=(error instanceof ApiError || error?.status===503)?error.status:500;
      if(status===500) console.error('Request failed:',error);
      if(!res.headersSent) send(res,status,{error:status===500?'Internal server error':error.message});
      else res.end();
    }
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const host=process.env.HOST||'127.0.0.1';
  const port=Number(process.env.PORT||3000);
  createApp().listen(port,host,()=>console.log('24GOTOP running at http://'+host+':'+port+'/en/'));
}
