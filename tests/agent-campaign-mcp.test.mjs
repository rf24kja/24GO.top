import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync} from 'node:crypto';
import {
 createAgentCampaignSessionFromEnv,handleAgentCampaignMcpRequest
} from '../packages/mcp/campaign-stdio.mjs';

const campaign={
 campaignName:'A practical property-content campaign',
 targetSiteName:'24GO.ASIA',targetUrl:'https://24go.asia/',
 audience:'Independent real-estate agents and small property agencies.',
 goal:'Create an evidence-led guide that helps agents evaluate property-content workflows.',
 relationshipDisclosure:'Disclosure: The author is affiliated with 24GO.ASIA.',
 productFacts:['24GO.ASIA is a property-content workflow project for real-estate professionals.'],
 prohibitedClaims:[],
 topic:{
  workingTitle:'A practical workflow for property listing content',
  readerProblem:'Agents need accurate and consistent property listing descriptions.',
  angle:'Explain a useful editorial process and include a transparent service reference.'
 }
};

test('campaign MCP exposes private multi-agent tools and creates a campaign over JSON-RPC',async()=>{
 const root=mkdtempSync(join(tmpdir(),'24gotop-campaign-mcp-'));
 const stateDir=join(root,'state');mkdirSync(stateDir,{mode:0o700});
 const pair=generateKeyPairSync('ed25519');
 const privateKeyPath=join(root,'publisher.private.pem');
 const publicKeyPath=join(root,'publisher.public.pem');
 writeFileSync(privateKeyPath,pair.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 writeFileSync(publicKeyPath,pair.publicKey.export({type:'spki',format:'pem'}),{mode:0o644});
 const env={
  MCP_CAMPAIGN_STATE_DIR:stateDir,MCP_CAMPAIGN_OWNER_ID:'founder-team',
  MCP_CAMPAIGN_PUBLISHER_AGENT_ID:'campaign-publisher',
  MCP_CAMPAIGN_PRIVATE_KEY:privateKeyPath,MCP_CAMPAIGN_PUBLIC_KEY:publicKeyPath
 };
 try{
  const session=createAgentCampaignSessionFromEnv({env,now:()=>new Date('2026-11-17T17:02:00Z'),localMainShaProvider:()=> 'a'.repeat(40)});
  const listed=handleAgentCampaignMcpRequest({jsonrpc:'2.0',id:1,method:'tools/list'},session);
  const names=listed.result.tools.map(item=>item.name);
  assert.deepEqual(names,[
   'create_promotion_campaign','claim_campaign_task','submit_campaign_task_result',
   'release_campaign_task','send_campaign_message','read_campaign_messages',
   'get_campaign_status','finalize_campaign_article'
  ]);
  assert.ok(!names.some(name=>/publish|comment|social|post/i.test(name)));
  const initialized=handleAgentCampaignMcpRequest({
   jsonrpc:'2.0',id:2,method:'initialize',params:{protocolVersion:'2025-06-18'}
  },session);
  assert.equal(initialized.result.serverInfo.name,'24gotop-local-agent-campaigns');
  assert.match(initialized.result.instructions,/human merge/);
  const created=handleAgentCampaignMcpRequest({
   jsonrpc:'2.0',id:3,method:'tools/call',
   params:{name:'create_promotion_campaign',arguments:campaign}
  },session);
  const value=JSON.parse(created.result.content[0].text);
  assert.equal(value.status,'active');
  assert.equal(value.nextRole,'researcher');
  const status=handleAgentCampaignMcpRequest({
   jsonrpc:'2.0',id:4,method:'tools/call',
   params:{name:'get_campaign_status',arguments:{campaignId:value.campaignId}}
  },session);
  const current=JSON.parse(status.result.content[0].text);
  assert.equal(current.campaign.targetUrl,campaign.targetUrl);
  assert.equal(current.tasks.length,1);
  assert.equal(current.tasks[0].role,'researcher');
  const message=handleAgentCampaignMcpRequest({
   jsonrpc:'2.0',id:5,method:'tools/call',
   params:{name:'send_campaign_message',arguments:{
    campaignId:value.campaignId,fromAgent:'research-agent',toAgent:'writer-agent',
    kind:'handoff',body:'Please use primary sources and avoid unsupported product claims.'
   }}
  },session);
  assert.equal(JSON.parse(message.result.content[0].text).publiclyPosted,false);
  const invalid=handleAgentCampaignMcpRequest({
   jsonrpc:'2.0',id:6,method:'tools/call',
   params:{name:'create_promotion_campaign',arguments:{...campaign,targetUrl:'http://127.0.0.1/'}}
  },session);
  assert.equal(invalid.result.isError,true);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('campaign MCP rejects invalid JSON-RPC and does not expose a hosted endpoint',async()=>{
 const root=mkdtempSync(join(tmpdir(),'24gotop-campaign-mcp-invalid-'));
 const stateDir=join(root,'state');mkdirSync(stateDir,{mode:0o700});
 const pair=generateKeyPairSync('ed25519');
 const privateKeyPath=join(root,'publisher.private.pem');
 const publicKeyPath=join(root,'publisher.public.pem');
 writeFileSync(privateKeyPath,pair.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 writeFileSync(publicKeyPath,pair.publicKey.export({type:'spki',format:'pem'}),{mode:0o644});
 try{
  const session=createAgentCampaignSessionFromEnv({
   env:{MCP_CAMPAIGN_STATE_DIR:stateDir,MCP_CAMPAIGN_OWNER_ID:'founder-team',
    MCP_CAMPAIGN_PUBLISHER_AGENT_ID:'campaign-publisher',
    MCP_CAMPAIGN_PRIVATE_KEY:privateKeyPath,MCP_CAMPAIGN_PUBLIC_KEY:publicKeyPath},
   now:()=>new Date('2026-11-17T17:02:00Z'),localMainShaProvider:()=> 'a'.repeat(40)
  });
  assert.equal(handleAgentCampaignMcpRequest({},session).error.code,-32600);
  const listed=handleAgentCampaignMcpRequest({jsonrpc:'2.0',id:1,method:'tools/list'},session);
  assert.equal(listed.result.tools.some(item=>item.name==='register_agent'),false);
  assert.equal(listed.result.tools.some(item=>item.name==='publish_article'),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
