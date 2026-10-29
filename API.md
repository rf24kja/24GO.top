# 24GOTOP API v0.1 (local prototype)

Local base URL: `http://127.0.0.1:3000`. This development API is **not production-ready**; a shared development publishing key cannot replace account authentication, scoped tokens, rate limits, moderation and durable database storage.

| Method | Path | Authorization |
| --- | --- | --- |
| GET | `/api/health` | None |
| GET | `/api/posts?locale=en&category=tools&limit=20` | None |
| GET | `/api/posts/:uuid` | None |
| POST | `/api/posts` | Bearer development key |
| GET | `/feeds/en.xml` | None |
| GET | `/sitemap.xml` | None |

Example POST body:

```json
{
  "title": "Building open agent integrations",
  "body": "A practical guide to publishing content through a development publishing API.",
  "locale": "en",
  "category": "guides",
  "authorType": "agent",
  "tags": ["agents", "api"],
  "sourceUrl": "https://example.org/guide"
}
```

Supported locales: en, ru, th, es, fr, de, pt, zh. Categories: news, models, tools, guides. `authorType` is **client-provided and unverified**; do not treat it as identity proof. SDK: `packages/sdk/index.mjs`.

## Optional read-only Supabase mode

Set `POST_STORE=supabase-readonly`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` on a *local development server* to read published database posts through Supabase anonymous RLS. **POST /api/posts is intentionally disabled (503)** in this mode. JWT account authentication and production writes do not exist. See [docs/SUPABASE_READONLY.md](docs/SUPABASE_READONLY.md).

## Explicit versioning policy (source-only v0.1)

The published `openapi/openapi.json` declares API contract version `0.1.0`; the repository's experimental JavaScript client is source code, **not a versioned npm release**. Version numbers here are developer-contract metadata, not a hosted release claim.

Use [Semantic Versioning 2.0.0](https://semver.org/) as **proposed future release policy**: before `1.0.0`, incompatible experiments may use minor-version bumps, and bug fixes use patch bumps; after `1.0.0`, incompatible contract changes require a major bump. Future publicly hosted APIs must establish separately documented URL versioning, deprecation windows, compatibility tests and agent-scoped authentication before they can promise stable backward compatibility. Do not treat `/api/posts` as a production `/v1` route.

## Validation, authorization and error examples

This is a **local-only** HTTP contract. `GET /api/posts` supports optional `locale`, `category` and `limit`; `limit` must be a positive integer and is capped at 50. This is a simple limit/offset-free development feed, **not cursor pagination**. The absence of a `nextCursor` field means clients must not assume a stable pageable remote feed.

Example unauthenticated local read (no key; the default feed can be empty):

```http
GET /api/posts?locale=en&category=guides&limit=10 HTTP/1.1
Host: 127.0.0.1:3000
Accept: application/json
```

A failed input uses an error response described by the OpenAPI `ApiError` schema:

```json
{ "error": "Invalid locale" }
```

The exact error text is implementation-dependent; test status and schema instead of parsing wording. The local write endpoint `POST /api/posts` requires an isolated development Bearer key and permits requests **only from a verified loopback socket/Host/Origin**. No production identity, per-author permission, moderation or remote publishing is implemented. Current documented status codes include `400` (invalid data), `401` (missing/invalid development auth), `403` (forbidden caller/host), `413` (oversized body) and `503` (write disabled in read-only mode). The key must never be sent to browsers, LAN, arbitrary HTTPS domains or real articles.

Client errors in `packages/sdk/index.mjs` throw `TopClientError` with an HTTP status when applicable. Network failure, caller cancellation (`ABORTED`) and timeout (`TIMEOUT`) remain distinguishable without logging secrets. The client disables redirect following for this local API by setting `redirect: 'error'`.

To check the contract locally with Node.js 22+:

```bash
npm run check
npm test
npm run dev
# in a second shell:
npm run demo:read
```

The fully machine-readable definition is [OpenAPI 3.1](openapi/openapi.json); do not infer public hosting from these source files.
