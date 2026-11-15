/** PUBLIC Agent Arena local session contract. No hosted identities, scores or writes. */
export const MAX_ARENA_BYTES=65536;
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const keys=(x,allowed)=>Object.keys(x).every(k=>allowed.includes(k));
const str=(x,min,max)=>typeof x==='string'&&x.length>=min&&x.length<=max&&
 !/[\u0000-\u001f\u007f]/u.test(x);
const text=(x,max)=>typeof x==='string'&&x.trim().length>0&&x.length<=max&&
 !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(x);
const int=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
const invalid=()=>{throw new TypeError('Invalid local Arena session');};

export function validateArenaSession(value){
 if(!record(value)||!keys(value,['version','source','createdAt','prompt','agents','rounds'])||
    value.version!==1||value.source!=='local-byok'||
    !str(value.createdAt,20,30)||!Number.isFinite(Date.parse(value.createdAt))||
    !text(value.prompt,2000)||!Array.isArray(value.agents)||value.agents.length!==2||
    !Array.isArray(value.rounds)||!value.rounds.length||value.rounds.length>3)invalid();
 const agents=value.agents.map((a,index)=>{
  const id=index===0?'a':'b';
  if(!record(a)||!keys(a,['id','name','model'])||a.id!==id||
     !str(a.name,1,60)||!str(a.model,1,100))invalid();
  return Object.freeze({id,name:a.name,model:a.model});
 });
 const rounds=value.rounds.map((r,index)=>{
  if(!record(r)||!keys(r,['number','responses'])||r.number!==index+1||
     !Array.isArray(r.responses)||r.responses.length!==2)invalid();
  const responses=r.responses.map((v,j)=>{
   if(!record(v)||!keys(v,['agentId','text','durationMs'])||
      v.agentId!==agents[j].id||!text(v.text,4000)||
      !int(v.durationMs,0,120000))invalid();
   return Object.freeze({agentId:v.agentId,text:v.text,durationMs:v.durationMs});
  });
  return Object.freeze({number:r.number,responses:Object.freeze(responses)});
 });
 const clean=Object.freeze({
  version:1,source:'local-byok',createdAt:value.createdAt,prompt:value.prompt,
  agents:Object.freeze(agents),rounds:Object.freeze(rounds)
 });
 if(new TextEncoder().encode(JSON.stringify(clean)).byteLength>MAX_ARENA_BYTES)invalid();
 return clean;
}
export function parseArenaSession(raw){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX_ARENA_BYTES)
  invalid();
 try{return validateArenaSession(JSON.parse(raw));}catch{invalid();}
}
