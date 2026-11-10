// Explicit, consent-gated, bounded read of PUBLIC GitHub editorial issues.
// No draft text, GitHub credentials, tracking, storage, or background requests.
const ISSUES='https://api.github.com/repos/rf24kja/24GO.top/issues?state=all&sort=created&direction=desc&per_page=60';
const BASE='https://github.com/rf24kja/24GO.top/issues/';
const PREFIX='Article proposal: ';
const MAX_CARDS=12,MAX_PAGES=4,MAX_BODY=262144;
export function publicProposalSummaries(rows){
 if(!Array.isArray(rows)||rows.length>60)throw new TypeError('Invalid public GitHub issue list');
 const seen=new Set(),list=[];
 for(const row of rows){
  if(!row||typeof row!=='object'||row.pull_request||
    typeof row.title!=='string'||!row.title.startsWith(PREFIX))continue;
  const number=row.number,title=row.title.slice(PREFIX.length).trim();
  if(!Number.isSafeInteger(number)||number<=0||number>99999999||seen.has(number)||
     title.length<5||title.length>160||
     /[\u0000-\u001f\u007f]/.test(title)||
     !['open','closed'].includes(row.state)||
     typeof row.created_at!=='string'||row.created_at.length>35||
     !Number.isFinite(Date.parse(row.created_at)))continue;
  seen.add(number);
  list.push({number,title,state:row.state,
   date:new Date(row.created_at).toISOString().slice(0,10),
   url:BASE+number});
  if(list.length===MAX_CARDS)break;
 }
 return list;
}
// A Link header is only a pagination hint, NEVER a fetch destination.
export function githubHasNextPage(header){
 return typeof header==='string'&&header.length<=4096&&
  /<[^>\r\n]{1,2000}>;\s*rel="next"(?:\s*,|\s*$)/.test(header);
}
export function setupProposalBoard({doc=globalThis.document,
 fetcher=globalThis.fetch}={}){
 const initial=doc?.getElementById('loadProposals');
 const older=doc?.getElementById('loadOlderProposals');
 const list=doc?.getElementById('proposalBoardItems');
 const status=doc?.getElementById('proposalBoardStatus');
 if(!initial||!older||!list||!status)return;
 let page=1,shown=0,loading=false,nextAllowed=false;
 const displayed=new Set();
 older.hidden=true;
 async function loadPage(){
  if(loading||page>MAX_PAGES||shown>=MAX_CARDS||
     (page>1&&!nextAllowed))return;
  loading=true;
  initial.disabled=true;older.disabled=true;
  status.textContent='Loading public GitHub proposals…';
  try{
   if(typeof fetcher!=='function')throw Error('GitHub unavailable');
   const url=ISSUES+'&page='+page;
   const response=await fetcher(url,{method:'GET',mode:'cors',
    credentials:'omit',referrerPolicy:'no-referrer',
    headers:{accept:'application/vnd.github+json'},
    signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('GitHub unavailable');
   const declared=response.headers?.get('content-length');
   if(declared&&/^\d+$/.test(declared)&&Number(declared)>MAX_BODY)
    throw Error('GitHub metadata too large');
   const content=await response.text();
   if(new TextEncoder().encode(content).byteLength>MAX_BODY)
    throw Error('GitHub metadata too large');
   const items=publicProposalSummaries(JSON.parse(content));
   if(page===1)list.replaceChildren();
   for(const item of items){
    if(displayed.has(item.number)||shown>=MAX_CARDS)continue;
    const li=doc.createElement('li');
    const name=doc.createElement('strong');
    const link=doc.createElement('a');
    link.href=item.url;
    link.rel='noopener noreferrer';
    link.textContent=item.title;
    name.append(link);
    const meta=doc.createElement('span');
    meta.textContent='Issue #'+item.number+' · '+item.date+
      ' · '+(item.state==='open'?'Open for discussion':'Closed (not necessarily published)');
    li.append(name,meta);
    list.append(li);
    displayed.add(item.number);
    shown++;
   }
   const hasOlder=githubHasNextPage(response.headers?.get('link'));
   nextAllowed=hasOlder&&page<MAX_PAGES&&shown<MAX_CARDS;
   page++;
   initial.hidden=true;
   older.hidden=!nextAllowed;
   status.textContent=(shown?
    shown+' matching public article proposal issue(s) shown.':
    'No matching proposals in the pages checked.')+
    (nextAllowed?' Choose Load older proposals to check the next page.':
     ' Browse the full GitHub issue archive for additional or older issues.');
  }catch{
   status.textContent=(shown?shown+' proposal(s) remain visible. ':'')+
    'GitHub proposals are temporarily unavailable or rate-limited. Retry or browse GitHub directly.';
  }finally{
   loading=false;initial.disabled=false;older.disabled=false;
  }
 }
 initial.addEventListener('click',loadPage);
 older.addEventListener('click',loadPage);
}
if(typeof document!=='undefined')setupProposalBoard();
