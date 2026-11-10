// Offline, read-only HTML review preview for a valid exported Draft Lab .md.
// Never publish this file: no canonical, byline, release date, or trusted author.
// No network request, browser write keys, or private hosted Core integration.
import {stat,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {parseDraftFile,formatDraft,MAX_DRAFT_FILE_BYTES,safeSourceUrl} from '../site/draft-lab-logic.js';
import {parsePreviewBlocks,safeCitationUrl} from '../site/draft-lab-preview.js';

const INLINE=/\[(?<label>[^\[\]\n]{1,200})\]\((?<url>https?:\/\/[^<>\s()\\]{1,1500})\)|(?<code>\x60(?<codeText>[^\x60\n]{1,1000})\x60)|(?<bold>\*\*(?<boldText>[^*\n]{1,1000})\*\*)|(?<italic>\*(?<italicText>[^*\n]{1,1000})\*)/g;
const HTML_ESCAPES=Object.freeze({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'});
export function escapeReviewHtml(value){
 if(typeof value!=='string')throw new TypeError('Expected review text');
 return value.replace(/[&<>"']/g,char=>HTML_ESCAPES[char]);
}
function inlineReviewHtml(text){
 let out='',offset=0;
 for(const m of text.matchAll(INLINE)){
  if(m.index<offset||(m.index>0&&text[m.index-1]==='\\'))continue;
  const part=m.groups;
  const href=part.url?safeCitationUrl(part.url):null;
  if(part.url&&!href)continue;
  out+=escapeReviewHtml(text.slice(offset,m.index));
  if(href){
   out+='<a href="'+escapeReviewHtml(href)+'" rel="noopener noreferrer ugc" target="_blank" referrerpolicy="no-referrer">'+escapeReviewHtml(part.label)+'</a>';
  }else if(part.code)out+='<code>'+escapeReviewHtml(part.codeText)+'</code>';
  else if(part.bold)out+='<strong>'+escapeReviewHtml(part.boldText)+'</strong>';
  else out+='<em>'+escapeReviewHtml(part.italicText)+'</em>';
  offset=m.index+m[0].length;
 }
 return out+escapeReviewHtml(text.slice(offset));
}
function renderBlock(block){
 switch(block.type){
  case 'paragraph':return '<p>'+inlineReviewHtml(block.text)+'</p>';
  case 'heading':{
   const level=Math.min(4,block.level+1);
   return '<h'+level+'>'+inlineReviewHtml(block.text)+'</h'+level+'>';
  }
  case 'rule':return '<hr>';
  case 'quote':return '<blockquote>'+inlineReviewHtml(block.text)+'</blockquote>';
  case 'code':return '<pre><code>'+escapeReviewHtml(block.text)+'</code></pre>';
  case 'list':return (block.ordered?'<ol>':'<ul>')+
   block.items.map(text=>'<li>'+inlineReviewHtml(text)+'</li>').join('')+
   (block.ordered?'</ol>':'</ul>');
  case 'table':{
   const cell=(tag,text)=>'<'+tag+'>'+inlineReviewHtml(text)+'</'+tag+'>';
   const head='<thead><tr>'+block.headers.map(text=>cell('th',text)).join('')+'</tr></thead>';
   const body='<tbody>'+block.rows.map(row=>'<tr>'+row.map(text=>cell('td',text)).join('')+'</tr>').join('')+'</tbody>';
   return '<div class="table-scroll" role="region" aria-label="Markdown table preview" tabindex="0"><table>'+head+body+'</table></div>';
  }
  default:throw new TypeError('Unknown restricted Markdown block');
 }
}
export function renderEditorialReviewPreview(draft){
 // Revalidate via the exact exported Draft Lab grammar, even for direct callers.
 const validated=parseDraftFile(formatDraft(draft));
 const title=escapeReviewHtml(validated.title.trim());
 const source=safeSourceUrl(validated.source);
 const sourceLine=source?'<p class="source">Original source: <a href="'+escapeReviewHtml(source)+'" rel="noopener noreferrer ugc" target="_blank" referrerpolicy="no-referrer">'+escapeReviewHtml(source)+'</a></p>':'';
 const markup=parsePreviewBlocks(validated.body).map(renderBlock).join('\n');
 return '<!doctype html>\n'+
 '<html lang="'+validated.locale+'"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="robots" content="noindex,nofollow,noarchive">'+
 '<meta name="referrer" content="no-referrer">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
 '<title>UNPUBLISHED REVIEW COPY — '+title+'</title>'+
 '<style>body{max-width:780px;margin:2rem auto;padding:0 1rem;font:17px/1.65 system-ui,sans-serif;color:#182320;background:#fff}h1,h2,h3,h4{line-height:1.3}pre{overflow:auto;padding:1rem;color:#edf5f1;background:#192522;border-radius:.5rem}code{overflow-wrap:anywhere}blockquote{border-left:4px solid #087d57;margin:1rem 0;padding:.3rem 1rem}.notice{padding:1rem;background:#f4f8f5;border:2px solid #087d57}.table-scroll{overflow:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:.4rem;text-align:left}a{color:#006a4a}.meta{color:#536660}</style>'+
 '</head><body><aside class="notice" role="note"><strong>UNPUBLISHED — LOCAL REVIEW COPY.</strong> This file is not a public 24GOTOP article. A real publication requires source, rights, metadata, human editorial approval and a verified HTTPS release.</aside>'+
 '<main><article><h1>'+title+'</h1><p class="meta">Language: '+validated.locale+' · Category: '+validated.category+'</p>'+sourceLine+markup+'</article></main></body></html>\n';
}
export async function makeReviewFile(inputPath,outputPath){
 if(typeof inputPath!=='string'||!inputPath.endsWith('.md')||
    typeof outputPath!=='string'||!outputPath.endsWith('.html'))
  throw new TypeError('Expected local .md input and new .html output');
 const info=await stat(inputPath);
 if(!info.isFile()||info.size<1||info.size>MAX_DRAFT_FILE_BYTES)
  throw new TypeError('Invalid Draft Lab export size');
 const bytes=await readFile(inputPath);
 if(bytes.byteLength>MAX_DRAFT_FILE_BYTES)
  throw new TypeError('Draft Lab export size changed during read');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 const draft=parseDraftFile(text);
 const result=renderEditorialReviewPreview(draft);
 await writeFile(outputPath,result,{flag:'wx',mode:0o600});
 return Object.freeze({generated:true,bytes:Buffer.byteLength(result,'utf8')});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  if(process.argv.length!==4)throw new TypeError('Usage: node scripts/editorial-review-preview.mjs <draft.md> <new-review.html>');
  await makeReviewFile(process.argv[2],process.argv[3]);
  console.log('Local HTML review copy created; UNPUBLISHED and never uploaded.');
 }catch(error){
  console.error('Review preview failed: '+(error instanceof TypeError?error.message:'check input and output path / existing file'));
  process.exitCode=1;
 }
}
