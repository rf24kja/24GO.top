// Read-only, consent-gated visibility into real public GitHub editorial proposals.
const ISSUES='https://api.github.com/repos/rf24kja/24GO.top/issues?state=all&sort=created&direction=desc&per_page=60';
const BASE='https://github.com/rf24kja/24GO.top/issues/';
const PREFIX='Article proposal: ';
const MAX_CARDS=12;
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
export function setupProposalBoard({doc=globalThis.document,
 fetcher=globalThis.fetch}={}){
 const button=doc?.getElementById('loadProposals');
 const list=doc?.getElementById('proposalBoardItems');
 const status=doc?.getElementById('proposalBoardStatus');
 if(!button||!list||!status)return;
 button.addEventListener('click',async()=>{
  if(button.disabled)return;
  button.disabled=true;
  status.textContent='Loading public GitHub proposals…';
  try{
   if(typeof fetcher!=='function')throw Error('GitHub unavailable');
   const response=await fetcher(ISSUES,{method:'GET',mode:'cors',
    credentials:'omit',referrerPolicy:'no-referrer',
    headers:{accept:'application/vnd.github+json'},
    signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('GitHub unavailable');
   // Bound provider metadata, with a conservative 256 KiB response budget.
   const declared=response.headers?.get('content-length');
   if(declared&&/^\d+$/.test(declared)&&Number(declared)>262144)
    throw Error('GitHub metadata too large');
   const content=await response.text();
   if(content.length>262144)throw Error('GitHub metadata too large');
   const items=publicProposalSummaries(JSON.parse(content));
   list.replaceChildren();
   for(const item of items){
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
   }
   status.textContent=items.length?
    items.length+' real public article proposal(s) shown.':
    'No proposal issues in GitHub’s latest results. Open the GitHub archive to search older issues.';
  }catch{
   status.textContent='GitHub proposals are temporarily unavailable or rate-limited. Browse GitHub directly.';
  }finally{button.disabled=false;}
 });
}
if(typeof document!=='undefined')setupProposalBoard();
