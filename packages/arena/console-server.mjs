#!/usr/bin/env node
/**
 * Local-only Agent Arena web console. This is NOT the hosted 24GOTOP API.
 * Keys stay in this Node process; authenticated HTTP is loopback-only.
 */
import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual,createPrivateKey,createPublicKey} from 'node:crypto';
import {readFile,lstat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateAgents} from './engine.mjs';
import {LocalAgentRegistry} from './local-registry.mjs';
import {runVerifiedArenaSession} from './verified-runner.mjs';

const HOST='127.0.0.1';
const MAX_BODY=4096;
const MAX_RUNS=3;
const ASSETS=new Map([
 ['/',{file:new URL('./console/index.html',import.meta.url),type:'text/html; charset=utf-8'}],
 ['/console.mjs',{file:new URL('./console/console.mjs',import.meta.url),type:'text/javascript; charset=utf-8'}],
 ['/console.css',{file:new URL('./console/console.css',import.meta.url),type:'text/css; charset=utf-8'}],
 ['/arena-core.mjs',{file:new URL('../../site/arena/arena-core.mjs',import.meta.url),type:'text/javascript; charset=utf-8'}],
 ['/tournament-core.mjs',{file:new URL('../../site/arena/tournament-core.mjs',import.meta.url),type:'text/javascript; charset=utf-8'}]
]);
const HEADERS=Object.freeze({
 'Cache-Control':'no-store, max-age=0',
 'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'",
 'Cross-Origin-Resource-Policy':'same-origin',
 'Cross-Origin-Opener-Policy':'same-origin',
 'Referrer-Policy':'no-referrer',
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY'
});
const forbidden=()=>{throw new TypeError('Invalid local Arena console configuration');};

async function privateKeyFile(filename){
 if(typeof filename!=='string'||!filename||filename.length>1024)forbidden();
 const stat=await lstat(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<64||stat.size>4096||
    (process.platform!=='win32'&&(stat.mode&0o077)!==0))forbidden();
 return readFile(filename,'utf8');
}
export async function loadConsoleConfig(env=process.env){
 const agents=[
  {name:env.ARENA_A_NAME||'Agent A',model:env.ARENA_A_MODEL,
   endpoint:env.ARENA_A_ENDPOINT,key:env.ARENA_A_KEY},
  {name:env.ARENA_B_NAME||'Agent B',model:env.ARENA_B_MODEL,
   endpoint:env.ARENA_B_ENDPOINT,key:env.ARENA_B_KEY}
 ];
 validateAgents(agents);
 const identities=[
  {ownerId:env.ARENA_A_OWNER_ID,agentId:env.ARENA_A_AGENT_ID,
   privateKeyPem:await privateKeyFile(env.ARENA_A_SIGNING_KEY_FILE)},
  {ownerId:env.ARENA_B_OWNER_ID,agentId:env.ARENA_B_AGENT_ID,
   privateKeyPem:await privateKeyFile(env.ARENA_B_SIGNING_KEY_FILE)}
 ];
 return {agents,identities};
}
function validateConfig({agents,identities}){
 validateAgents(agents);
 if(!Array.isArray(identities)||identities.length!==2)forbidden();
 const preflight=new LocalAgentRegistry();
 for(let i=0;i<2;i++){
  const info=identities[i];
  if(!info||typeof info.privateKeyPem!=='string')forbidden();
  let pub;
  try{
   const key=createPrivateKey(info.privateKeyPem);
   if(key.asymmetricKeyType!=='ed25519')forbidden();
   pub=createPublicKey(key).export({type:'spki',format:'pem'});
  }catch{forbidden();}
  preflight.enroll({ownerId:info.ownerId,agentId:info.agentId,
   name:agents[i].name,model:agents[i].model,publicKeyPem:pub});
 }
}
function json(res,status,body){
 const bytes=Buffer.from(JSON.stringify(body));
 res.writeHead(status,{...HEADERS,'Content-Type':'application/json; charset=utf-8',
  'Content-Length':bytes.length});
 res.end(bytes);
}
function authorize(headers,token){
 const value=headers.authorization;
 if(typeof value!=='string'||!/^Bearer [A-Za-z0-9_-]{43}$/.test(value))
  return false;
 const provided=Buffer.from(value.slice(7),'ascii');
 const secret=Buffer.from(token,'ascii');
 return provided.length===secret.length&&timingSafeEqual(provided,secret);
}
async function boundedBody(req){
 if(Number(req.headers['content-length']||0)>MAX_BODY)
  throw new RangeError('Oversized local request');
 const blocks=[];let bytes=0;
 for await(const data of req){
  bytes+=data.length;
  if(bytes>MAX_BODY)throw new RangeError('Oversized local request');
  blocks.push(data);
 }
 return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(blocks,bytes));
}
function validRequest(value){
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).sort().join(',')==='confirmCosts,prompt,rounds'&&
  value.confirmCosts===true&&
  typeof value.prompt==='string'&&value.prompt.trim().length>=5&&
  value.prompt.length<=2000&&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value.prompt)&&
  Number.isInteger(value.rounds)&&value.rounds>=1&&value.rounds<=3;
}
/**
 * Explicitly launched, in-process only. Local files and provider traffic
 * are never accessible from the published 24go.top Pages site.
 */
export async function startLocalArenaConsole({
 config,fetcher=globalThis.fetch,port=0,maxRuns=MAX_RUNS
}={}){
 if(!config||typeof fetcher!=='function'||!Number.isInteger(port)||
    port<0||port>65535||!Number.isInteger(maxRuns)||
    maxRuns<1||maxRuns>MAX_RUNS)forbidden();
 validateConfig(config);
 const token=randomBytes(32).toString('base64url');
 let origin='',runs=0,busy=false;
 const server=createServer(async(req,res)=>{
  try{
   if(req.headers.host!==origin.slice('http://'.length)){
    json(res,403,{error:'Forbidden host'});return;
   }
   if(req.method==='GET'&&ASSETS.has(req.url)){
    const asset=ASSETS.get(req.url);
    const bytes=await readFile(asset.file);
    res.writeHead(200,{...HEADERS,'Content-Type':asset.type,'Content-Length':bytes.length});
    res.end(bytes);
    return;
   }
   if(req.url!=='/api/run'||req.method!=='POST'){
    json(res,404,{error:'Not found'});return;
   }
   if(req.headers.origin!==origin){
    json(res,403,{error:'Forbidden origin'});return;
   }
   if(!authorize(req.headers,token)){
    json(res,401,{error:'Unauthorized'});return;
   }
   if(req.headers['content-type']!=='application/json'){
    json(res,415,{error:'JSON required'});return;
   }
   if(busy){json(res,409,{error:'A match is already running'});return;}
   if(runs>=maxRuns){
    json(res,429,{error:'Local run cap reached. Restart after reviewing provider costs.'});
    return;
   }
   let body;
   try{body=JSON.parse(await boundedBody(req));}
   catch(error){
    json(res,error instanceof RangeError?413:400,{error:'Invalid or oversized JSON'});
    return;
   }
   if(!validRequest(body)){
    json(res,400,{error:'Confirm costs, enter a valid prompt, and choose 1–3 rounds'});
    return;
   }
   runs++;busy=true;
   try{
    const session=await runVerifiedArenaSession({
     prompt:body.prompt,rounds:body.rounds,
     agents:config.agents,identities:config.identities,fetcher
    });
    json(res,200,{session,remainingRuns:maxRuns-runs});
   }catch{
    // Never echo local key paths, provider bodies, model responses or tokens.
    json(res,502,{error:'Model or signed match failed. Check local console and provider configuration.',
     remainingRuns:maxRuns-runs});
   }finally{busy=false;}
  }catch{
   if(!res.writableEnded)json(res,500,{error:'Local console request failed'});
  }
 });
 server.requestTimeout=15000; // bound slow client uploads; model latency is separate
 try{
  await new Promise((resolve,reject)=>{
   server.once('error',reject);
   server.listen(port,HOST,resolve);
  });
 }catch{server.close();throw new Error('Local Arena console could not bind loopback');}
 const addr=server.address();
 origin='http://'+HOST+':'+addr.port;
 return Object.freeze({
  origin,launchUrl:origin+'/#auth='+token,
  close:()=>new Promise((resolve,reject)=>{
   server.closeAllConnections();
   server.close(e=>e?reject(e):resolve());
  }),
  // Test-only integration may inspect run counts, never a public route.
  get runs(){return runs;}
 });
}
function parseArgs(args){
 const expected=args.filter(x=>x==='--confirm-costs');
 if(expected.length!==1||args.some(x=>x!=='--confirm-costs'&&x!=='--port'&&
     !/^\d{1,5}$/.test(x)))forbidden();
 const at=args.indexOf('--port');
 const port=at<0?8787:Number(args[at+1]);
 if(at>=0&&(at+1!==args.length-1||args.filter(x=>x==='--port').length!==1))
  forbidden();
 if(!Number.isInteger(port)||port<1024||port>65535)forbidden();
 if(args.length!==(at<0?1:3))forbidden();
 return port;
}
export async function main(args=process.argv.slice(2),env=process.env){
 const port=parseArgs(args);
 const config=await loadConsoleConfig(env);
 const consoleServer=await startLocalArenaConsole({config,port});
 // This URL contains a localhost-only random token in its fragment.
 // It is erased from the browser address on load, before any model calls.
 process.stdout.write('Local Agent Arena (loopback only): '+consoleServer.launchUrl+'\n');
 process.stdout.write('Up to three explicitly confirmed model runs. CTRL+C to stop.\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 main().catch(()=>{
  process.stderr.write('Local Arena console could not start. Check private signing keys, model settings and port.\n');
  process.exitCode=1;
 });
}
