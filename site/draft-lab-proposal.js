// Only a human-confirmed public GitHub editorial proposal link.
// Do not put the draft body, source, filename, author identity or credentials in any URL.
const ISSUE='https://github.com/rf24kja/24GO.top/issues/new';
const LOCALES=new Set(['en','ru','th','es','fr','de','pt','zh']);
export function buildArticleProposalUrl(draft){
 if(!draft||typeof draft.title!=='string'||typeof draft.locale!=='string')return null;
 const title=draft.title.trim();
 if(title.length<5||title.length>160||/[\x00-\x1f\x7f]/.test(title)||!LOCALES.has(draft.locale))return null;
 const url=new URL(ISSUE);
 url.searchParams.set('template','article_proposal.yml');
 url.searchParams.set('title','Article proposal: '+title);
 return url.href;
}
