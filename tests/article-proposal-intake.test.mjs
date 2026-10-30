import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const form=read('.github/ISSUE_TEMPLATE/article_proposal.yml');
const page=read('site/contribute.html');
const css=read('site/contribute.css');
const draft=read('site/draft-lab.html');
const home=read('site/index.html');
const articles=read('site/engineering/index.html');
const sitemap=read('site/sitemap.xml');
const docs=read('docs/EDITORIAL_CONTRIBUTIONS.md');

test('real GitHub proposal issue form requests only non-sensitive public editorial information',()=>{
 assert.match(form,/^name: Technical article proposal$/m);
 for(const field of ['headline','language','topic','summary','evidence','acknowledgements'])
  assert.ok(form.includes('id: '+field),'missing required field '+field);
 assert.match(form,/type: checkboxes/);
 assert.equal((form.match(/required: true/g)||[]).length,7);
 for(const language of ['English','Русский','ไทย','Español','Français','Deutsch','Português','中文'])
  assert.ok(form.includes('- '+language),language);
 assert.match(form,/PUBLIC GitHub issue/);
 assert.match(form,/not publish an article on 24go\.top/);
 assert.match(form,/I understand an article PR involving repository content/);
 assert.match(form,/Do not paste private drafts/);
 assert.doesNotMatch(form,/password.*required|email.*required|service_role|sb_secret_/i);
});

test('real article proposal page is a crawlable, privacy-first, human-reviewed author journey',()=>{
 assert.match(page,/<html lang="en">/);
 assert.match(page,/<link rel="canonical" href="https:\/\/24go\.top\/contribute\.html">/);
 assert.match(page,/<main class="wrap contribution" id="main-content" tabindex="-1">/);
 assert.match(page,/role="note"/);
 assert.match(page,/Github issues|GitHub issues/);
 assert.match(page,/Creating a proposal does not guarantee acceptance or publication/);
 assert.match(page,/not an article published on 24go\.top/);
 assert.match(page,/Your own copy|your own copy|keep your own copy/i);
 assert.match(page,/href="\.\/draft-lab\.html"/);
 assert.match(page,/https:\/\/github\.com\/rf24kja\/24GO\.top\/issues\/new\?template=article_proposal\.yml/);
 assert.match(page,/docs\/EDITORIAL_CONTRIBUTIONS\.md/);
 assert.match(page,/existing MIT licensing context/);
 assert.doesNotMatch(page,/<script\b|<form\b|<iframe\b|<base\b|onerror=|onclick=|fetch\s*\(/i);
 assert.doesNotMatch(page,/sb_secret_|service_role|PUBLISH_API_KEY|localStorage|tracking/i);
});

test('public visitor can discover proposal path; it never silently submits editor text',()=>{
 assert.match(home,/href="\.\/contribute\.html">Propose an article/);
 assert.match(draft,/href="\.\/contribute\.html" lang="en"/);
 assert.match(articles,/href="\.\.\/contribute\.html">How to propose an original article/);
 assert.match(draft,/does not publish, upload or automatically save your writing/);
 assert.match(docs,/public.*proposal.*not.*article/i);
 assert.match(docs,/Human review and the published state/);
 assert.match(docs,/npm run feed:check/);
 assert.match(docs,/Rights|rights/i);
 assert.match(sitemap,/<url><loc>https:\/\/24go\.top\/contribute\.html<\/loc><\/url>/);
});

test('contribution experience remains readable at mobile width and keyboard accessible',()=>{
 assert.match(page,/<a class="skip" href="#main-content">/);
 assert.match(page,/aria-labelledby="steps-heading"/);
 assert.match(page,/class="contribution-steps"/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(prefers-contrast:more\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/grid-template-columns:1fr/);
 assert.doesNotMatch(css,/@import|url\(https?:\/\//);
});
