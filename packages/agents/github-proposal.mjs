/**
 * Explicit public GitHub issue handoff for signed agent manuscripts.
 * A proposal is NOT a published article or an authenticated 24GOTOP agent.
 * Only bounded, independently reviewed metadata is transmitted.
 */
import {scanDraftSharingRisks} from '../../site/draft-lab-privacy.js';
import {verifySignedAgentProposal} from './editorial-proposal.mjs';

const REPO='rf24kja/24GO.top';
const API='https://api.github.com';
const MARKER='24gotop-agent-proposal:';
const MAX_PUBLIC_SUMMARY=1200;
const ISSUE_URL=/^https:\/\/github\.com\/rf24kja\/24GO\.top\/issues\/[1-9][0-9]*$/;
const invalid=()=>{throw new TypeError('Invalid public agent editorial request');};
const markdown=value=>value
 .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
 .replace(/([\\*_{}\[\]()#+.!|>-])/g,'\\$1')
 .replaceAll(String.fromCharCode(96),'\\'+String.fromCharCode(96));

export function prepareGitHubAgentProposal(raw,{
 publicKey,expectedOwnerId,expectedAgentId,summary,now=new Date()
}={}){
 if(typeof summary!=='string'||summary.length<80||
    summary.length>MAX_PUBLIC_SUMMARY||summary.trim()!==summary||
    /[\u0000-\u001f\u007f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u.test(summary)||
    /@[A-Za-z0-9_-]/u.test(summary)||
    !(now instanceof Date)||!Number.isFinite(now.getTime()))invalid();
 const verified=verifySignedAgentProposal(raw,{
  publicKey,expectedOwnerId,expectedAgentId
 });
 const signedTime=new Date(verified.createdAt).getTime();
 // Seven-day bound limits indefinitely reusable public submission packages.
 if(signedTime>now.getTime()+5*60*1000||
    signedTime<now.getTime()-7*24*60*60*1000)invalid();
 const {title,locale,category}=verified.draft;
 // Full manuscript and original source URL remain OFFLINE.
 if(/@[A-Za-z0-9_-]/u.test(title)||scanDraftSharingRisks({
  title,body:summary,source:''
 }).flagged)invalid();
 const hash=verified.sha256;
 const body=[
  '## Public editorial proposal — not a published article',
  '',
  '**Proposed headline:** '+markdown(title),
  '',
  '**Public reader summary:** '+markdown(summary),
  '',
  '- Original language: '+locale,
  '- Technical category: '+category,
  '- Owner ID (operator assertion): '+markdown(verified.ownerId),
  '- Agent ID (operator assertion): '+markdown(verified.agentId),
  '- Offline manuscript SHA-256: '+hash,
  '- Owner-pinned key fingerprint: '+verified.keyFingerprint,
  '',
  'The full signed manuscript, private key and source URL were NOT uploaded.',
  'The Ed25519 signature proves only a local key handoff with an independently pinned public key.',
  'It does not verify a hosted identity, authorize moderation, or grant publishing rights.',
  'A human maintainer must review originality, citations, permissions and security.',
  'No automatic replies, cross-posting or link promotion are requested.',
  '',
  '<!-- '+MARKER+hash+' -->'
 ].join('\n');
 return Object.freeze({title:'Article proposal: '+title,body,sha256:hash});
}

function githubHeaders(token){
 if(typeof token!=='string'||token.length<10||/\s/u.test(token))invalid();
 return {
  'Accept':'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28',
  'Authorization':'Bearer '+token,
  'User-Agent':'24gotop-agent-editorial-oss'
 };
}
async function readGitHubJson(response){
 if(!response||typeof response.text!=='function')invalid();
 const raw=await response.text();
 if(typeof raw!=='string'||raw.length>262144)invalid();
 try{return JSON.parse(raw);}catch{invalid();}
}
function verifyIssueUrl(value){
 if(typeof value!=='string'||!ISSUE_URL.test(value))invalid();
 return value;
}
export async function submitGitHubAgentProposal({
 proposal,token,fetchImpl=globalThis.fetch
}={}){
 if(!proposal||typeof proposal!=='object'||
   typeof proposal.title!=='string'||typeof proposal.body!=='string'||
   typeof proposal.sha256!=='string'||!/^[a-f0-9]{64}$/.test(proposal.sha256)||
   !proposal.body.includes('<!-- '+MARKER+proposal.sha256+' -->')||
   proposal.title.length>200||proposal.body.length>5000||
   typeof fetchImpl!=='function')invalid();
 const headers=githubHeaders(token);
 const query='repo:'+REPO+' is:issue in:body '+proposal.sha256;
 const searchUrl=API+'/search/issues?q='+encodeURIComponent(query)+'&per_page=20';
 const options={headers,redirect:'error',signal:AbortSignal.timeout(12000)};
 // Search is a best-effort duplicate guard, not an atomic GitHub idempotency key.
 const lookup=await fetchImpl(searchUrl,{...options,method:'GET'});
 if(lookup.status!==200)invalid(); // fail closed before a potentially duplicate write
 const matches=await readGitHubJson(lookup);
 if(!matches||!Array.isArray(matches.items)||matches.total_count>20)invalid();
 const found=matches.items.find(item=>item&&item.pull_request===undefined&&
   typeof item.body==='string'&&
   item.body.includes('<!-- '+MARKER+proposal.sha256+' -->'));
 if(found)return Object.freeze({url:verifyIssueUrl(found.html_url),created:false});
 const response=await fetchImpl(API+'/repos/'+REPO+'/issues',{
  ...options,method:'POST',
  headers:{...headers,'Content-Type':'application/json'},
  body:JSON.stringify({title:proposal.title,body:proposal.body})
 });
 if(response.status!==201)invalid();
 const issue=await readGitHubJson(response);
 return Object.freeze({url:verifyIssueUrl(issue?.html_url),created:true});
}
