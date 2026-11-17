# Local AI-agent authoring MCP — one BYOK article, one private review bundle

**Status: working PUBLIC OSS local MCP workflow.** A connected MCP-capable assistant can ask 24GOTOP to generate one evidence-led English technical article using the model endpoint selected by the operator. The server signs the result with an owner-pinned local Ed25519 key and saves the complete manuscript, public summary and receipt in a private directory outside the repository.

This is an authoring handoff, **not hosted registration or publication**. It makes one model request per MCP process. It does not call GitHub, upload the manuscript, create an Issue/PR, publish a page, post comments, cross-post or enter human discussions.

## 1. What the agent can do

The MCP server exposes one tool: \`prepare_article_draft\`.

The connected agent supplies:

- A clear technical headline and writing brief.
- An HTTPS primary source.
- Operator-provided evidence that the model may use.
- An independently reviewed public summary (80–320 characters).
- An explicit UTC publication time.
- \`confirmCosts: true\` and \`confirmProviderData: true\` for this specific request.

The server validates the request, the model endpoint, the independently pinned owner/agent identity and the matching private/public Ed25519 keys **before inference**. It then performs one OpenAI-compatible chat-completions request with a maximum of 1,800 output tokens, a 20-second timeout, bounded response size, no redirects and no automatic retry. The generated Markdown is parsed through the existing Draft Lab format and scanned for common sharing risks.

Only English is accepted for this publication workflow because the current public engineering feed is English-only. The timestamp must be newer than the latest engineering-feed item, no more than 24 hours old and no more than five minutes in the future.

## 2. Prepare local identity and private storage

Use Node.js 22+ and a current clone of the public repository. Keep the keys and every output directory outside the Git checkout.

Start from a clean, current `main` checkout. The authoring MCP pins the local source SHA before generation and checks it again after building the publication preview; a branch switch, dirty file or source change rejects the result before it can be handed off.

~~~sh

git checkout main
git pull --ff-only
~~~

Example on Linux/macOS:

~~~sh
mkdir -p "$HOME/.config/24gotop" "$HOME/.local/share/24gotop-private"
chmod 700 "$HOME/.config/24gotop" "$HOME/.local/share/24gotop-private"

npm run agent:keys -- \
  --private-out "$HOME/.config/24gotop/writer.private.pem" \
  --public-out "$HOME/.config/24gotop/writer.public.pem"
~~~

The private key must be owner-only (0600). The public key is independently pinned to the intended owner and agent IDs. Never trust a key merely because the connected agent supplied it. On Windows, configure and verify restrictive NTFS ACLs manually; POSIX mode bits are not an ACL substitute.

## 3. Configure the model provider

The authoring server reads these variables from its protected local process environment:

| Variable | Meaning |
| --- | --- |
| \`AGENT_DRAFT_ENDPOINT\` | Exact OpenAI-compatible chat-completions URL. HTTPS is required except for HTTP loopback inference. |
| \`AGENT_DRAFT_MODEL\` | Exact model identifier supported by that endpoint. |
| \`AGENT_DRAFT_KEY\` | Provider credential, optional only for a keyless loopback endpoint. |
| \`MCP_AGENT_OUTPUT_ROOT\` | Existing private output directory outside the repository; POSIX mode 0700. |
| \`MCP_AGENT_PRIVATE_KEY\` | Absolute path to the local Ed25519 private PEM (0600). |
| \`MCP_AGENT_PUBLIC_KEY\` | Absolute path to the independently pinned public PEM. |
| \`MCP_AGENT_OWNER_ID\` | Expected local owner ID, 3–64 lowercase letters/digits/hyphens. |
| \`MCP_AGENT_ID\` | Expected local writer-agent ID, same format. |

The browser configuration helper at [24go.top/agents/](https://24go.top/agents/) can generate the local command and non-secret settings. It deliberately does **not** collect or emit \`AGENT_DRAFT_KEY\`; inject that credential through the MCP host's protected secret manager. Never commit it or put it in a browser form, source file, shell history or tool argument.

The endpoint is pinned by the operator, not chosen by the agent. Arbitrary URLs, remote plain HTTP, URL credentials, query strings, fragments and redirects are rejected.

## 4. Connect the MCP server

Register this local stdio server in a compatible MCP client:

~~~json
{
  "mcpServers": {
    "24gotop-local-agent-authoring": {
      "command": "node",
      "args": ["/absolute/path/to/24GO.top/packages/mcp/authoring-stdio.mjs"],
      "env": {
        "MCP_AGENT_OUTPUT_ROOT": "/home/user/.local/share/24gotop-private",
        "MCP_AGENT_PRIVATE_KEY": "/home/user/.config/24gotop/writer.private.pem",
        "MCP_AGENT_PUBLIC_KEY": "/home/user/.config/24gotop/writer.public.pem",
        "MCP_AGENT_OWNER_ID": "team-owner",
        "MCP_AGENT_ID": "technical-writer",
        "AGENT_DRAFT_ENDPOINT": "https://api.example.com/v1/chat/completions",
        "AGENT_DRAFT_MODEL": "your-model-id"
      }
    }
  }
}
~~~

Inject \`AGENT_DRAFT_KEY\` separately through the host's protected environment. Restart the MCP client after adding the server.

## 5. Call the authoring tool once

Example tool arguments:

~~~json
{
  "article": {
    "title": "A reproducible guide to verifying a public article release",
    "brief": "Explain how to verify a reviewed article after a static website deployment. Describe the exact source, canonical URL and release receipt checks.",
    "locale": "en",
    "category": "guides",
    "source": "https://docs.github.com/en/pages",
    "evidence": "GitHub Pages deployment can be checked against the exact reviewed commit. A successful workflow alone does not prove indexing, readership or AI citations."
  },
  "publicSummary": "This technical guide explains a reproducible method for checking a reviewed article against its canonical public HTTPS release and exact deployment receipt.",
  "publicationTime": "2026-11-17T16:25:00Z",
  "confirmCosts": true,
  "confirmProviderData": true
}
~~~

Only use \`confirmCosts: true\` after accepting possible provider charges. Only use \`confirmProviderData: true\` after confirming you are allowed to send the brief and evidence to the selected provider. Do not include client secrets, private customer records, credentials or confidential drafts. Heuristic privacy checks are not a guarantee that data is safe.

The process accepts **one generation attempt**. A failed or ambiguous provider request is not retried. Restarting the same process cannot create a second request. Configure a hard provider-side spending limit; the token cap is not a dollar budget.

## 6. Review the private bundle

A successful tool call returns the local output directory, canonical URL candidate, pinned `sourceMainSha`, exact manuscript and publication SHA-256 digests, generated file list and explicit \`published: false\` / \`submitted: false\` state. It does **not** return the full manuscript to the MCP client.

The private output directory contains:

| File | Purpose |
| --- | --- |
| \`draft.md\` | Complete private Draft Lab manuscript. |
| \`signed-proposal.json\` | Complete owner-pinned signed handoff. |
| \`public-summary.txt\` | Reviewed public-only summary. |
| \`issue-preview.json\` | Local-only editorial preview. |
| \`receipt.json\` | Identity fingerprint, manuscript digest and private pending-review state. |

Open and inspect the complete \`draft.md\` yourself. Verify every technical claim and source, test code examples, check originality, copyright, privacy and publication rights. A second model can provide a separate advisory review with [\`npm run agent:peer-review\`](AGENT_PEER_REVIEW.md); its findings are not approval or factual certification.

## 7. Optional next step: separate human-approved publication MCP

Only after inspecting the full private manuscript, summary and receipt should an operator configure the separate [article publication MCP](AGENT_ARTICLE_PUBLICATION_MCP.md). Its preview must reproduce the exact publication SHA-256 returned by authoring.

The operator must then explicitly authorize that exact digest and a fine-grained repository-scoped GitHub token. The publication MCP can create one public **DRAFT PR** containing the full article and derived RSS, JSON Feed, archive, search, reader allowlist, related links and sitemap. The complete manuscript becomes public in that PR. A human must review and merge it; the normal Pages delivery and HTTPS checks must then pass.

The authoring MCP itself has no GitHub token and no publication tool. It cannot publish, merge, deploy, create comments or cross-post.

## Tests and rollback

~~~sh
node --check packages/mcp/authoring-stdio.mjs
node --test tests/agent-authoring-mcp.test.mjs
npm run check
npm test
~~~

Tests use a mocked model endpoint and real local Ed25519 keys. They cover one-shot generation, pre-inference validation, cost/data consent, private file permissions, path isolation, signature verification, publication-package digest and no public writes. They do not prove remote provider quality or perform a live model call.

To disconnect, remove the local MCP entry. Private review bundles and keys remain on the operator's machine; delete them manually only after confirming they are no longer needed. No hosted account, database, public GitHub write or website publication is created by this MCP.
