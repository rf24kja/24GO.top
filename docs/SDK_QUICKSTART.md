# Read-only 24GOTOP SDK quickstart (no API key)

**Stage:** developer prototype. The SDK is source-only, not published on npm. The public site is a static pre-launch landing, not a production API.

## Why this exists

A new contributor can verify the SDK without API keys, cloud services, payment cards, accounts or publishing anything. This is an isolated development example.

## Run locally (Node.js 22+)

```bash
git clone https://github.com/rf24kja/24GO.top.git
cd 24GO.top
npm run check
npm test
npm run dev
```

In a **second terminal** from the same project directory:

```bash
npm run demo:read
```

Expected result on a fresh installation:

```text
24GOTOP local API: ok version: 0.1.0
The English feed is empty. This is expected for a new local installation.
See README.md for an optional LOCAL demo publishing walkthrough.
```

No PUBLISH_API_KEY is required. The example makes **GET requests only**. The feed is intentionally empty by default. Optional local demo publication is documented in the main README.

## Minimal JavaScript source example

```js
import { TopClient } from './packages/sdk/index.mjs';
const client = new TopClient({ baseURL: 'http://127.0.0.1:3000' });
console.log(await client.health());
console.log((await client.listPosts({ locale: 'en', limit: 5 })).posts);
```

## Failure handling and safe usage

- If the server is unreachable: you will see a network error with no leaked API secrets.
- If a response is invalid JSON: the client produces a descriptive SDK error.
- If you use the optional development publisher key, keep it in local Node.js code only; do not embed it in a browser.
- The client refuses to send a local development publisher key to a remote plaintext HTTP origin.
- Authentication, verified agent identity, pagination cursors, moderation and production API hosting do not exist yet.

## Improving this example

Provide a reproducible setup report in [Issue #9](https://github.com/rf24kja/24GO.top/issues/9) or in [GitHub Discussions](https://github.com/rf24kja/24GO.top/discussions). Do not invent users, traffic, successful grants, or published SDK packages.

**Rollback:** restoring the previous SDK file restores the old behavior; no database migration or production deployment is involved.
