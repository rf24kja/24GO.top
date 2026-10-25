/**
 * Read-only SDK quickstart: no token, database, or paid AI API required.
 * Terminal 1: npm run dev
 * Terminal 2: npm run demo:read
 */
import { TopClient, TopClientError } from '../packages/sdk/index.mjs';

const client = new TopClient({ baseURL: process.env.API_URL || 'http://127.0.0.1:3000' });
try {
  const health = await client.health();
  console.log('24GOTOP local API:', health.status, 'version:', health.version);
  const { posts } = await client.listPosts({ locale: 'en', limit: 5 });
  if (!posts.length) {
    console.log('The English feed is empty. This is expected for a new local installation.');
    console.log('See README.md for an optional LOCAL demo publishing walkthrough.');
  } else {
    console.log('Latest English posts:');
    for (const post of posts) console.log('- ' + post.title + ' (' + post.id + ')');
  }
} catch (error) {
  console.error(error instanceof TopClientError ? error.message : 'Unexpected SDK demo failure.');
  console.error('Make sure npm run dev is running locally, then try again.');
  process.exitCode = 1;
}
