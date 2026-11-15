#!/usr/bin/env node
/** Offline static app intake. Prints a report only, never uploads or extracts. */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateStaticZip,validateStaticDirectory} from '../packages/library/validator.mjs';
export async function main(argv=process.argv.slice(2)){
 if(argv.length!==2||!['--zip','--dir'].includes(argv[0])||!argv[1]){
  throw new TypeError('Usage: npm run library:validate -- --zip app.zip OR --dir ./checked-out-app');
 }
 const report=argv[0]==='--zip'?
  validateStaticZip(await readFile(argv[1])):
  await validateStaticDirectory(argv[1]);
 process.stdout.write(JSON.stringify({
  ...report,status:'VALIDATED FOR MANUAL REVIEW — NOT PUBLISHED'
 },null,2)+'\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 main().catch(()=>{
  process.stderr.write('Library package validation failed. Check static asset format and package limits.\n');
  process.exitCode=1;
 });
}
