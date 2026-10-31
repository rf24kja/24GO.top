import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(resolve(root,p),'utf8');
const locales=['ru','th','es','fr','de','pt','zh'];
const readmes=['README.md',...locales.map(l=>'docs/i18n/README.'+l+'.md')];
const names=['globe','article','edit','roadmap','community','code','verify'];
const iconDir='docs/assets/readme-icons/';

test('vendored Material icons are small, self-contained, decorative and attributed',()=>{
 const sources=read(iconDir+'SOURCES.md');
 const license=read(iconDir+'LICENSE');
 assert.match(license,/Apache License/);
 assert.match(license,/Version 2\.0/);
 assert.match(sources,/Google Material Design Icons/);
 assert.match(sources,/Apache License 2\.0/);
 assert.match(sources,/#087f6c/);
 for(const name of names){
  const path=iconDir+name+'.svg';
  const svg=read(path);
  assert.ok(statSync(resolve(root,path)).size<2000,'keep icon tiny: '+name);
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/viewBox="0 0 24 24"/);
  assert.match(svg,/role="img" aria-labelledby="title desc"/);
  assert.match(svg,/<title id="title">[^<]+<\/title>/);
  assert.match(svg,/<desc id="desc">/);
  assert.match(svg,/<path fill="#087f6c" d="[^"]+"\/>/);
  assert.doesNotMatch(svg.replace('xmlns="http://www.w3.org/2000/svg"',''),/<script|<foreignObject|<iframe|<image|<style|@import|onload|onclick|onerror|javascript:|<use|<animate|xlink:|https?:\/\//i,
    'no active or remotely loaded assets: '+name);
  assert.ok(sources.includes('`'+name+'.svg`'),'source attribution: '+name);
 }
});

test('eight README files expose decorative Material icons next to actual accessible text links',()=>{
 for(const file of readmes){
  const markdown=read(file);
  const htmlLinks=[...markdown.matchAll(/<a href="([^"]+)">\s*<img src="([^"]+\.svg)" alt="" width="18" height="18">\s*([^<]+)<\/a>/g)];
  assert.ok(htmlLinks.length>=4,file+' has too few icon-and-label links');
  for(const [_,href,src,label] of htmlLinks){
   assert.ok(label.trim().length>=3,file+' must have a real textual label');
   assert.ok(!/^javascript:/i.test(href));
   const iconPath=resolve(dirname(resolve(root,file)),src);
   assert.ok(iconPath.startsWith(resolve(root,iconDir)),file+' image outside licensed icon folder');
   assert.ok(names.some(name=>iconPath===resolve(root,iconDir+name+'.svg')),
     file+' unknown icon path');
  }
  assert.ok(markdown.includes('README.md'),file+' must retain English entry point');
  assert.ok(/24gotop-readme-hero(?:\.[a-z]{2})?\.svg/.test(markdown),file+' retains localized product artwork');
 }
 const en=read('README.md');
 assert.equal((en.match(/readme-icons\//g)||[]).length,15,
   'English README keeps limited icon use, not decorative clutter');
 for(const name of ['globe','article','edit','roadmap','community']){
  assert.ok(en.includes('<img src="./'+iconDir+name+'.svg" alt="" width="18" height="18">'));
 }
});

test('branch protection documentation does not confuse GitHub settings with repository CI',()=>{
 const runbook=read('docs/BRANCH_PROTECTION_RUNBOOK.md');
 const ci=read('.github/workflows/ci.yml');
 assert.match(ci,/name: Tests and checks/);
 assert.match(ci,/\n  test:\n/);
 assert.match(runbook,/GitHub Free\/public/);
 assert.match(runbook,/Require a pull request before merging/);
 assert.match(runbook,/Require status checks to pass before merging/);
 assert.match(runbook,/Allow force pushes/);
 assert.match(runbook,/Allow deletions/);
 assert.match(runbook,/cannot create\/edit repository protection rules/);
 assert.match(runbook,/not evidence a protection/);
 assert.doesNotMatch(runbook,/branch protection (?:is|was) enabled|main is protected/i);
});
