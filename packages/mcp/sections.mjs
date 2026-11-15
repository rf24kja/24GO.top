// Pure section reader for the local, reviewed public engineering HTML corpus.
// This is intentionally a bounded, lossy plaintext projection, NOT an HTML
// renderer or sanitizer for remote/untrusted inputs. Never execute source HTML.
const ARTICLE=/<article class="article">([\s\S]*?)<\/article>/;
const HEADINGS=/<h([23])\b([^>]{0,500})>([\s\S]*?)<\/h\1>/gi;
const SECTION_ID=/\bid="(section-[a-z0-9-]{1,120})"/;
const MAX_HTML=128000,MAX_SECTIONS=40,MAX_SECTION_CHARS=4000;
const ENTITY=/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/g;
function decodeEntities(text){
 return text.replace(ENTITY,(_,entity)=>{
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
  if(Object.hasOwn(named,entity))return named[entity];
  const n=entity.startsWith('#x')?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);
  return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?
   String.fromCodePoint(n):' ';
 });
}
function plain(html){
 // Keep block breaks legible without pretending to preserve code or tables.
 return decodeEntities(html.replace(/<!--[\s\S]*?-->/g,' ')
  .replace(/<\/(?:p|div|li|ul|ol|pre|blockquote|table|tr)>/gi,'\n')
  .replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,' ')
  .replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n')
  .replace(/\n{3,}/g,'\n\n').trim());
}
/** Extract only explicitly linked public article sections from reviewed HTML.
 * Any unlinked "Continue reading" heading ends the previous section.
 * Results are in document order; no source paths or fetched URLs are accepted.
 */
export function indexPublishedArticleSections(html){
 if(typeof html!=='string'||html.length===0||html.length>MAX_HTML)
  throw new TypeError('Invalid reviewed article HTML');
 const article=html.match(ARTICLE);
 if(!article)throw new TypeError('Missing reviewed article body');
 const body=article[1],headings=[...body.matchAll(HEADINGS)];
 if(headings.length>MAX_SECTIONS+10)
  throw new TypeError('Too many headings');
 const seen=new Set(),result=[];
 for(let i=0;i<headings.length;i++){
  const match=headings[i],id=match[2].match(SECTION_ID)?.[1];
  if(!id)continue;
  if(seen.has(id)||result.length>=MAX_SECTIONS)throw new TypeError('Duplicate or excessive sections');
  seen.add(id);
  const title=plain(match[3]);
  if(!title||title.length>200||/[\u0000-\u001f\u007f]/u.test(title))
   throw new TypeError('Invalid public section title');
  const end=i+1<headings.length?headings[i+1].index:body.length;
  const text=plain(body.slice(match.index+match[0].length,end));
  if(text.length>28000)throw new TypeError('Oversized public section');
  result.push(Object.freeze({
   id,title,level:Number(match[1]),position:result.length+1,text
  }));
 }
 return Object.freeze(result);
}
export function slicePublishedSection(section,{offset=0,maxChars=1800}={}){
 if(!section||typeof section.text!=='string'||section.text.length>28000||
    !Number.isSafeInteger(offset)||offset<0||offset>28000||
    !Number.isSafeInteger(maxChars)||maxChars<200||maxChars>MAX_SECTION_CHARS)
  throw new RangeError('Invalid section excerpt arguments');
 const chars=Array.from(section.text),totalCharacters=chars.length;
 if(offset>totalCharacters)throw new RangeError('Offset exceeds section');
 const text=chars.slice(offset,offset+maxChars).join('');
 const end=offset+Array.from(text).length;
 return Object.freeze({text,offset,end,totalCharacters,
  nextOffset:end<totalCharacters?end:null,
  truncated:end<totalCharacters,
  textKind:'lossy-extracted-public-html-section'});
}
