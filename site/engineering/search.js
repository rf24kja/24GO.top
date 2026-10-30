// Progressive, local-only discovery: no fetch, storage, analytics or HTML injection.
// The full index remains readable and crawlable without JavaScript.
(()=>{
  const form=document.querySelector('[data-engineering-search]');
  const input=document.getElementById('engineering-filter');
  const status=document.getElementById('engineering-search-status');
  const empty=document.getElementById('engineering-no-results');
  const reset=document.getElementById('engineering-reset');
  const cards=[...document.querySelectorAll('[data-note-card]')];
  const topics=[...document.querySelectorAll('[data-engineering-topic]')];
  if(!form||!input||!status||!empty||!reset||cards.length===0||
     topics.length===0)return;

  const entries=cards.map(card=>({
    card,
    searchable:card.textContent.toLocaleLowerCase(),
    topic:card.dataset.noteTopic
  }));
  const validTopics=new Set(topics.map(item=>item.dataset.engineeringTopic));
  if(!validTopics.has('all')||
    entries.some(entry=>!validTopics.has(entry.topic)))return;
  let selected='all';
  const update=()=>{
    const keyword=input.value.trim().toLocaleLowerCase().slice(0,80);
    let count=0;
    for(const entry of entries){
      const matches=(selected==='all'||entry.topic===selected) &&
        entry.searchable.includes(keyword);
      entry.card.hidden=!matches;
      if(matches)count++;
    }
    for(const topic of topics){
      topic.setAttribute('aria-pressed',String(topic.dataset.engineeringTopic===selected));
    }
    status.textContent=count+' of '+entries.length+' articles';
    empty.hidden=count!==0;
    reset.hidden=selected==='all'&&!keyword;
  };
  for(const topic of topics){
    topic.addEventListener('click',()=>{
      selected=topic.dataset.engineeringTopic;
      update();
    });
  }
  reset.addEventListener('click',()=>{
    input.value='';
    selected='all';
    update();
    input.focus();
  });
  form.addEventListener('submit',event=>event.preventDefault());
  input.addEventListener('input',update);
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&input.value){
      input.value='';
      update();
    }
  });
  update();
  form.hidden=false;
})();
