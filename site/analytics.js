/* Optional public-page analytics. Draft Lab and private reading-path state are excluded. */
(() => {
  'use strict';
  const ID = 114039802;
  const KEY = '24gotop_analytics_consent_v1';
  const SOURCE = 'https://mc.yandex.ru/metrika/tag.js?id=114039802';
  if (window.__24gotopMetrica || /(?:draft-lab|\/engineering\/reading-paths\/|^\/(?:api|admin)(?:\/|$))/.test(location.pathname)) return;
  window.__24gotopMetrica = true;
  const language = document.documentElement.lang.split('-')[0];
  const words = {
    en: ['Optional analytics', 'With your consent, Yandex.Metrica uses cookies and Webvisor to analyse public-page visits and interactions. Entered form values are excluded. Data is sent to Yandex. Declining does not limit access.', 'Accept', 'Decline', 'Privacy policy', 'Analytics preferences'],
    ru: ['Необязательная аналитика', 'С вашего согласия Яндекс Метрика использует cookie и Вебвизор для анализа посещений и действий на публичных страницах. Значения полей не записываются. Данные передаются Яндексу. Отказ не ограничивает доступ.', 'Принять', 'Отклонить', 'Политика конфиденциальности', 'Настройки аналитики'],
    de: ['Optionale Analyse', 'Mit Ihrer Zustimmung verwendet Yandex.Metrica Cookies und Webvisor zur Analyse öffentlicher Seiten und Interaktionen. Formulareingaben werden nicht aufgezeichnet. Daten werden an Yandex gesendet. Eine Ablehnung beschränkt den Zugang nicht.', 'Akzeptieren', 'Ablehnen', 'Datenschutz', 'Analyseeinstellungen'],
    es: ['Analítica opcional', 'Con tu consentimiento, Yandex.Metrica usa cookies y Webvisor para analizar visitas e interacciones en páginas públicas. No se registran los valores de formularios. Los datos se envían a Yandex. Rechazar no limita el acceso.', 'Aceptar', 'Rechazar', 'Privacidad', 'Preferencias de analítica'],
    fr: ['Analyse facultative', 'Avec votre consentement, Yandex.Metrica utilise des cookies et Webvisor pour analyser les visites et interactions des pages publiques. Les valeurs des formulaires sont exclues. Les données sont envoyées à Yandex. Le refus ne limite pas l’accès.', 'Accepter', 'Refuser', 'Confidentialité', 'Préférences analytiques'],
    pt: ['Análise opcional', 'Com seu consentimento, Yandex.Metrica usa cookies e Webvisor para analisar visitas e interações em páginas públicas. Os valores dos formulários não são gravados. Os dados são enviados ao Yandex. Recusar não limita o acesso.', 'Aceitar', 'Recusar', 'Privacidade', 'Preferências de análise'],
    zh: ['可选分析', '经您同意，Yandex.Metrica 使用 Cookie 和 Webvisor 分析公开页面的访问和交互。表单输入值不被记录，数据将发送给 Yandex。拒绝不会限制访问。', '同意', '拒绝', '隐私政策', '分析偏好设置'],
    th: ['การวิเคราะห์ที่เลือกได้', 'เมื่อคุณยินยอม Yandex.Metrica จะใช้คุกกี้และ Webvisor เพื่อวิเคราะห์การเข้าชมและการโต้ตอบบนหน้าสาธารณะ โดยไม่บันทึกค่าที่กรอกในแบบฟอร์ม ข้อมูลจะถูกส่งไปยัง Yandex การปฏิเสธไม่จำกัดการเข้าถึง', 'ยอมรับ', 'ปฏิเสธ', 'นโยบายความเป็นส่วนตัว', 'ตั้งค่าการวิเคราะห์'],
  }[language] || null;
  const copy = words || ['Optional analytics', 'Yandex.Metrica cookies and Webvisor are used only with your consent on public pages. Form values are excluded. Data is sent to Yandex.', 'Accept', 'Decline', 'Privacy policy', 'Analytics preferences'];
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const remember = value => { try { localStorage.setItem(KEY, value); } catch { /* Session-only choice if storage is unavailable. */ } };
  let active = false;
  let panel;
  let returnFocus;
  const cleanUrl = value => { if (!value) return ''; const url = new URL(value, location.origin); return url.origin + url.pathname; };
  const mask = () => document.querySelectorAll('input,textarea,[contenteditable]').forEach(field => field.classList.add('ym-disable-keys'));
  const stop = () => { if (active) window.ym(ID, 'destruct'); active = false; };
  const start = () => {
    if (active) return;
    mask();
    window.dataLayer = window.dataLayer || [];
    if (!window.ym) {
      const ym = function () { (ym.a = ym.a || []).push(arguments); };
      ym.l = Date.now();
      window.ym = ym;
    }
    if (![...document.scripts].some(script => script.src === SOURCE)) {
      const script = document.createElement('script'); script.async = true; script.src = SOURCE; document.head.appendChild(script);
    }
    window.ym(ID, 'init', { ssr: true, webvisor: true, clickmap: true, ecommerce: 'dataLayer', referrer: cleanUrl(document.referrer), url: cleanUrl(location.href), accurateTrackBounce: true, trackLinks: true });
    active = true;
  };
  const button = (label, action) => { const el = document.createElement('button'); el.type = 'button'; el.textContent = label; el.addEventListener('click', action); return el; };
  const show = () => {
    if (panel) return;
    panel = document.createElement('section'); panel.dataset.metrikaConsent = ''; panel.className = 'analytics-notice'; panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', copy[0]);
    const heading = document.createElement('strong'); heading.textContent = copy[0];
    const text = document.createElement('p'); text.textContent = copy[1];
    const actions = document.createElement('div'); actions.className = 'analytics-actions';
    const choose = value => { remember(value); if (value === 'accepted') start(); else stop(); panel.remove(); panel = null; returnFocus?.focus(); };
    const privacy = document.createElement('a'); privacy.href = '/privacy.html'; privacy.textContent = copy[4];
    actions.append(button(copy[3], () => choose('declined')), button(copy[2], () => choose('accepted')), privacy);
    panel.append(heading, text, actions); document.body.appendChild(panel);
  };
  const preferences = button(copy[5], () => { returnFocus = preferences; remember('declined'); stop(); show(); });
  preferences.className = 'analytics-preferences'; preferences.dataset.analyticsPreferences = '';
  (document.querySelector('footer') || document.body).appendChild(preferences);
  if (location.pathname === '/privacy.html' && location.hash === '#preferences') remember('declined');
  if (read() === 'accepted') start(); else if (read() !== 'declined') show();
  window.addEventListener('storage', event => { if (event.key === KEY) { if (read() === 'accepted') { panel?.remove(); panel = null; start(); } else { stop(); if (read() === null) show(); } } });
  const observer = new MutationObserver(mask); observer.observe(document.body, { childList: true, subtree: true });
})();
