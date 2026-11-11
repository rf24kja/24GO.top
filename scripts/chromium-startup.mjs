// Reusable, isolated Chromium startup for PUBLIC browser smoke/E2E tests.
// A single slow GitHub runner must not turn a real browser check into a
// false negative. Retry only the debugging-endpoint startup timeout, once.
// Never skip test assertions, fall back to a mock browser or access the network.
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const FLAGS=Object.freeze([
 '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--disable-background-networking','--no-first-run','--no-default-browser-check',
 '--remote-debugging-port=0'
]);
function waitForDebugEndpoint(proc,timeoutMs){
 return new Promise((resolve,reject)=>{
  if(!proc?.stderr?.on||!proc?.on) {
   reject(new Error('Chromium process has no debugging output'));
   return;
  }
  let output='',settled=false;
  let timeout;
  const cleanup=()=>{
   clearTimeout(timeout);
   proc.off('error',onError);
   proc.off('exit',onExit);
   proc.stderr.off('data',onData);
  };
  const finish=(error,address)=>{
   if(settled)return;
   settled=true;cleanup();
   if(error)reject(error);else resolve(address);
  };
  const onError=()=>finish(new Error('Chromium could not start'));
  const onExit=code=>finish(new Error('Chromium exited '+code));
  const onData=data=>{
   output=(output+data.toString()).slice(-8192);
   const match=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
   if(match)finish(null,match[1]);
  };
  timeout=setTimeout(()=>{
   const error=new Error('Chromium debugging endpoint unavailable');
   error.code='CHROMIUM_STARTUP_TIMEOUT';
   finish(error);
  },timeoutMs);
  proc.once('error',onError);
  proc.once('exit',onExit);
  proc.stderr.on('data',onData);
 });
}

export async function launchChromium({
 profilePrefix='24gotop-browser-',
 binary=process.env.CHROME_BIN||'google-chrome',
 spawnProcess=spawn,createProfile=mkdtemp,removeProfile=rm,
 firstTimeoutMs=12000,retryTimeoutMs=20000
}={}){
 if(!Number.isSafeInteger(firstTimeoutMs)||firstTimeoutMs<1||
    !Number.isSafeInteger(retryTimeoutMs)||retryTimeoutMs<1)
  throw new TypeError('Invalid Chromium startup timeout');
 for(let attempt=0;attempt<2;attempt++){
  const profile=await createProfile(join(tmpdir(),profilePrefix));
  let proc;
  try{
   proc=spawnProcess(binary,[...FLAGS,'--user-data-dir='+profile,'about:blank'],
    {stdio:['ignore','ignore','pipe']});
   const address=await waitForDebugEndpoint(proc,
    attempt===0?firstTimeoutMs:retryTimeoutMs);
   return {proc,profile,address};
  }catch(error){
   try{proc?.kill('SIGKILL');}catch{/* best effort */}
   await removeProfile(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
   if(error?.code!=='CHROMIUM_STARTUP_TIMEOUT'||attempt===1)throw error;
  }
 }
 throw new Error('Chromium debugging endpoint unavailable');
}
