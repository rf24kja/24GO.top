// Progressive same-origin static discovery: no user-query fetch, storage, analytics or HTML injection.
// Every article stays crawlable/readable when JavaScript is disabled.
(()=>{
  const form=document.querySelector('[data-engineering-search]');
  const input=document.getElementById('engineering-filter');
  const status=document.getElementById('engineering-search-status');
  const empty=document.getElementById('engineering-no-results');
  const reset=document.getElementById('engineering-reset');
  const share=document.getElementById('engineering-share');
  const shareStatus=document.getElementById('engineering-share-status');
  const cards=[...document.querySelectorAll('[data-note-card]')];
  const topics=[...document.querySelectorAll('[data-engineering-topic]')];
  if(!form||!input||!status||!empty||!reset||!share||!shareStatus||
     cards.length===0||topics.length===0)return;

  const entries=cards.map(card=>({
    card,
    searchable:card.textContent.toLocaleLowerCase(),
    topic:card.dataset.noteTopic,
    file:card.dataset.noteFile
  }));
  const validTopics=new Set(topics.map(item=>item.dataset.engineeringTopic));
  if(!validTopics.has('all')||
    entries.some(entry=>!validTopics.has(entry.topic)))return;
  let selected='all';
  let fullText=null;

  // Optional same-origin, read-only static index. No query or private draft
  // is transmitted; the request URL is always exactly ./search-index.json.
  // On invalid/unavailable index, ordinary title/summary search still works.
  const loadIndex=async()=>{
    if(typeof fetch!=='function')return;
    try{
      const response=await fetch('./search-index.json',
        {credentials:'omit',cache:'default'});
      if(!response.ok)throw Error('Static search index unavailable');
      const data=await response.json();
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
      update();
    }catch{
      // Search falls back to card titles/summaries; never obscure articles.
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
  const update=(writeUrl=false)=>{
    const keyword=input.value.trim().toLocaleLowerCase().slice(0,80);
    let count=0;
    for(const entry of entries){
      const matches=(selected==='all'||entry.topic===selected) &&
        (entry.searchable.includes(keyword) ||
          Boolean(fullText?.get(entry.file)?.includes(keyword)));
      entry.card.hidden=!matches;
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
  form.addEventListener('submit',event=>event.preventDefault());
  input.addEventListener('input',()=>update(true));
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&input.value){
      input.value='';
      update(true);
    }
  });
  share.addEventListener('click',async()=>{
    const url=currentUrl();
    if(!url)return;
    if(typeof navigator==='undefined'||!navigator.clipboard?.writeText){
      shareStatus.textContent='Copy the page URL from your browser address bar.';
      return;
    }
    try{
      await navigator.clipboard.writeText(url.href);
      shareStatus.textContent='Filtered article link copied.';
    }catch{
      shareStatus.textContent='Clipboard unavailable. Copy the page URL from your address bar.';
    }
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
  void loadIndex();
})();
