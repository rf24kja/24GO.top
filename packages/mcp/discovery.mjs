// Pure deterministic ranking of already-validated, PUBLIC editorial articles.
// No network, filesystem access, writes, credentials or agent instructions.
const MAX_QUERY=80;
const normalize=text=>text.normalize('NFC').toLocaleLowerCase();

export function rankPublishedArticles(articles,{query,limit=10,offset=0}={}){
 if(!Array.isArray(articles)||articles.length>200)throw new TypeError('Invalid public corpus');
 if(typeof query!=='string'||!query.trim()||query.length>MAX_QUERY||
    /[\u0000-\u001f\u007f\u2028\u2029]/u.test(query))
  throw new TypeError('Invalid public search query');
 if(!Number.isSafeInteger(limit)||limit<1||limit>20||
    !Number.isSafeInteger(offset)||offset<0||offset>200)
  throw new RangeError('Invalid public search page');
 const phrase=normalize(query.trim());
 const words=[...new Set(phrase.split(/\s+/u))];
 const matches=[];
 for(const [position,record] of articles.entries()){
  if(!record||typeof record.title!=='string'||
    typeof record.summary!=='string'||typeof record.text!=='string'||
    typeof record.url!=='string')throw new TypeError('Invalid public corpus record');
  const title=normalize(record.title),summary=normalize(record.summary);
  const text=normalize(record.text);
  if(!words.every(word=>title.includes(word)||summary.includes(word)||text.includes(word)))continue;
  // Strong phrase bonus preserves single-phrase search relevance.
  const score=words.reduce((sum,word)=>sum+
    (title.includes(word)?7:0)+(summary.includes(word)?3:0)+
    (text.includes(word)?1:0),0)
    +(title.includes(phrase)?30:0)+(summary.includes(phrase)?18:0)+
    (text.includes(phrase)?15:0);
  const matchedIn=words.every(w=>title.includes(w))?'title':
    words.every(w=>summary.includes(w))?'summary':'article';
  matches.push({position,score,matchedIn,record});
 }
 matches.sort((a,b)=>b.score-a.score||a.position-b.position);
 const slice=matches.slice(offset,offset+limit);
 return {
  total:matches.length,offset,
  nextOffset:offset+slice.length<matches.length?offset+slice.length:null,
  articles:slice.map(({matchedIn,record})=>({
    title:record.title,url:record.url,language:record.language,
    summary:record.summary,date:record.date,matchedIn
  }))
 };
}

export function slicePublishedText(text,{offset=0,maxChars=1800}={}){
 if(typeof text!=='string'||text.length>28000)throw new TypeError('Invalid reviewed article text');
 if(!Number.isSafeInteger(offset)||offset<0||offset>28000||
    !Number.isSafeInteger(maxChars)||maxChars<200||maxChars>4000)
  throw new RangeError('Invalid article excerpt range');
 // Offset and maxChars are Unicode code points (do not split surrogate pairs).
 const chars=Array.from(text);
 if(offset>=chars.length)throw new RangeError('Excerpt offset exceeds article length');
 const excerpt=chars.slice(offset,offset+maxChars).join('');
 const end=offset+Array.from(excerpt).length;
 return {
  excerpt,offset,end,totalCharacters:chars.length,
  nextOffset:end<chars.length?end:null,
  textKind:'lossy-extracted-public-html'
 };
}
