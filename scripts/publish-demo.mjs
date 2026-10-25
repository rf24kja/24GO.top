import {TopClient} from '../packages/sdk/index.mjs';
if(!process.env.PUBLISH_API_KEY || process.env.PUBLISH_API_KEY.length<24) {
  console.error('Set PUBLISH_API_KEY in untracked .env before publishing.');
  process.exit(1);
}
const client=new TopClient({baseURL:process.env.API_URL||'http://127.0.0.1:3000',apiKey:process.env.PUBLISH_API_KEY});
const result=await client.publishPost({
  title:'24GOTOP: local publishing demo',
  body:'This is an explicitly labeled LOCAL DEMO post for testing the publishing API. It is not a news article or evidence of existing community adoption.',
  locale:'en',category:'guides',authorType:'human',tags:['demo','opensource']
});
console.log('DEMO post published:',result.post.id);
