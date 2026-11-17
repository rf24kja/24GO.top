// Browser-only, offline MCP configuration helper. No fetch, storage or secrets.
const ID=/^[a-z][a-z0-9-]{2,63}$/;
const CONTROL=/[\u0000-\u001f\u007f\u2028\u2029]/u;
function absolutePath(value){
 if(typeof value!=='string'||!value.trim()||value.length>4096||
    CONTROL.test(value)||value!==value.trim()||
    !(/^(?:\/[a-zA-Z0-9]|[a-zA-Z]:[\\/][^\\/])/u.test(value)))
  throw new TypeError('Enter a real absolute path for every required local file.');
 return value;
}
function scriptPath(root,leaf){
 const path=absolutePath(root).replace(/[\\/]+$/u,'');
 if(!path)throw new TypeError('Use a directory, not the filesystem root.');
 return path+(path.includes('\\')?'\\':'/')+leaf.replaceAll('/',path.includes('\\')?'\\':'/');
}
function validDraftEndpoint(value){
 if(typeof value!=='string'||!value||value.length>512||CONTROL.test(value)||
  /%2e|%2f|\\|(?:^|\/)\.{1,2}(?:\/|$)/i.test(value))
  throw new TypeError('Use an HTTPS chat-completions endpoint or an HTTP loopback endpoint.');
 let url;
 try{url=new URL(value);}catch{throw new TypeError('Enter a valid model endpoint URL.');}
 const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(url.username||url.password||url.search||url.hash||
  !/^\/[A-Za-z0-9/_-]+$/.test(url.pathname)||
  !(url.protocol==='https:'||(url.protocol==='http:'&&loopback))||url.href!==value)
  throw new TypeError('Use an HTTPS chat-completions endpoint or an HTTP loopback endpoint without credentials, query or fragment.');
 return value;
}
function validModel(value){
 if(typeof value!=='string'||!value.trim()||value!==value.trim()||
  value.length>100||CONTROL.test(value))
  throw new TypeError('Enter the exact model identifier (1–100 characters).');
 return value;
}
function validPublicationTime(value){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value))
  throw new TypeError('Use an exact UTC timestamp such as 2026-11-17T15:34:00Z.');
 const date=new Date(value);
 if(!Number.isFinite(date.getTime())||date.toISOString().replace('.000Z','Z')!==value)
  throw new TypeError('Publication time must be a real UTC date and time.');
 return value;
}
export function buildAgentMcpConfig({
 mode,repoPath,packagePath,publicKeyPath,summaryPath,ownerId,agentId,publicationTime,
 outputRoot,privateKeyPath,draftEndpoint,draftModel,reviewEndpoint,reviewModel,
 campaignStateDir,campaignPrivateKeyPath,campaignPublicKeyPath
}={}){
 if(!['reader','editorial','publication','authoring','campaign','campaign-publisher'].includes(mode))
  throw new TypeError('Choose a supported local agent workflow.');
 const leaf=mode==='reader'?'packages/mcp/stdio.mjs':
  mode==='editorial'?'packages/mcp/editorial-stdio.mjs':
  mode==='publication'?'packages/mcp/publication-stdio.mjs':
  mode==='authoring'?'packages/mcp/authoring-stdio.mjs':'packages/mcp/campaign-stdio.mjs';
 const settings={command:'node',args:[scriptPath(repoPath,leaf)]};
 if(mode==='editorial'||mode==='publication'){
  if(!ID.test(ownerId??'')||!ID.test(agentId??''))
   throw new TypeError('Owner and agent IDs must be 3–64 lowercase letters, digits or hyphens, starting with a letter.');
  settings.env={
   MCP_AGENT_PACKAGE:absolutePath(packagePath),
   MCP_AGENT_PUBLIC_KEY:absolutePath(publicKeyPath),
   MCP_AGENT_PUBLIC_SUMMARY:absolutePath(summaryPath),
   MCP_AGENT_OWNER_ID:ownerId,
   MCP_AGENT_ID:agentId
  };
 }
 if(mode==='campaign'){
  settings.env={MCP_CAMPAIGN_STATE_DIR:absolutePath(campaignStateDir)};
 }
 if(mode==='campaign-publisher'){
  if(!ID.test(ownerId??'')||!ID.test(agentId??''))
   throw new TypeError('Owner and publisher-agent IDs must be 3–64 lowercase letters, digits or hyphens, starting with a letter.');
  settings.env={
   MCP_CAMPAIGN_STATE_DIR:absolutePath(campaignStateDir),
   MCP_CAMPAIGN_PRIVATE_KEY:absolutePath(campaignPrivateKeyPath),
   MCP_CAMPAIGN_PUBLIC_KEY:absolutePath(campaignPublicKeyPath),
   MCP_CAMPAIGN_OWNER_ID:ownerId,
   MCP_CAMPAIGN_PUBLISHER_AGENT_ID:agentId
  };
 }
 if(mode==='authoring'){
  if(!ID.test(ownerId??'')||!ID.test(agentId??''))
   throw new TypeError('Owner and agent IDs must be 3–64 lowercase letters, digits or hyphens, starting with a letter.');
  settings.env={
   MCP_AGENT_OUTPUT_ROOT:absolutePath(outputRoot),
   MCP_AGENT_PRIVATE_KEY:absolutePath(privateKeyPath),
   MCP_AGENT_PUBLIC_KEY:absolutePath(publicKeyPath),
   MCP_AGENT_OWNER_ID:ownerId,MCP_AGENT_ID:agentId,
   AGENT_DRAFT_ENDPOINT:validDraftEndpoint(draftEndpoint),
   AGENT_DRAFT_MODEL:validModel(draftModel)
  };
  if(reviewEndpoint||reviewModel){
   settings.env.AGENT_REVIEW_ENDPOINT=validDraftEndpoint(reviewEndpoint);
   settings.env.AGENT_REVIEW_MODEL=validModel(reviewModel);
  }
 }
  if(mode==='editorial')settings.env.MCP_AGENT_ALLOW_PUBLIC_ISSUE='0';
 if(mode==='publication'){
  settings.env.MCP_AGENT_PUBLICATION_TIME=validPublicationTime(publicationTime);
  // The browser helper can create preview-only config, never a write-enabled token setup.
  settings.env.MCP_AGENT_ALLOW_PUBLIC_PR='0';
 }
 const name=mode==='reader'?'24gotop-public-articles':
  mode==='editorial'?'24gotop-reviewed-editorial':
  mode==='publication'?'24gotop-static-article-publication':
  mode==='authoring'?'24gotop-local-agent-authoring':
  mode==='campaign'?'24gotop-local-campaign-workers':'24gotop-local-campaign-publisher';
 return JSON.stringify({mcpServers:{[name]:settings}},null,2);
}
export function mountAgentMcpHelper(root=document){
 const panel=root.querySelector('[data-agent-config]');
 if(!panel)return;
 const get=id=>panel.querySelector('#'+id);
 const mode=get('agent-mode'),editorial=get('editorial-fields');
 const publication=get('publication-fields');
 const authoring=get('authoring-fields');
 const campaign=get('campaign-fields');
 const campaignPublisher=get('campaign-publisher-fields');
 const output=get('agent-config-output'),status=get('agent-config-status');
 const copy=get('agent-config-copy'),generate=get('agent-config-generate');
 let latest='';
 function syncMode(){
  editorial.hidden=mode.value!=='editorial';
  publication.hidden=mode.value!=='publication';
  authoring.hidden=mode.value!=='authoring';
  campaign.hidden=!['campaign','campaign-publisher'].includes(mode.value);
  campaignPublisher.hidden=mode.value!=='campaign-publisher';
  latest='';output.textContent='';
  status.textContent='No configuration generated or sent.';copy.disabled=true;
 }
 function generateConfig(){
  try{
   latest=buildAgentMcpConfig({
    mode:mode.value,repoPath:get('repo-path').value,
    packagePath:get('package-path').value,
    publicKeyPath:mode.value==='authoring'?get('authoring-public-key-path').value:
     mode.value==='campaign-publisher'?get('campaign-public-key-path').value:get('public-key-path').value,
    summaryPath:get('summary-path').value,
    ownerId:mode.value==='authoring'?get('authoring-owner-id').value:
     mode.value==='campaign-publisher'?get('campaign-owner-id').value:get('owner-id').value,
    agentId:mode.value==='authoring'?get('authoring-agent-id').value:
     mode.value==='campaign-publisher'?get('campaign-publisher-agent-id').value:get('agent-id').value,
    publicationTime:get('publication-time').value,
    outputRoot:get('authoring-output-root').value,
    privateKeyPath:get('authoring-private-key-path').value,
    draftEndpoint:get('draft-endpoint').value,
    draftModel:get('draft-model').value,
    reviewEndpoint:get('review-endpoint').value,
    reviewModel:get('review-model').value,
    campaignStateDir:get('campaign-state-dir').value,
    campaignPrivateKeyPath:get('campaign-private-key-path').value,
    campaignPublicKeyPath:get('campaign-public-key-path').value
   });
   output.textContent=latest;
   status.textContent='Local configuration ready. Review the local paths, model endpoint and consent settings before installing it in your MCP client.';
   copy.disabled=false;
  }catch(error){
   latest='';output.textContent='';copy.disabled=true;
   status.textContent=error.message;
  }
 }
 mode.addEventListener('change',syncMode);
 generate.addEventListener('click',generateConfig);
 copy.addEventListener('click',async()=>{
  if(!latest)return;
  try{
   if(!navigator.clipboard?.writeText)throw new Error('No clipboard API');
   await navigator.clipboard.writeText(latest);
   status.textContent='Configuration copied locally. No information was uploaded.';
  }catch{
   status.textContent='Clipboard unavailable. Select and copy the configuration text manually.';
  }
 });
 for(const field of panel.querySelectorAll('input')){
  field.addEventListener('input',()=>{
   latest='';output.textContent='';copy.disabled=true;
   status.textContent='Configuration changed. Generate again to review it.';
  });
 }
 syncMode();
}
if(typeof document!=='undefined')mountAgentMcpHelper();
