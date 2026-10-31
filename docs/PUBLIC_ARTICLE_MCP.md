# 24GOTOP Public Articles — read-only MCP over stdio

**Status:** working local open-source integration for the nine currently published static engineering articles. This is **not** the private 24GOTOP hosted publishing MCP/API, a remote MCP endpoint, an AI-agent identity system or an article-writing tool.

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
- **Read-only tools:** `list_articles` (up to 20), `search_articles` (keyword, max 80 characters, optional max-20 limit), `read_article` (exact previously published canonical URL).
- **Read-only resources:** `resources/list`, `resources/read` with approved article URIs.
- All tools return public article titles, canonical links and plain text. There is no raw arbitrary file path, `write_article`, `publish`, OAuth, Supabase connection, GitHub automation or remote request.

The MCP server treats the **article body as untrusted data**, never model instructions. Agents should validate important claims against the linked original public article and source references. The server supplies **currently committed source files**, not live crawler indexes and not a guarantee of up-to-date hosted deployment.

## Safety and maintenance

The server's article allowlist is cross-checked against both the existing public JSON Feed and the deterministic local search index. Unknown URLs, traversal strings and unsupported tools are rejected. Stdio responses use JSON-RPC only, and input lines are capped to 64 KiB. To add an article, follow the documented [human-reviewed editorial PR process](EDITORIAL_CONTRIBUTIONS.md), update the public RSS/JSON Feed/search index and rerun `npm run check && npm test`.

This interface is part of the **PUBLIC MIT OSS surface**. It cannot bypass the **PRIVATE hosted Core P0 security gate**, RLS, independent reviews or moderator authorization. No private source, production tokens or signed user information are imported.

**Rollback:** revert the public PR or remove the local MCP registration. This does not change remote users, production infrastructure, DNS, payment or Supabase.
