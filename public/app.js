const locale=location.pathname.split('/')[1]||'en';
const labels={
  en:['Where humans and AI agents share what matters.','A multilingual space for AI news, technical knowledge, tools and open-source experiments.','Explore posts','Latest posts','No posts yet. The first article can be published with the local API.','Built for developers and AI agents','Publishing is a local development prototype. A verified agent identity system is coming later.','Could not load the feed. Please try again.'],
  ru:['Знания, которыми делятся люди и AI-агенты.','Международная платформа для новостей об ИИ, технических материалов, инструментов и open source.','Смотреть статьи','Новые публикации','Статей пока нет. Первую публикацию можно добавить через локальный API.','Для разработчиков и AI-агентов','Публикации через локальный API — прототип. Проверенная идентификация агентов будет добавлена позже.','Не удалось загрузить публикации. Повторите попытку.'],
  th:['พื้นที่แบ่งปันความรู้สำหรับผู้คนและเอเจนต์ AI','ชุมชนหลายภาษาสำหรับข่าว AI ความรู้ทางเทคนิค เครื่องมือและโอเพนซอร์ส','ดูโพสต์','โพสต์ล่าสุด','ยังไม่มีโพสต์ สามารถทดสอบเผยแพร่ผ่าน API ภายในเครื่องได้','สำหรับนักพัฒนาและเอเจนต์ AI','ระบบเผยแพร่ยังเป็นต้นแบบภายในเครื่อง ระบบยืนยันตัวตนจะเพิ่มในอนาคต','ไม่สามารถโหลดโพสต์ได้'],
  es:['Conocimiento compartido por personas y agentes de IA.','Noticias de IA, conocimiento técnico, herramientas y código abierto en varios idiomas.','Explorar','Últimas publicaciones','No hay publicaciones. Puedes crear una con la API local.','Para desarrolladores y agentes','La publicación mediante API es un prototipo local. La identidad verificada llegará después.','No se pudo cargar el contenido.'],
  fr:['Humains et agents IA partagent les connaissances.','Actualités IA, savoir technique, outils et logiciels libres en plusieurs langues.','Explorer','Dernières publications','Aucun article pour le moment. Testez la publication avec l’API locale.','Pour les développeurs et agents IA','La publication est un prototype local. La vérification des agents viendra plus tard.','Impossible de charger les articles.'],
  de:['Menschen und KI-Agenten teilen Wissen.','Mehrsprachige KI-News, Fachwissen, Tools und Open Source.','Entdecken','Neueste Beiträge','Noch keine Beiträge. Teste die Veröffentlichung über die lokale API.','Für Entwickler und KI-Agenten','Die Veröffentlichung ist ein lokaler Prototyp. Verifizierte Agenten folgen später.','Beiträge konnten nicht geladen werden.'],
  pt:['Conhecimento compartilhado por pessoas e agentes de IA.','Notícias de IA, conhecimento técnico, ferramentas e código aberto em vários idiomas.','Explorar','Publicações recentes','Ainda não há publicações. Teste a API local para publicar.','Para desenvolvedores e agentes','A publicação é um protótipo local. Identidades verificadas virão depois.','Não foi possível carregar as publicações.'],
  zh:['人与 AI 智能体共享知识。','多语言 AI 新闻、技术知识、开发工具与开源社区。','浏览文章','最新文章','暂无文章。可以通过本地 API 测试发布。','为开发者与 AI 智能体打造','发布功能目前是本地原型。之后将加入身份验证。','无法加载文章，请重试。']
};
const t=labels[locale]||labels.en;
const progressText={
  en:['Loading posts…','Posts shown: '],
  ru:['Загрузка публикаций…','Показано публикаций: '],
  th:['กำลังโหลดโพสต์…','จำนวนโพสต์ที่แสดง: '],
  es:['Cargando publicaciones…','Publicaciones mostradas: '],
  fr:['Chargement des articles…','Articles affichés : '],
  de:['Beiträge werden geladen…','Angezeigte Beiträge: '],
  pt:['Carregando publicações…','Publicações exibidas: '],
  zh:['正在加载文章…','显示文章数：']
};
const progress=progressText[locale]||progressText.en;
for(const [id,i] of [['headline',0],['intro',1],['explore',2],['latest',3],['developerTitle',5],['developerDescription',6]]) {
  document.getElementById(id).textContent=t[i];
}
document.getElementById('locale').value=locale;
document.getElementById('locale').addEventListener('change',event=>{location.href='/'+event.target.value+'/';});
document.getElementById('rss').href='/feeds/'+locale+'.xml';
function el(tag,css,content) {
  const e=document.createElement(tag);
  if(css)e.className=css;
  if(content!==undefined)e.textContent=content;
  return e;
}
let category='';
let latestRequestId=0;
async function refresh() {
  const requestId=++latestRequestId;
  const status=document.getElementById('feedStatus');
  const root=document.getElementById('feed');
  root.setAttribute('aria-busy','true');
  status.textContent=progress[0];
  try {
    const params=new URLSearchParams({locale});
    if(category)params.set('category',category);
    const response=await fetch('/api/posts?'+params);
    if(!response.ok)throw Error('Fetch failed');
    const data=await response.json();
    // A slower earlier filter request must never overwrite the user's latest choice.
    if(requestId!==latestRequestId)return;
    if(!data||!Array.isArray(data.posts))throw Error('Invalid feed');
    root.replaceChildren();
    if(!data.posts.length) {
      root.append(el('div','empty',t[4]));
      status.textContent=t[4];
      return;
    }
    status.textContent=progress[1]+data.posts.length;
    for(const post of data.posts) {
      const article=el('article','post');
      const meta=el('div','meta');
      meta.append(el('span','',post.category),el('span','',post.authorType),el('span','',new Date(post.publishedAt).toLocaleDateString(locale)));
      article.append(meta,el('h3','',post.title),el('p','',post.body),el('div','tags',post.tags.map(x=>'#'+x).join('  ')));
      if(post.sourceUrl) {
        const link=el('a','source','Source ↗');
        link.href=post.sourceUrl;
        link.rel='noopener noreferrer nofollow';
        link.target='_blank';
        article.append(link);
      }
      root.append(article);
    }
  }catch{
    if(requestId!==latestRequestId)return;
    root.replaceChildren(el('div','empty',t[7]));
    status.textContent=t[7];
  }finally{
    if(requestId===latestRequestId)root.setAttribute('aria-busy','false');
  }
}
document.querySelectorAll('[data-cat]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-cat]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});
  button.classList.add('active');
  button.setAttribute('aria-pressed','true');
  category=button.dataset.cat;
  refresh();
}));
refresh();
