// Only a human-confirmed public GitHub editorial proposal link.
// Do not put the draft body, source, filename, author identity or credentials in any URL.
import {LOCALES,validDraftTitle} from './draft-lab-logic.js';
const ISSUE='https://github.com/rf24kja/24GO.top/issues/new';
export function buildArticleProposalUrl(draft){
 if(!draft||!validDraftTitle(draft.title)||!LOCALES.includes(draft.locale))return null;
 const url=new URL(ISSUE);
 url.searchParams.set('template','article_proposal.yml');
 url.searchParams.set('title','Article proposal: '+draft.title.trim());
 return url.href;
}
