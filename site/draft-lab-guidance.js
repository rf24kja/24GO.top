// Guided *local* writing only. Not publication eligibility or moderation.
// Template text never becomes an executable instruction or a server request.
import {safeSourceUrl,countDraftWords,LOCALES} from './draft-lab-logic.js';
import {parsePreviewBlocks,safeCitationUrl} from './draft-lab-preview.js';

const TEMPLATE_PARTS=Object.freeze({
 en:{
  guide:[['Problem','What is the reproducible problem?'],['Approach','Explain the implementation and decisions.'],['Verification','Show steps, commands or evidence others can repeat.'],['Limitations','Disclose what remains untested or incomplete.']],
  caseStudy:[['Context','State the original constraints.'],['Method','Describe the experiment and its inputs.'],['Results','Describe observed outcomes, not estimates.'],['Limitations','Explain risks, limitations and next steps.']]
 },
 ru:{
  guide:[['Проблема','Опишите воспроизводимую проблему.'],['Решение','Объясните реализацию и принятые решения.'],['Проверка','Добавьте шаги или проверяемые доказательства.'],['Ограничения','Укажите непроверенные моменты.']],
  caseStudy:[['Контекст','Укажите исходные ограничения.'],['Метод','Опишите эксперимент и исходные данные.'],['Результаты','Приведите реальные наблюдения.'],['Ограничения','Укажите риски и следующие шаги.']]
 },
 th:{
  guide:[['ปัญหา','อธิบายปัญหาที่ทำซ้ำได้'],['แนวทางแก้ไข','อธิบายวิธีทำและเหตุผล'],['การตรวจสอบ','เพิ่มขั้นตอนหรือหลักฐานที่ตรวจสอบได้'],['ข้อจำกัด','ระบุสิ่งที่ยังไม่ได้ทดสอบ']],
  caseStudy:[['บริบท','อธิบายข้อจำกัดเริ่มต้น'],['วิธีการ','อธิบายการทดลองและข้อมูลตั้งต้น'],['ผลลัพธ์','ระบุสิ่งที่สังเกตได้จริง'],['ข้อจำกัด','ระบุความเสี่ยงและขั้นตอนต่อไป']]
 },
 es:{
  guide:[['Problema','Explica un problema reproducible.'],['Solución','Describe la implementación y las decisiones.'],['Verificación','Incluye pasos o pruebas reproducibles.'],['Limitaciones','Indica lo que aún no se ha comprobado.']],
  caseStudy:[['Contexto','Explica las restricciones iniciales.'],['Método','Describe el experimento y sus datos.'],['Resultados','Expón las observaciones reales.'],['Limitaciones','Indica riesgos y próximos pasos.']]
 },
 fr:{
  guide:[['Problème','Décrivez un problème reproductible.'],['Solution','Expliquez la mise en œuvre et les choix.'],['Vérification','Ajoutez des étapes ou des preuves vérifiables.'],['Limites','Indiquez ce qui reste à vérifier.']],
  caseStudy:[['Contexte','Décrivez les contraintes initiales.'],['Méthode','Décrivez l’expérience et les données.'],['Résultats','Indiquez les observations réelles.'],['Limites','Précisez les risques et les prochaines étapes.']]
 },
 de:{
  guide:[['Problem','Beschreibe ein reproduzierbares Problem.'],['Lösung','Erkläre Umsetzung und Entscheidungen.'],['Prüfung','Ergänze nachvollziehbare Schritte oder Belege.'],['Grenzen','Nenne noch nicht überprüfte Punkte.']],
  caseStudy:[['Kontext','Beschreibe die Ausgangsbedingungen.'],['Methode','Erläutere Versuch und Eingabedaten.'],['Ergebnisse','Nenne tatsächlich beobachtete Ergebnisse.'],['Grenzen','Beschreibe Risiken und weitere Schritte.']]
 },
 pt:{
  guide:[['Problema','Descreva um problema reproduzível.'],['Solução','Explique a implementação e as decisões.'],['Verificação','Adicione passos ou evidências verificáveis.'],['Limitações','Indique o que ainda não foi testado.']],
  caseStudy:[['Contexto','Descreva as restrições iniciais.'],['Método','Explique o experimento e os dados usados.'],['Resultados','Relate apenas observações reais.'],['Limitações','Indique riscos e próximos passos.']]
 },
 zh:{
  guide:[['问题','描述可以复现的问题。'],['解决方法','解释实现步骤和设计决策。'],['验证','提供可重复的操作步骤或证据。'],['局限性','说明尚未验证的部分。']],
  caseStudy:[['背景','描述初始条件和限制。'],['方法','介绍实验过程和输入数据。'],['结果','记录实际观察到的结果。'],['局限性','说明风险和后续步骤。']]
 }
});

export const GUIDANCE_KEYS=Object.freeze(['title','body','headings','steps','source','complete']);

export function templateSnippet(kind,locale='en'){
 if(typeof kind!=='string'||!['guide','caseStudy'].includes(kind))
  throw new TypeError('Unsupported template');
 if(!LOCALES.includes(locale))throw new TypeError('Unsupported article language');
 return TEMPLATE_PARTS[locale][kind].map(([heading,hint])=>
  '## '+heading+'\n\n> TODO: '+hint).join('\n\n');
}

export function appendDraftTemplate(text,kind,locale='en'){
 if(typeof text!=='string'||text.length>12000)throw new TypeError('Invalid draft body');
 const snippet=templateSnippet(kind,locale);
 const next=text + (!text?'':text.endsWith('\n')?'\n':'\n\n') + snippet;
 if(next.length>12000)throw new RangeError('Draft would exceed the article limit');
 return next;
}

/**
 * Editorial hints, NOT content safety validation or a hosted publish gate.
 * The restricted preview parser avoids counting code fences as headings.
 */
export function analyzeDraftGuidance(draft){
 const title=typeof draft?.title==='string'?draft.title:'';
 const body=typeof draft?.body==='string'?draft.body:'';
 const locale=LOCALES.includes(draft?.locale)?draft.locale:'en';
 if(body.length>12000)throw new RangeError('Draft would exceed the article limit');
 const blocks=parsePreviewBlocks(body);
 const nonCode=blocks.filter(block=>block.type!=='code');
 const inlineText=nonCode.flatMap(block=>
  block.type==='list'?block.items:block.type==='table'?
    [...block.headers,...block.rows.flat()]:[block.text||'']).join('\n');
 const citations=[...inlineText.matchAll(/\[[^\[\]\n]{1,200}\]\((https?:\/\/[^<>\s()\\]{1,1500})\)/g)];
 const source=safeSourceUrl(typeof draft?.source==='string'?draft.source:'');
 const hasCitation=Boolean(source) ||
  citations.some(match=>Boolean(safeCitationUrl(match[1])));
 const checks={
  title:title.trim().length>=5&&title.length<=160&&!/[\u0000-\u001f\u007f\u2028\u2029]/.test(title),
  body:body.trim().length>=20,
  headings:blocks.some(block=>block.type==='heading'),
  steps:blocks.some(block=>block.type==='list'||block.type==='code'),
  source:hasCitation,
  complete:Boolean(body.trim())&&!/(?:^|\n)\s*>\s*TODO\s*:/i.test(body)
 };
 const words=countDraftWords(body,locale);
 return {
  checks,
  completed:GUIDANCE_KEYS.filter(key=>checks[key]).length,
  total:GUIDANCE_KEYS.length,
  words,
  readingMinutes:words===0?0:Math.max(1,Math.ceil(words/220))
 };
}
