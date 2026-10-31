import { TopEditorialClient } from '../packages/sdk/index.mjs';

const client = new TopEditorialClient();
try {
  const { articles } = await client.listArticles({ limit: 5 });
  for (const { title, url } of articles) console.log(title + '\n' + url);
} catch (error) {
  console.error('Public editorial feed unavailable:', error.message);
  process.exitCode = 1;
}
