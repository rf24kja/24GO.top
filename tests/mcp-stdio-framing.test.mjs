import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {once} from 'node:events';
import {MAX_STDIO_FRAME_BYTES,runStdio,loadPublishedCorpus}
 from '../packages/mcp/stdio.mjs';

const articles=loadPublishedCorpus();
const ping=(id,params={})=>JSON.stringify({jsonrpc:'2.0',id,method:'ping',params});
const harness=()=>{
 const input=new PassThrough();
 let output='';
 const server=runStdio({input,output:{write(value){output+=value;return true;}},articles});
 const result=()=>output.trim()?output.trim().split('\n').map(JSON.parse):[];
 return {input,server,result};
};
const stop=async(input)=>{
 const end=once(input,'end');
 input.end();
 await end;
};
const isParseError=value=>value?.error?.code===-32700&&value.id===null;

test('bounded MCP stdio accepts normal JSON-RPC and many frames in one chunk',async()=>{
 const {input,server,result}=harness();
 assert.equal(MAX_STDIO_FRAME_BYTES,65536);
 input.write(ping(1)+'\n'+ping(2)+'\r\n'+ping(3));
 await stop(input);
 const replies=result();
 assert.deepEqual(replies.map(v=>v.id),[1,2,3]);
 assert.ok(replies.every(x=>x.result&&!x.error));
 assert.equal(server.bufferedBytes,0);
});

test('streaming UTF-8 split across chunks preserves emoji request IDs',async()=>{
 const {input,server,result}=harness();
 const raw=Buffer.from(ping('Русский 🚀 中文')+'\n');
 const emoji=raw.indexOf(Buffer.from('🚀'));
 assert.ok(emoji>0);
 input.write(raw.subarray(0,emoji+1));
 assert.ok(server.bufferedBytes<=MAX_STDIO_FRAME_BYTES);
 input.write(raw.subarray(emoji+1,emoji+2));
 input.write(raw.subarray(emoji+2));
 await stop(input);
 assert.deepEqual(result().map(r=>r.id),['Русский 🚀 中文']);
});

test('exact 64 KiB JSON request survives CRLF termination',async()=>{
 const {input,result}=harness();
 const data={jsonrpc:'2.0',id:42,method:'ping',params:{note:''}};
 data.params.note='x'.repeat(MAX_STDIO_FRAME_BYTES-
  Buffer.byteLength(JSON.stringify(data)));
 const frame=Buffer.from(JSON.stringify(data)+'\r\n');
 assert.equal(frame.length,MAX_STDIO_FRAME_BYTES+2);
 const end=once(input,'end');
 input.write(frame);
 input.end();
 await end;
 const replies=result();
 assert.equal(replies.length,1);
 assert.equal(replies[0].id,42);
 assert.deepEqual(replies[0].result,{});
});

test('more than 64 KiB is rejected without buffering its content or losing next valid frame',async()=>{
 const {input,server,result}=harness();
 const secret='PRIVATE-DO-NOT-ECHO-123';
 const oversized=Buffer.from(ping(4,{padding:'x'.repeat(MAX_STDIO_FRAME_BYTES*3),secret}));
 for(let i=0;i<oversized.length;i+=1024){
  input.write(oversized.subarray(i,i+1024));
  assert.ok(server.bufferedBytes<=MAX_STDIO_FRAME_BYTES+1);
 }
 assert.equal(server.bufferedBytes,0,'discard state retains no frame bytes');
 input.write('\n'+ping(5)+'\n');
 await stop(input);
 const replies=result();
 assert.equal(replies.length,2);
 assert.ok(isParseError(replies[0]));
 assert.equal(replies[1].id,5);
 assert.deepEqual(replies[1].result,{});
 assert.ok(!JSON.stringify(replies).includes(secret),'never echo client payload');
});

test('streaming framing rejects invalid UTF-8 and malformed JSON, then recovers',async()=>{
 const {input,result}=harness();
 input.write(Buffer.from([0x7b,0x22,0x69,0x64,0x22,0x3a,0x22,0xc3]));
 input.write(Buffer.from([0x28,0x22,0x7d,0x0a])); // invalid UTF-8
 input.write('not-json\n\n');
 input.write(JSON.stringify({jsonrpc:'2.0',method:'ping'})+'\n'); // notification
 input.write(ping('ok')+'\n');
 await stop(input);
 const responses=result();
 assert.equal(responses.length,4);
 assert.ok(responses.slice(0,3).every(isParseError));
 assert.equal(responses[3].id,'ok');
});

test('oversized un-terminated frame is refused on EOF and does not retain bytes',async()=>{
 const {input,server,result}=harness();
 const chunk=Buffer.alloc(32768,0x78);
 for(let i=0;i<256;i++){
  input.write(chunk);
  assert.ok(server.bufferedBytes<=MAX_STDIO_FRAME_BYTES+1);
 }
 await stop(input);
 assert.equal(server.bufferedBytes,0);
 const replies=result();
 assert.equal(replies.length,1);
 assert.ok(isParseError(replies[0]));
});

test('explicit close drops buffered input without processing or leaking partial data',async()=>{
 const {input,server,result}=harness();
 input.write('{"jsonrpc":"2.0",');
 assert.ok(server.bufferedBytes>0);
 server.close();
 assert.equal(server.bufferedBytes,0);
 input.write(ping(123)+'\n');
 input.end();
 assert.deepEqual(result(),[]);
});
