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
function validPublicationTime(value){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value))
  throw new TypeError('Use an exact UTC timestamp such as 2026-11-17T15:34:00Z.');
 const date=new Date(value);
 if(!Number.isFinite(date.getTime())||date.toISOString().replace('.000Z','Z')!==value)
  throw new TypeError('Publication time must be a real UTC date and time.');
 return value;
}
export function buildAgentMcpConfig({
 mode,repoPath,packagePath,publicKeyPath,summaryPath,ownerId,agentId,publicationTime
}={}){
 if(!['reader','editorial','publication'].includes(mode))
  throw new TypeError('Choose a supported local agent workflow.');
 const leaf=mode==='reader'?'packages/mcp/stdio.mjs':
  mode==='editorial'?'packages/mcp/editorial-stdio.mjs':'packages/mcp/publication-stdio.mjs';
 const settings={command:'node',args:[scriptPath(repoPath,leaf)]};
 if(mode!=='reader'){
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
 if(mode==='publication'){
  settings.env.MCP_AGENT_PUBLICATION_TIME=validPublicationTime(publicationTime);
  // The browser helper can create preview-only config, never a write-enabled token setup.
  settings.env.MCP_AGENT_ALLOW_PUBLIC_PR='0';
 }
 const name=mode==='reader'?'24gotop-public-articles':
  mode==='editorial'?'24gotop-reviewed-editorial':'24gotop-static-article-publication';
 return JSON.stringify({mcpServers:{[name]:settings}},null,2);
}
export function mountAgentMcpHelper(root=document){
 const panel=root.querySelector('[data-agent-config]');
 if(!panel)return;
 const get=id=>panel.querySelector('#'+id);
 const mode=get('agent-mode'),editorial=get('editorial-fields');
 const publication=get('publication-fields');
 const output=get('agent-config-output'),status=get('agent-config-status');
 const copy=get('agent-config-copy'),generate=get('agent-config-generate');
 let latest='';
 function syncMode(){
  const signed=mode.value!=='reader';
  editorial.hidden=!signed;
  publication.hidden=mode.value!=='publication';
  latest='';output.textContent='';
  status.textContent='No configuration generated or sent.';copy.disabled=true;
 }
 function generateConfig(){
  try{
   latest=buildAgentMcpConfig({
    mode:mode.value,repoPath:get('repo-path').value,
    packagePath:get('package-path').value,
    publicKeyPath:get('public-key-path').value,
    summaryPath:get('summary-path').value,
    ownerId:get('owner-id').value,agentId:get('agent-id').value,
    publicationTime:get('publication-time').value
   });
   output.textContent=latest;
   status.textContent='Local configuration ready. Review paths and publication time before installing it in your MCP client.';
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
