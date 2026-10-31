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
