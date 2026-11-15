#!/usr/bin/env node
/** Explicit local runner: no hosted service, no implicit bills or credential persistence. */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {runArenaSession} from './engine.mjs';

export function parseCli(argv){
 const opts={};
 for(let i=0;i<argv.length;i++){
  const key=argv[i];
  if(!['--prompt-file','--rounds','--output','--confirm-costs'].includes(key))
   throw Error('Unknown Arena argument');
  if(key==='--confirm-costs'){opts.confirm=true;continue;}
  if(opts[key]||!argv[i+1]||argv[i+1].startsWith('--'))
   throw Error('Missing or duplicate Arena argument');
  opts[key]=argv[++i];
 }
 if(!opts.confirm)throw Error('Opt in explicitly with --confirm-costs; BYOK providers may charge');
 if(!opts['--prompt-file'])throw Error('Provide --prompt-file with your own prompt');
 const rounds=opts['--rounds']===undefined?1:Number(opts['--rounds']);
 if(!Number.isInteger(rounds)||rounds<1||rounds>3)
  throw Error('Use --rounds 1, 2 or 3');
 return {promptFile:opts['--prompt-file'],rounds,output:opts['--output']};
}
export async function main(argv=process.argv.slice(2),env=process.env){
 const opts=parseCli(argv);
 const stat=await readFile(opts.promptFile);
 if(stat.byteLength>4000)throw Error('Prompt file is too large');
 const prompt=stat.toString('utf8').trim();
 const agents=[
  {name:env.ARENA_A_NAME||'Agent A',endpoint:env.ARENA_A_ENDPOINT,
   model:env.ARENA_A_MODEL,key:env.ARENA_A_KEY},
  {name:env.ARENA_B_NAME||'Agent B',endpoint:env.ARENA_B_ENDPOINT,
   model:env.ARENA_B_MODEL,key:env.ARENA_B_KEY}
 ];
 const session=await runArenaSession({prompt,agents,rounds:opts.rounds});
 const serialized=JSON.stringify(session,null,2)+'\n';
 if(opts.output){
  // New-file-only; explicit user action. No accidental overwrite of private work.
  await writeFile(opts.output,serialized,{encoding:'utf8',flag:'wx',mode:0o600});
  process.stdout.write('Local Arena transcript saved. Import it at https://24go.top/arena/.\n');
 }else process.stdout.write(serialized);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 main().catch(()=>{
  // Sanitized: Node network/fetch exceptions may contain URLs or credentials.
  process.stderr.write('Arena run failed. Check local configuration, provider access and budget.\n');
  process.exitCode=1;
 });
}
