import test from 'node:test';
import assert from 'node:assert/strict';
import {buildArticleProposalUrl} from '../site/draft-lab-proposal.js';

test('proposal only transfers a confirmed public headline, never author content',()=>{
 const url=buildArticleProposalUrl({title:'  A reproducible technical guide  ',locale:'ru',body:'PRIVATE_ARTICLE_CONTENT',source:'https://secret.example',category:'tools'});
 const link=new URL(url);
 assert.equal(link.origin,'https://github.com');
 assert.equal(link.pathname,'/rf24kja/24GO.top/issues/new');
 assert.equal(link.searchParams.get('template'),'article_proposal.yml');
 assert.equal(link.searchParams.get('title'),'Article proposal: A reproducible technical guide');
 assert.equal(link.searchParams.has('body'),false);
 assert.ok(!url.includes('PRIVATE_ARTICLE_CONTENT'));
 assert.ok(!url.includes('secret.example'));
});

test('invalid headlines and unsupported languages never create an outbound proposal',()=>{
 for(const draft of [null,{}, {title:'Hi',locale:'en'},{title:'Good title',locale:'xx'},
  {title:'Valid\nheader',locale:'en'},{title:'x'.repeat(161),locale:'en'}]){
  assert.equal(buildArticleProposalUrl(draft),null);
 }
});

test('public proposal headline follows the same lossless draft export rules',()=>{
 const valid={title:'A reproducible technical guide',locale:'en',
   body:'Valid reproducible text for publication preparation.',category:'guides',source:''};
 for(const title of [
  'Valid title\u2028hidden metadata','Valid title\u2029hidden paragraph',
  'Valid title\uD800 corrupted','Valid title\uDC00 corrupted',
  'Valid title\uD83D broken','Valid title\rCategory: tools',
  'Valid title\u0000hidden','  X  ', 'x'.repeat(161)
 ]){
  assert.equal(buildArticleProposalUrl({...valid,title}),null,JSON.stringify(title));
 }
 for(const [title,lang] of [
  ['How to preserve UTF-8 across commits','en'],
  ['Инструкция по безопасной публикации','ru'],
  ['คู่มือการเขียนบทความทางเทคนิค','th'],
  ['开发技术文章与审核流程','zh'],
  ['Guides 🧪 and reproducible verification','en']
 ]){
  const url=buildArticleProposalUrl({...valid,title,locale:lang});
  assert.ok(url,title);
  const parsed=new URL(url);
  assert.equal(parsed.searchParams.get('title'),'Article proposal: '+title.trim());
  assert.equal(parsed.searchParams.has('body'),false);
  assert.equal(parsed.searchParams.has('source'),false);
  assert.equal(parsed.searchParams.has('locale'),false);
 }
});

test('a proposed article idea needs a safe headline, not a full unpublished manuscript',()=>{
 const url=buildArticleProposalUrl({title:'Safe original outline',locale:'en'});
 assert.ok(url);
 assert.equal(new URL(url).searchParams.get('title'),'Article proposal: Safe original outline');
});
