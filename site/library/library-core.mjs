/** Source-reviewed first-party app catalogue. Never accept arbitrary deployment URLs. */
const ID=/^[a-z][a-z0-9-]{2,39}$/;
const NAME=/^[a-zA-Z0-9][a-zA-Z0-9 .+/-]{2,79}$/;
const VERSION=/^[0-9]+\.[0-9]+\.[0-9]+$/;
const PROPERTY=new Set(['id','name','description','category','version',
 'license','runtime','network','features','entry','source']);
const exact=(x,fields)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===fields.size&&Object.keys(x).every(k=>fields.has(k));
const label=(s,max)=>typeof s==='string'&&s.length>0&&s.length<=max&&
 !/[\u0000-\u001f\u007f<>]/u.test(s);
const invalid=()=>{throw new TypeError('Invalid reviewed Library catalog');};
export function validateLibraryCatalog(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).sort().join()!=='apps,version'||value.version!==1||
    !Array.isArray(value.apps)||value.apps.length<2||value.apps.length>20)invalid();
 const seen=new Set(),apps=value.apps.map(x=>{
  if(!exact(x,PROPERTY)||typeof x.id!=='string'||!ID.test(x.id)||
     !NAME.test(x.name)||!label(x.description,240)||!label(x.category,40)||
     !VERSION.test(x.version)||x.license!=='MIT'||
     x.runtime!=='Static HTML / CSS / JS'||x.network!=='None'||
     !Array.isArray(x.features)||x.features.length<2||x.features.length>8||
     x.features.some(s=>!label(s,65))||new Set(x.features).size!==x.features.length||
     x.entry!=='/library/apps/'+x.id+'/'||
     x.source!=='https://github.com/rf24kja/24GO.top/tree/main/site/library/apps/'+x.id||
     seen.has(x.id))invalid();
  seen.add(x.id);
  return Object.freeze({...x,features:Object.freeze([...x.features])});
 });
 return Object.freeze({version:1,apps:Object.freeze(apps)});
}
export function selectComparison(catalog,ids){
 const data=validateLibraryCatalog(catalog);
 if(!Array.isArray(ids)||ids.length!==2||ids[0]===ids[1])invalid();
 const apps=ids.map(id=>data.apps.find(a=>a.id===id));
 if(apps.some(a=>!a))invalid();
 return Object.freeze(apps);
}
export function filterLibrary(apps,query,category='all'){
 if(!Array.isArray(apps)||typeof query!=='string'||query.length>80||
    typeof category!=='string')invalid();
 const needle=query.trim().toLocaleLowerCase();
 return apps.filter(app=>(category==='all'||app.category===category)&&
  [app.name,app.description,app.category,...app.features].join(' ').toLocaleLowerCase().includes(needle));
}
