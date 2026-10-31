import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const articleFiles=["site/engineering/discoverable-technical-articles.html","site/engineering/javascript-sdk-api-key-leak-prevention.html","site/engineering/markdown-preview-safety.html","site/engineering/multilingual-markdown-editor-without-losing-drafts.html","site/engineering/postgres-insert-returning-least-privilege.html","site/engineering/read-only-mcp-server-for-technical-articles.html","site/engineering/safe-markdown-citation-links-without-xss.html","site/engineering/submit-is-not-publish.html","site/engineering/verify-github-pages-deploy-not-just-ci.html","site/engineering/why-draft-lab-first.html"];
test('every published engineering article offers its own public non-security correction path',()=>{
 for(const path of articleFiles){
  const text=read(path);
  const slug=path.split('/').at(-1).replace(/\.html$/,'');
  assert.match(text,/class="article-report"/);
  assert.match(text,/aria-label="Report a problem with this article"/);
  assert.ok(text.includes('template=article_report.yml&amp;title=Article%20report%3A%20'+slug),path);
  assert.match(text,/SECURITY\.md/);
  assert.match(text,/Reports are public and reviewed manually/);
  const reportAt=text.indexOf('class="article-report"');
  const articleEnd=text.indexOf('</article>');
  const relatedAt=text.indexOf('<nav class="related-reading"');
  const mainEnd=text.indexOf('</main>');
  assert.ok(reportAt>=0&&reportAt<articleEnd,path+' reports remain inside article');
  assert.ok(articleEnd<relatedAt&&relatedAt<mainEnd,
   path+' related links must remain outside the researched article block');
 }
});
test('article report issue form requires real article and safe public evidence',()=>{
 const form=read('.github/ISSUE_TEMPLATE/article_report.yml');
 for(const id of ['article_url','concern','problem','evidence','confirmation'])
  assert.ok(form.includes('id: '+id));
 assert.match(form,/THIS IS A PUBLIC/i); // tested against public markdown warning
 assert.match(form,/SECURITY\.md/);
 assert.match(form,/does not automatically remove an article/);
 assert.match(form,/Attribution or copyright concern/);
 assert.doesNotMatch(form,/service_role|sb_secret_|authorization: Bearer/i);
});
test('reporting is an opt-in external GitHub action without automatic requests',()=>{
 const index=read('site/engineering/index.html');
 const css=read('site/engineering/notes.css');
 const docs=read('docs/EDITORIAL_REPORTING.md');
 assert.match(index,/template=article_report.yml/);
 assert.match(css,/\.article-report/);
 assert.match(docs,/No article is automatically hidden/);
 for(const path of articleFiles){
  const content=read(path);
  const aside=content.match(/<aside class="article-report"[\s\S]*?<\/aside>/)?.[0];
  assert.ok(aside,path);
  assert.doesNotMatch(aside,/<script|<form|fetch\(|onclick=|localStorage|<iframe/i);
 }
});
