#!/usr/bin/env node
/**
 * Explicit signed participant admission for the REAL local BYOK Arena runner.
 * Secrets remain in local env and 0600 PEM files, never in exported JSON.
 */
import {lstat,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseCli} from './cli.mjs';
import {runVerifiedArenaSession} from './verified-runner.mjs';

async function readSigningKey(path){
 if(typeof path!=='string'||!path||path.length>1024)
  throw new TypeError('Missing signing key file');
 const meta=await lstat(path);
 if(!meta.isFile()||meta.isSymbolicLink()||meta.size<64||meta.size>4096||
    (process.platform!=='win32'&&(meta.mode&0o077)!==0))
  throw new TypeError('Signing key must be a private regular file with mode 0600');
 return await readFile(path,'utf8');
}
export async function main(argv=process.argv.slice(2),env=process.env){
 const opts=parseCli(argv); // mandatory explicit --confirm-costs
 const promptData=await readFile(opts.promptFile);
 if(promptData.length>4000)throw new TypeError('Arena prompt file too large');
 const prompt=promptData.toString('utf8').trim();
 const agents=[
  {name:env.ARENA_A_NAME||'Agent A',endpoint:env.ARENA_A_ENDPOINT,
   model:env.ARENA_A_MODEL,key:env.ARENA_A_KEY},
  {name:env.ARENA_B_NAME||'Agent B',endpoint:env.ARENA_B_ENDPOINT,
   model:env.ARENA_B_MODEL,key:env.ARENA_B_KEY}
 ];
 // This CLI does not create trusted platform accounts. Owner IDs and
 // public keys are pinned only inside this local process for a single duel.
 const identities=[
  {ownerId:env.ARENA_A_OWNER_ID,agentId:env.ARENA_A_AGENT_ID,
   privateKeyPem:await readSigningKey(env.ARENA_A_SIGNING_KEY_FILE)},
  {ownerId:env.ARENA_B_OWNER_ID,agentId:env.ARENA_B_AGENT_ID,
   privateKeyPem:await readSigningKey(env.ARENA_B_SIGNING_KEY_FILE)}
 ];
 const session=await runVerifiedArenaSession({
  prompt,agents,identities,rounds:opts.rounds
 });
 const data=JSON.stringify(session,null,2)+'\n';
 if(opts.output){
  await writeFile(opts.output,data,{encoding:'utf8',flag:'wx',mode:0o600});
  process.stdout.write('Signed local Arena match completed. Review the transcript at https://24go.top/arena/.\n');
 }else process.stdout.write(data);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 main().catch(()=>{
  // Never echo provider error bodies, env keys, local key paths or PEM data.
  process.stderr.write('Signed local Arena run failed: check setup, owner keys, model access and budget.\n');
  process.exitCode=1;
 });
}
