// Progressive same-origin static discovery: no user-query fetch, storage, analytics or HTML injection.
// Every article stays crawlable/readable when JavaScript is disabled.
(()=>{
  const form=document.querySelector('[data-engineering-search]');
  const input=document.getElementById('engineering-filter');
  const status=document.getElementById('engineering-search-status');
  const empty=document.getElementById('engineering-no-results');
  const reset=document.getElementById('engineering-reset');
  const share=document.getElementById('engineering-share');
  const copyResults=document.getElementById('engineering-copy-results');
  const shareStatus=document.getElementById('engineering-share-status');
  const manualCopy=document.getElementById('engineering-manual-copy');
  const indexStatus=document.getElementById('engineering-index-status');
  const retryIndex=document.getElementById('engineering-index-retry');
  const cards=[...document.querySelectorAll('[data-note-card]')];
  const topics=[...document.querySelectorAll('[data-engineering-topic]')];
  if(!form||!input||!status||!empty||!reset||!share||!shareStatus||!manualCopy||!copyResults||
     !indexStatus||!retryIndex||
     cards.length===0||topics.length===0)return;

  const entries=cards.map(card=>({
    card,
    searchable:card.textContent.toLocaleLowerCase(),
    topic:card.dataset.noteTopic,
    file:card.dataset.noteFile
  }));
  // Never let data attributes choose a remote URL or a local filesystem path.
  if(entries.some(entry=>typeof entry.file!=='string'||
    !/^[a-z0-9-]+\.html$/.test(entry.file))||
    new Set(entries.map(entry=>entry.file)).size!==entries.length)return;
  const validTopics=new Set(topics.map(item=>item.dataset.engineeringTopic));
  if(!validTopics.has('all')||
    entries.some(entry=>!validTopics.has(entry.topic)))return;
  let selected='all';
  let fullText=null;
  let indexState='loading';
  let resultRevision=0;
  const hideManualCopy=()=>{
    manualCopy.value='';
    manualCopy.hidden=true;
  };
  // Only a real click may attempt a browser clipboard write. A denied or
  // missing clipboard API exposes the same PUBLIC data for manual selection.
  const copyOrSelect=async(text,success)=>{
    const revision=resultRevision;
    hideManualCopy();
    const offerManual=()=>{
      if(revision!==resultRevision)return;
      manualCopy.value=text;
      manualCopy.hidden=false;
      manualCopy.focus();
      manualCopy.select();
      shareStatus.textContent='Clipboard unavailable. Selected public links for manual copying.';
    };
    if(typeof navigator==='undefined'||!navigator.clipboard?.writeText){
      offerManual();return;
    }
    try{
      await navigator.clipboard.writeText(text);
      if(revision===resultRevision)shareStatus.textContent=success;
    }catch{offerManual();}
  };
  const setIndexState=state=>{
    indexState=state;
    indexStatus.textContent=state==='ready'
      ?'Full article text is searchable.'
      :state==='loading'
        ?'Searching titles and summaries while full-text search loads.'
        :'Full-text search unavailable. Only titles and summaries are being searched.';
    retryIndex.hidden=state!=='unavailable'||typeof fetch!=='function';
  };

  // Optional same-origin, read-only static index. No query or private draft
  // is transmitted; the request URL is always exactly ./search-index.json.
  // A failed/oversized index never hides the server-rendered article cards.
  const INDEX_MAX_BYTES=512000,INDEX_MAX_CHUNKS=512;
  const readIndex=async response=>{
    if(!response?.ok || !response.body?.getReader)
      throw new TypeError('Static search index unavailable');
    const length=response.headers?.get?.('content-length');
    if(length && /^\d+$/.test(length) && Number(length)>INDEX_MAX_BYTES)
      throw new RangeError('Static search index too large');
    const reader=response.body.getReader();
    const chunks=[];
    let size=0,count=0;
    try{
      for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        if(!ArrayBuffer.isView(value) || value.BYTES_PER_ELEMENT!==1 ||
           ++count>INDEX_MAX_CHUNKS || size+value.byteLength>INDEX_MAX_BYTES){
          await reader.cancel().catch(()=>{});
          throw new RangeError('Static search index stream exceeds budget');
        }
        size+=value.byteLength;
        chunks.push(value);
      }
    }finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);
    let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes));
  };
  const loadIndex=async()=>{
    if(typeof fetch!=='function'){
      setIndexState('unavailable');return;
    }
    if(indexState==='loading'&&retryIndex.disabled)return;
    retryIndex.disabled=true;
    setIndexState('loading');
    try{
      const response=await fetch('./search-index.json',
        {credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',
          cache:'default',signal:AbortSignal.timeout(8000)});
      const data=await readIndex(response);
      if(data?.version!==1||!Array.isArray(data.articles)||
         data.articles.length!==entries.length)
        throw Error('Unexpected static search index');
      const byFile=new Map();
      for(const article of data.articles){
        if(typeof article?.file!=='string'||
           !/^[a-z0-9-]+\.html$/.test(article.file)||
           typeof article.text!=='string'||article.text.length>24000||
           byFile.has(article.file))
          throw Error('Invalid static article index entry');
        byFile.set(article.file,article.text);
      }
      if(entries.some(entry=>!byFile.has(entry.file)))
        throw Error('Static index does not match visible article cards');
      fullText=byFile;
      setIndexState('ready');
      update();
    }catch{
      // Search falls back to card titles/summaries; never obscure articles.
      fullText=null;
      setIndexState('unavailable');
      update();
    }finally{
      retryIndex.disabled=false;
    }
  };

  // URL parameters are untrusted: use an explicit topic set, a bounded
  // plain-text search and native URL encoding. Never insert either as HTML.
  const readUrl=()=>{
    if(typeof window==='undefined'||!window.location?.href)return;
    try{
      const url=new URL(window.location.href);
      const topic=url.searchParams.get('topic');
      selected=validTopics.has(topic)?topic:'all';
      input.value=(url.searchParams.get('q')||'').trim().slice(0,80);
    }catch{selected='all';input.value='';}
  };
  const currentUrl=()=>{
    if(typeof window==='undefined'||!window.location?.href)return null;
    try{
      const url=new URL(window.location.href);
      // Remove unrelated/surprise query values from any shared URL.
      url.search='';
      const query=input.value.trim().slice(0,80);
      if(query)url.searchParams.set('q',query);
      if(selected!=='all')url.searchParams.set('topic',selected);
      return url;
    }catch{return null;}
  };
  const syncUrl=()=>{
    const url=currentUrl();
    if(url&&typeof window!=='undefined'&&window.history?.replaceState){
      // Only update this history entry; do not create a new entry per keypress.
      try{window.history.replaceState(null,'',url.pathname+url.search+url.hash);}
      catch{/* Filtering remains functional even if history is unavailable. */}
    }
  };
  // Explain a full-text match without rendering HTML or sending query terms.
  // The existing static index is normalized lowercase PUBLIC article text.
  const excerpts=new Map();
  const renderExcerpt=(entry,indexed,words,matched)=>{
    let el=excerpts.get(entry.file);
    const first=matched&&indexed&&words.length
      ?words.map(word=>indexed.indexOf(word)).find(at=>at>=0):-1;
    if(first===-1||first===undefined){
      if(el){el.hidden=true;el.textContent='';}
      return;
    }
    if(!el){
      el=document.createElement('p');
      el.className='note-search__excerpt';
      el.setAttribute('aria-label','Excerpt from matched published article text');
      entry.card.append(el);
      excerpts.set(entry.file,el);
    }
    const start=Math.max(0,first-65);
    const end=Math.min(indexed.length,first+115);
    const passage=indexed.slice(start,end).replace(/\\s+/g,' ').trim();
    el.textContent='In article: '+(start>0?'…':'')+passage+
      (end<indexed.length?'…':'');
    el.hidden=false;
  };
  const update=(writeUrl=false)=>{
    resultRevision++;
    hideManualCopy();
    const keyword=input.value.trim().toLocaleLowerCase().slice(0,80);
    // Match all bounded query words, in any order and across the visible
    // title/summary and optional reviewed full-text index. The previous
    // contiguous-phrase match missed articles when words were separated.
    const words=keyword.split(/\s+/).filter(Boolean);
    let count=0;
    for(const entry of entries){
      const indexed=fullText?.get(entry.file);
      const matches=(selected==='all'||entry.topic===selected) &&
        words.every(word=>entry.searchable.includes(word) ||
          Boolean(indexed?.includes(word)));
      entry.card.hidden=!matches;
      renderExcerpt(entry,indexed,words,matches);
      if(matches)count++;
    }
    for(const topic of topics){
      topic.setAttribute('aria-pressed',String(topic.dataset.engineeringTopic===selected));
    }
    status.textContent=count+' of '+entries.length+' articles';
    empty.hidden=count!==0;
    const active=selected!=='all'||Boolean(keyword);
    reset.hidden=!active;
    share.hidden=!active;
    copyResults.hidden=count===0;
    shareStatus.textContent='';
    if(writeUrl)syncUrl();
  };

  for(const topic of topics){
    topic.addEventListener('click',()=>{
      selected=topic.dataset.engineeringTopic;
      update(true);
    });
  }
  reset.addEventListener('click',()=>{
    input.value='';
    selected='all';
    update(true);
    input.focus();
  });
  retryIndex.addEventListener('click',()=>{
    if(indexState==='unavailable'&&!retryIndex.disabled)return loadIndex();
  });
  form.addEventListener('submit',event=>event.preventDefault());
  input.addEventListener('input',()=>update(true));
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&input.value){
      input.value='';
      update(true);
    }
  });
  share.addEventListener('click',()=>{
    const url=currentUrl();
    if(url)return copyOrSelect(url.href,'Filtered article link copied.');
  });
  copyResults.addEventListener('click',async()=>{
    // This is an explicit user gesture: copy plain Markdown links to the
    // *visible* public results, not unpublished author drafts or search text.
    const lines=entries.filter(entry=>!entry.card.hidden).map(entry=>{
      const label=entry.card.querySelector?.('h3 a')?.textContent?.trim()||
        entry.file.slice(0,-5).replaceAll('-',' ');
      const text=label.replace(/[\r\n\[\]\\]/g,' ').slice(0,180);
      return '- ['+text+'](https://24go.top/engineering/'+entry.file+')';
    });
    if(!lines.length){shareStatus.textContent='No results to copy.';return;}
    return copyOrSelect(lines.join('\n'),lines.length+
      ' public article link(s) copied as Markdown.');
  });
  if(typeof window!=='undefined'&&window.addEventListener){
    window.addEventListener('popstate',()=>{
      readUrl();
      update();
    });
  }
  readUrl();
  update();
  form.hidden=false;
  setIndexState('loading');
  void loadIndex();
})();
