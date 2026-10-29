// Progressive, local-only discovery enhancement: no network, storage or HTML injection.
(()=>{
  const form=document.querySelector('[data-engineering-search]');
  const input=document.getElementById('engineering-filter');
  const status=document.getElementById('engineering-search-status');
  const empty=document.getElementById('engineering-no-results');
  const cards=[...document.querySelectorAll('[data-note-card]')];
  if(!form || !input || !status || !empty || cards.length===0)return;

  // Index only visible, published editorial card text. No private articles.
  const entries=cards.map(card=>({
    card, searchable:card.textContent.toLocaleLowerCase()
  }));
  const update=()=>{
    const keyword=input.value.trim().toLocaleLowerCase().slice(0,80);
    let count=0;
    for(const entry of entries){
      const matches=entry.searchable.includes(keyword);
      entry.card.hidden=!matches;
      if(matches)count++;
    }
    status.textContent=count+' of '+entries.length+' articles';
    empty.hidden=count!==0;
  };
  form.addEventListener('submit',event=>event.preventDefault());
  input.addEventListener('input',update);
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape' && input.value){
      input.value='';
      update();
    }
  });
  update();
  form.hidden=false;
})();
