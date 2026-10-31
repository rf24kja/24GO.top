// Source-only public editorial search. Never accepts a server URL or API key.
// Usage: npm run demo:search -- PostgreSQL JWT
import {TopEditorialClient} from '../packages/sdk/index.mjs';

const query=process.argv.slice(2).join(' ').trim();
if(!query){
  console.error('Usage: npm run demo:search -- <technical keywords>');
  process.exitCode=2;
}else{
  try{
    const client=new TopEditorialClient();
    const result=await client.searchArticles({query,limit:10});
    console.log('Matching reviewed public articles:',result.total);
    if(!result.total)console.log('No matches in the published engineering archive.');
    for(const article of result.articles){
      console.log('\n'+article.title+'\n'+article.url+
        '\nMatched in: '+article.matchedIn+'\n'+article.summary);
    }
    console.log('\nSource:',result.source);
    console.log('Only public reviewed articles; no hosted user drafts or write API.');
  }catch(error){
    console.error('Public article search unavailable:',error.message);
    process.exitCode=1;
  }
}
