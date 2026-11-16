import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {formatDraft} from '../site/draft-lab-logic.js';
import {createSignedAgentProposal,verifySignedAgentProposal,
 MAX_AGENT_PROPOSAL_BYTES,AGENT_PROPOSAL_AUDIENCE} from '../packages/agents/editorial-proposal.mjs';

const draft={
 title:'Reliable agent-generated technical publishing',
 body:'This technical article explains a reproducible security test, its constraints, and the exact negative case.\n\n## Implementation\nUse a trusted owner public key.',
 locale:'en',category:'guides',source:'https://example.org/docs'
};
const document=formatDraft(draft);
const pair=generateKeyPairSync('ed25519');
const other=generateKeyPairSync('ed25519');
const opts={
 document,ownerId:'team-owner',agentId:'research-agent',
 privateKey:pair.privateKey,now:new Date('2026-11-16T09:00:00.000Z')
};
const verifier={
 publicKey:pair.publicKey,expectedOwnerId:'team-owner',expectedAgentId:'research-agent'
};

test('an offline agent can sign a canonical Draft Lab manuscript for human review',()=>{
 const signed=createSignedAgentProposal(opts);
 assert.equal(signed.kind,'24gotop-agent-editorial-proposal');
 assert.equal(signed.version,1);
 assert.equal(signed.audience,AGENT_PROPOSAL_AUDIENCE);
 assert.match(signed.signature,/^[A-Za-z0-9_-]{86}$/);
 assert.match(signed.nonce,/^[A-Za-z0-9_-]{32}$/);
 assert.equal(signed.createdAt,'2026-11-16T09:00:00.000Z');
 assert.equal(signed.document,document);
 assert.equal(Object.hasOwn(signed,'publicKey'),false,'untrusted embedded keys never establish ownership');
 assert.equal(Object.hasOwn(signed,'publish'),false);
 const checked=verifySignedAgentProposal(JSON.stringify(signed),verifier);
 assert.deepEqual(checked.draft,draft);
 assert.equal(checked.agentId,'research-agent');
 assert.equal(checked.ownerId,'team-owner');
 assert.match(checked.sha256,/^[a-f0-9]{64}$/);
 assert.match(checked.keyFingerprint,/^[a-f0-9]{64}$/);
 assert.ok(Buffer.byteLength(JSON.stringify(signed))<MAX_AGENT_PROPOSAL_BYTES);
 assert.notEqual(createSignedAgentProposal(opts).nonce,signed.nonce,
  'independent drafts carry unique random nonce labels for future replay controls');
});

test('wrong key, owner, agent, changed document and forged audience fail closed',()=>{
 const signed=createSignedAgentProposal(opts);
 for(const modified of [
  {...signed,document:signed.document.replace('negative case','substituted case')},
  {...signed,ownerId:'another-owner'},
  {...signed,agentId:'another-agent'},
  {...signed,nonce:'A'.repeat(32)},
  {...signed,createdAt:'2026-11-16T09:00:01.000Z'},
  {...signed,sha256:'0'.repeat(64)},
  {...signed,signature:'A'.repeat(86)},
  {...signed,audience:'posts:publish'},
  {...signed,version:2},
  {...signed,key:'embedded'},
  {...signed,approved:true},
  {...signed,publicKey:'attacker-controlled'}
 ])assert.throws(()=>verifySignedAgentProposal(modified,verifier),TypeError);
 for(const config of [
  {...verifier,publicKey:other.publicKey},
  {...verifier,expectedOwnerId:'another-owner'},
  {...verifier,expectedAgentId:'another-agent'},
  {...verifier,publicKey:undefined},
  {...verifier,expectedOwnerId:undefined}
 ])assert.throws(()=>verifySignedAgentProposal(signed,config),TypeError);
 const rsa=generateKeyPairSync('rsa',{modulusLength:2048});
 assert.throws(()=>createSignedAgentProposal({...opts,privateKey:rsa.privateKey}),TypeError);
 assert.throws(()=>verifySignedAgentProposal(signed,{...verifier,publicKey:rsa.publicKey}),TypeError);
});

test('proposal parser rejects incomplete, oversized or noncanonical manuscripts and payloads',()=>{
 const signed=createSignedAgentProposal(opts);
 for(const raw of [
  '{oops',
  'x'.repeat(MAX_AGENT_PROPOSAL_BYTES+1),
  JSON.stringify({...signed,createdAt:'invalid'}),
  JSON.stringify({...signed,nonce:'abc'}),
  JSON.stringify({...signed,signature:signed.signature+'='}),
  JSON.stringify({...signed,document:'not an exported Draft Lab manuscript'}),
  JSON.stringify({...signed,document:document+'\n'})
 ])assert.throws(()=>verifySignedAgentProposal(raw,verifier),TypeError);
 assert.throws(()=>createSignedAgentProposal({...opts,document:document+'\n'}),TypeError);
 assert.throws(()=>createSignedAgentProposal({...opts,document:'example'}),TypeError);
 assert.throws(()=>createSignedAgentProposal({...opts,ownerId:'Untrusted OWNER'}),TypeError);
});

test('agent editorial signing does not contain network, automatic publishing or credential logging',()=>{
 const cli=readFileSync(new URL('../packages/agents/editorial-cli.mjs',import.meta.url),'utf8');
 const code=readFileSync(new URL('../packages/agents/editorial-proposal.mjs',import.meta.url),'utf8');
 for(const source of [cli,code]){
  assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|axios\.|https\.request|http\.request/);
  assert.doesNotMatch(source,/PUBLISH_API_KEY|SUPABASE_SERVICE_ROLE|service_role|\.insert\s*\(/);
 }
 assert.match(cli,/flag:'wx'/);
 assert.match(cli,/privateOnly&&process\.platform!=='win32'/);
 assert.match(cli,/scanDraftSharingRisks\(draft\)/);
 assert.match(code,/editorial:human-review-only/);
});
