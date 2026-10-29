// Decorative enhancement only. No network, cookies, storage or DOM-injected HTML.
// All content and links work without JavaScript.
(()=>{
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine=window.matchMedia('(hover: hover) and (pointer: fine)');
  if(reduce.matches)return;
  const root=document.documentElement;
  if(fine.matches){
    let frame=0,x=window.innerWidth/2,y=window.innerHeight*.27;
    const paint=()=>{
      frame=0;
      root.style.setProperty('--glow-x',x+'px');
      root.style.setProperty('--glow-y',y+'px');
    };
    window.addEventListener('pointermove',event=>{
      x=event.clientX;y=event.clientY;
      if(!frame)frame=window.requestAnimationFrame(paint);
    },{passive:true});
    window.addEventListener('blur',()=>{
      x=window.innerWidth/2;y=window.innerHeight*.27;
      if(!frame)frame=window.requestAnimationFrame(paint);
    });
  }
  if(fine.matches && 'IntersectionObserver' in window){
    const sections=[...document.querySelectorAll('[data-reveal]')];
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      }
    },{threshold:.08,rootMargin:'0px 0px -30px 0px'});
    for(const section of sections)observer.observe(section);
    root.classList.add('motion-ready');
  }
})();
