import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {launchChromium} from '../scripts/chromium-startup.mjs';

const endpoint='ws://127.0.0.1:49382/devtools/browser/a1b2c3';
function fakeProcess(){
 const proc=new EventEmitter();
 proc.stderr=new EventEmitter();
 proc.signals=[];
 proc.kill=signal=>{proc.signals.push(signal);return true;};
 return proc;
}
function harness(onSpawn){
 const processes=[],created=[],removed=[],calls=[];
 const opts={
  profilePrefix:'24gotop-test-',
  binary:'fake-chromium',
  firstTimeoutMs:8,retryTimeoutMs:12,
  createProfile:async prefix=>{
   const path=prefix+created.length;
   created.push(path);return path;
  },
  removeProfile:async(path,options)=>{
   removed.push({path,options});
  },
  spawnProcess:(binary,args,options)=>{
   const proc=fakeProcess();
   processes.push(proc);
   calls.push({binary,args,options});
   onSpawn?.(proc,processes.length);
   return proc;
  }
 };
 return {opts,processes,created,removed,calls};
}

test('normal PUBLIC browser startup opens exactly one real debugging endpoint',async()=>{
 const h=harness(proc=>queueMicrotask(()=>{
  proc.stderr.emit('data',Buffer.from('DevTools list'));
  proc.stderr.emit('data',Buffer.from('ening on '+endpoint+'\n'));
 }));
 const browser=await launchChromium(h.opts);
 assert.equal(browser.address,endpoint);
 assert.equal(browser.proc,h.processes[0]);
 assert.equal(browser.profile,h.created[0]);
 assert.equal(h.processes.length,1);
 assert.equal(h.removed.length,0,'successful profile belongs to calling E2E teardown');
 assert.ok(h.calls[0].args.includes('--headless=new'));
 assert.ok(h.calls[0].args.includes('--disable-background-networking'));
 assert.ok(h.calls[0].args.includes('--remote-debugging-port=0'));
 assert.ok(h.calls[0].args.includes('--user-data-dir='+browser.profile));
 assert.equal(h.calls[0].options.stdio[1],'ignore');
});

test('a stalled first Chromium launch retries once with a clean independent profile',async()=>{
 const h=harness((proc,attempt)=>{
  if(attempt===2)queueMicrotask(()=>
   proc.stderr.emit('data',Buffer.from('DevTools listening on '+endpoint+'\n')));
 });
 const browser=await launchChromium(h.opts);
 assert.equal(browser.address,endpoint);
 assert.equal(h.processes.length,2);
 assert.notEqual(h.created[0],h.created[1]);
 assert.deepEqual(h.processes[0].signals,['SIGKILL']);
 assert.deepEqual(h.processes[1].signals,[]);
 assert.equal(h.removed.length,1);
 assert.equal(h.removed[0].path,h.created[0]);
 assert.equal(h.removed[0].options.force,true);
 assert.equal(browser.profile,h.created[1]);
});

test('two Chromium startup timeouts still fail the real browser gate',async()=>{
 const h=harness();
 await assert.rejects(launchChromium(h.opts),error=>
  error.code==='CHROMIUM_STARTUP_TIMEOUT' &&
  error.message==='Chromium debugging endpoint unavailable');
 assert.equal(h.processes.length,2);
 assert.equal(h.removed.length,2);
 assert.ok(h.processes.every(proc=>proc.signals[0]==='SIGKILL'));
});

test('a browser process crash or spawn error fails immediately, never retries',async()=>{
 for(const event of ['exit','error']){
  const h=harness(proc=>queueMicrotask(()=>{
   if(event==='exit')proc.emit('exit',1);
   else proc.emit('error',new Error('filesystem / private environment details'));
  }));
  await assert.rejects(launchChromium(h.opts),error=>{
   assert.ok(/Chromium exited 1|Chromium could not start/.test(error.message));
   assert.doesNotMatch(error.message,/private environment|filesystem/);
   return true;
  });
  assert.equal(h.processes.length,1);
  assert.equal(h.removed.length,1);
 }
});

test('invalid retry budget is rejected before creating a browser profile',async()=>{
 for(const override of [{firstTimeoutMs:0},{retryTimeoutMs:0},
  {firstTimeoutMs:1.5},{retryTimeoutMs:'12'}]){
  const h=harness();
  await assert.rejects(launchChromium({...h.opts,...override}),TypeError);
  assert.equal(h.processes.length,0);
  assert.equal(h.created.length,0);
 }
});
