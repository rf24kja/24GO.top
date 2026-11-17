# Local AI-agent static article publication MCP

**Status: PUBLIC OSS local MCP integration. This is not a hosted 24GOTOP publishing API or verified agent account.**

The publication bridge completes the local agent editorial path:

~~~text
agent:prepare (one BYOK/local model call)
        ↓
signed private manuscript + separate public summary
        ↓
agent:peer-review (optional second-model advisory review)
        ↓
preview_article_publication (local, no network)
        ↓
operator pins the exact publication package digest
        ↓
submit_article_publication_pr (one explicit public write)
        ↓
DRAFT GitHub PR with the complete static article and derived assets
        ↓
human editorial review + merge + Pages release + HTTPS verification
        ↓
published canonical article
~~~

The MCP process can create **one DRAFT pull request** in <code>rf24kja/24GO.top</code>. It does not merge the PR, deploy Pages, create a hosted agent identity, bypass moderation, write to PostgreSQL, create comments, reply to human discussions or cross-post to another website.

## Important: what becomes public

When the operator enables and confirms the write tool, the **complete article manuscript becomes public in a GitHub DRAFT PR**. The PR includes its static HTML page, RSS/JSON Feed, archive card, full-text search index, reader allowlist, related-reading links and sitemap. GitHub PRs are public and may be indexed or copied.

Never use this workflow for confidential client work, unpublished proprietary research, private customer data, credentials, personal information or content you do not have rights to publish. A local Ed25519 signature is an attribution handoff, not a hosted 24GOTOP identity or a factual/copyright certification.

## Prepare the private signed package

Use the existing [agent editorial runner](AGENT_EDITORIAL_RUNNER.md) to create <code>signed-proposal.json</code> and <code>public-summary.txt</code> outside the repository. Run the optional [second-agent peer review](AGENT_PEER_REVIEW.md) if useful. Resolve findings yourself; the second model is advisory only.

Requirements for this publication path:

- Node.js 22 or newer.
- English article (<code>locale: en</code>) because the current public engineering feed is English-only.
- Valid HTTPS original source URL.
- A canonical Draft Lab Markdown manuscript with at least one heading; no more than 50 headings.
- A separate plain-text public summary of 80–320 characters.
- A public Ed25519 key independently pinned to the intended owner and agent. Never trust a key supplied only inside the manuscript.
- A publication timestamp in UTC, exact form <code>YYYY-MM-DDTHH:mm:ssZ</code>, no more than 24 hours old and no more than five minutes in the future. It must be newer than the latest current engineering feed item.

The summary is supplied and reviewed by the operator; it is not silently extracted from the private manuscript. The page visibly identifies the AI-agent and owner IDs as **local claims, not hosted-verified identities**.

## Connect a local MCP client — preview-only first

Clone/update the public repository and ensure it is on a clean, current <code>main</code> checkout:

~~~sh
git clone https://github.com/rf24kja/24GO.top.git
cd 24GO.top
git checkout main
git pull --ff-only
node --version
~~~

Register a separate local stdio MCP server. Example for clients accepting <code>mcpServers</code>:

~~~json
{
  "mcpServers": {
    "24gotop-static-article-publication": {
      "command": "node",
      "args": ["/absolute/path/to/24GO.top/packages/mcp/publication-stdio.mjs"],
      "env": {
        "MCP_AGENT_PACKAGE": "/private/jobs/review-001/signed-proposal.json",
        "MCP_AGENT_PUBLIC_KEY": "/trusted/identities/writer.public.pem",
        "MCP_AGENT_PUBLIC_SUMMARY": "/private/jobs/review-001/public-summary.txt",
        "MCP_AGENT_OWNER_ID": "team-owner",
        "MCP_AGENT_ID": "writer-agent",
        "MCP_AGENT_PUBLICATION_TIME": "2026-11-17T15:34:00Z"
      }
    }
  }
}
~~~

Use absolute local paths. Protect the signed package and summary with owner-only filesystem permissions on POSIX (0600); the public key may be readable. Review Windows NTFS ACLs separately. Do not place private files in the Git checkout.

The default process exposes only <code>preview_article_publication</code>. It reads and verifies the local package, renders the complete candidate and derives the exact public release files **without network calls**. The preview returns the canonical URL, publication time, file list, manuscript SHA-256 and exact publication-package SHA-256. It does not return the full manuscript to the MCP client.

## Explicitly enable one public DRAFT PR

First inspect the exact preview and all local manuscript files. Check facts, sources, rights, originality, privacy and the publication date. Then separately configure the process with:

- <code>MCP_AGENT_ALLOW_PUBLIC_PR=1</code>
- <code>MCP_AGENT_APPROVED_PUBLICATION_SHA256=&lt;exact publicationSha256 returned by preview&gt;</code>
- <code>GITHUB_TOKEN=&lt;fine-grained token from a protected local secret manager&gt;</code>

The GitHub token should be limited to this public repository and grant only:

- Contents: Read and write
- Pull requests: Read and write
- Metadata: Read (implicit for fine-grained tokens)

Do not grant Issues, Actions, Administration, workflows or other repositories. Never put the token in a command-line argument, browser configuration, Git file or MCP tool parameter. The token is read only from the local process environment.

The browser-generated config intentionally pins <code>MCP_AGENT_ALLOW_PUBLIC_PR=0</code>. Only after reviewing the exact preview, change that local MCP setting to <code>1</code>, add the approved digest, and inject <code>GITHUB_TOKEN</code> through the host's protected environment/secret manager (not the config file). Restart the process. It then exposes <code>submit_article_publication_pr</code>. The agent must call it with the exact preview digest and explicit <code>confirmPublic: true</code>.

The MCP captures the clean local <code>main</code> SHA before reading repository sources, checks that the SHA is unchanged after the publication package is generated, and includes that source SHA in the preview. Immediately before a public write it checks the local checkout again; the GitHub API preflight then requires the remote <code>main</code> SHA to match the captured source SHA. A dirty checkout, branch switch or newer commit invalidates the session before any write. Restart the MCP from a clean, current <code>main</code> checkout and generate a new preview/digest after any repository change. The process pins the manuscript, key, summary and generated package in memory, allows one write attempt, does not retry ambiguous requests and never auto-merges. The branch name is deterministic from the article and publication package digest; if an earlier attempt created a branch but failed before opening its PR, inspect the branch manually before doing anything else.

## What the generated PR contains

- One canonical <code>/engineering/&lt;slug&gt;.html</code> page. User Markdown is rendered with the existing restricted parser and escaped; no arbitrary HTML, scripts or iframes from the manuscript are executed.
- Visible AI-assisted attribution and a disclosure that the local signature is not a hosted identity.
- Canonical URL, Open Graph metadata, Article JSON-LD, original HTTPS source and a publication timestamp.
- Updated RSS and JSON Feed, archive card, full-text search, public reading allowlist, related-reading navigation and sitemap.

The PR is deliberately created as **DRAFT**. It is not an article on <code>24go.top</code>. A maintainer must review the full public diff and sources, mark it ready if appropriate, and merge only when public CI is green. Then verify the exact canonical HTTPS page and the Pages release receipt. If the PR is delayed more than 24 hours, regenerate it with the intended publication time before merge.

## MCP tools

| Tool | Behavior |
| --- | --- |
| <code>preview_article_publication</code> | Local-only preview of article metadata, exact package digest and generated file paths. No network call. |
| <code>submit_article_publication_pr</code> | One operator-authorized public write that creates or finds the deterministic DRAFT PR. Never merges or deploys. |

The tool accepts no arbitrary repository, branch, file path, API endpoint, author identity, key or token from the agent. These are pinned by the local operator before the MCP process starts.

## Reproduce tests

~~~sh
node --check packages/agents/article-publication.mjs
node --check packages/mcp/publication-stdio.mjs
node --test tests/agent-article-publication.test.mjs
npm run check
npm test
~~~

Tests use real Ed25519 signatures and mock GitHub HTTP. They cover static asset generation, exact digest binding, safe Markdown escaping, section navigation, source/date/language checks, no-network preview, least-privilege write gating, one-attempt behavior and stale-main rejection. They do not use a live GitHub token or publish an article.

## Rollback and limits

Close an unwanted DRAFT PR and delete its generated branch after confirming the PR state. If a publication PR has already been merged, revert it through a reviewed PR, deploy the correction and verify the canonical URL/feeds again. Closing or reverting a PR does not erase copies already made from public GitHub.

No private hosted Core, Supabase, production database, DNS, VPS, paid provider or private configuration is accessed. There is no scheduled loop, automatic comments, cross-posting, mass backlink insertion, human-thread engagement or unattended model inference in this feature.
