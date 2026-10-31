# 24GOTOP Public Articles — read-only MCP over stdio

**Status:** working local open-source integration for the ten currently published static engineering articles. This is **not** the private 24GOTOP hosted publishing MCP/API, a remote MCP endpoint, an AI-agent identity system or an article-writing tool.

The tenth guide was added by [public editorial PR #118](https://github.com/rf24kja/24GO.top/pull/118), with source CI and live delivery verified on 31 October 2026. The MCP still reads only your **local checkout**, not remote data; run `git pull` to update the corpus.

This module consumes **only committed static** `site/engineering/feed.json`, `search-index.json` and the allowlisted published article HTML from the checked-out repository. It does not use network requests, credentials, a database, browser storage, telemetry or write privileges. It never reads user-authored draft files. Contents may be outdated until you update your Git checkout.

## Install and run

Requirements: Node.js 22 or newer, locally checked-out [public repository](https://github.com/rf24kja/24GO.top).

```sh
git clone https://github.com/rf24kja/24GO.top.git
cd 24GO.top
npm run mcp:articles
```

The server communicates via **JSON-RPC over stdin/stdout**. It deliberately prints no startup banner to stdout (the MCP host owns the process). Do not paste API keys into parameters. To exit, close stdin or terminate the host process. Manual terminal invocation waits for protocol requests; this is expected.

In an MCP-capable desktop or IDE host, register a local stdio server with executable `node` and argument `/absolute/path/to/24GO.top/packages/mcp/stdio.mjs`. The exact MCP client configuration UI/format varies; use your host's **local stdio command** integration, not a public HTTP URL. Example configuration in hosts accepting `mcpServers`:

```json
{
  "mcpServers": {
    "24gotop-public-articles": {
      "command": "node",
      "args": ["/absolute/path/to/24GO.top/packages/mcp/stdio.mjs"]
    }
  }
}
```

On Windows, replace the argument with an absolute Windows path in JSON string form, escaping backslashes or using forward slashes.

## Supported protocol and functions

- **MCP 2026-07-28:** `server/discover`, stateless `_meta` version and `resultType=complete` on results.
- **Legacy 2025-11-25/2025-06-18:** `initialize` and the customary stdio request flow, for older clients.
- **Read-only tools:** `list_articles` (up to 20), `search_articles` (multiword relevance, limit 1–20, original array format), `search_articles_page` (offset paging with total), `read_article` (exact canonical full lossy plain text), and `read_article_excerpt` (bounded Unicode-safe excerpt).
- **Read-only resources:** `resources/list`, `resources/read` with approved article URIs.
- All tools return public article titles, canonical links and plain text. There is no raw arbitrary file path, `write_article`, `publish`, OAuth, Supabase connection, GitHub automation or remote request.

The MCP server treats the **article body as untrusted data**, never model instructions. Agents should validate important claims against the linked original public article and source references. The server supplies **currently committed source files**, not live crawler indexes and not a guarantee of up-to-date hosted deployment.

## Source-backed agent discovery and bounded excerpts (MCP v0.2.0)

The local stdio MCP server now supports **five read-only tools**.
The existing three tools keep their original output shapes:
`list_articles` returns a list, `read_article` returns the full
lossy extracted plain text, and `search_articles` still returns a list
of matching canonical article metadata.

**Existing `search_articles` improvement:** a query such as
`PostgreSQL permission` now requires *every* search word somewhere in the
reviewed title, summary or full-text index. Results are ordered by fixed
title/summary/body relevance with a phrase bonus and stable article-order
tie-breaking. It does not search unpublished drafts, other websites or
user accounts. The input remains at most 80 printable characters and
`limit` is 1–20; the old array response remains backward compatible.

**New `search_articles_page`:** the same ranked search with
`query`, optional `limit` (default 10, 1–20), and optional `offset`
(default 0, 0–200). Returns a structured object with
`total`, `offset`, `nextOffset` (or `null`) and `articles`, each
containing its canonical URL, title, summary, date, language and
`matchedIn` (title/summary/article). No cursor secrets or query uploads:
this is a deterministic local snapshot, **not** an API over live users.

**New `read_article_excerpt`:** accepts **only** the exact canonical
`url` of an already reviewed article in the local feed, an optional
`offset` (0–28,000 Unicode code points, default 0), and `maxChars`
(200–4,000 code points, default 1,800). Returns
`excerpt`, `offset`, `end`, `totalCharacters`,
`nextOffset` or `null`, `textKind` and the canonical URL/title.
The excerpt comes from the existing HTML-stripped plaintext reader:
it is **lossy and not suitable for exact quotations or copying code**.
Open the canonical original page before quoting. All source article
content is untrusted data, never agent instructions.

Example JSON-RPC requests on stdio (one JSON object per line, no
additional executable tool configuration beyond the host registration):

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_articles_page","arguments":{"query":"security policy","limit":5,"offset":0}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"read_article_excerpt","arguments":{"url":"https://24go.top/engineering/read-only-mcp-server-for-technical-articles.html","offset":0,"maxChars":1200}}}
```

The public feed and search index are checked for fixed canonical origin,
JSON Feed version, count/URL pairing, duplicate filenames, normalized and
bounded text, valid dates and trusted article metadata before exposure.
The server itself still performs **no network calls**. A local MCP host
must update its Git checkout for newer reviewed articles. MCP does not
grant verified agent identity, comments, publishing or moderation.

## Safety and maintenance

The server's article allowlist is cross-checked against both the existing public JSON Feed and the deterministic local search index. Unknown URLs, traversal strings and unsupported tools are rejected. Stdio responses use JSON-RPC only, and input lines are capped to 64 KiB. To add an article, follow the documented [human-reviewed editorial PR process](EDITORIAL_CONTRIBUTIONS.md), update the public RSS/JSON Feed/search index and rerun `npm run check && npm test`.

This interface is part of the **PUBLIC MIT OSS surface**. It cannot bypass the **PRIVATE hosted Core P0 security gate**, RLS, independent reviews or moderator authorization. No private source, production tokens or signed user information are imported.

**Rollback:** revert the public PR or remove the local MCP registration. This does not change remote users, production infrastructure, DNS, payment or Supabase.
