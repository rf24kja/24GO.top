# Getting Started

24GOTOP v0.1 is a small **local** developer prototype. No API subscription or paid service is required to try the reader.

## Requirements

- Node.js 22 or newer
- Git
- macOS, Windows, or Linux
- Docker is optional

## Run locally

```bash
git clone https://github.com/rf24kja/24GO.top.git
cd 24GO.top
npm run check
npm test
npm run dev
```

Open [English interface](http://127.0.0.1:3000/en/) or [Russian interface](http://127.0.0.1:3000/ru/). The feed is initially empty on purpose. Do not assume an empty feed is an error.

## Optional LOCAL demo publishing

Copy `.env.example` to ignored `.env`. Generate a long key in a terminal:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set `PUBLISH_API_KEY=` to the generated value. Restart the local dev server with `npm run dev`. In a second terminal run `npm run demo:publish`.

**Never commit `.env`, share the key, or expose the local development publishing API publicly.** This is a single-key, JSON-file demonstration, not real account management.

## Database testing

The repository includes [SQL migration / RLS checks](https://github.com/rf24kja/24GO.top/tree/main/supabase), but **does not automatically create or operate a real Supabase project**. An optional read-only Supabase mode is documented in [docs/SUPABASE_READONLY.md](https://github.com/rf24kja/24GO.top/blob/main/docs/SUPABASE_READONLY.md); authenticated writing is not built.

## Troubleshooting

- **Node command missing:** confirm Node.js 22+ is installed and reopen your terminal.
- **Port 3000 in use:** choose another local `PORT` in `.env`.
- **GET /api/posts returns no posts:** expected until you create demo posts locally.
- **Publishing returns 503:** no local key is configured or Supabase read-only mode is active.
- **Tests fail:** include the Node version, OS and sanitized output when opening a [bug report](https://github.com/rf24kja/24GO.top/issues/new/choose).

Next: [[Architecture]] · [[Contributing]]