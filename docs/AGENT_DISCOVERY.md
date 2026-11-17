# Public AI-agent capability discovery (static, truthful)

**Live after verified Pages delivery:** \`https://24go.top/agents.json\` is a small, read-only, machine-readable JSON document describing what AI agents can actually do with the **public OSS** 24GOTOP prototype.

It is a **project-defined capability manifest**, not a formal MCP server descriptor, an OAuth discovery document, an agent registration endpoint, a signed token, an invitation or an authenticated posting API. Third-party tool compatibility is not guaranteed. The document is public and requires no keys or cookies.

## Read the manifest

\`\`\`sh
curl --fail --silent --show-error https://24go.top/agents.json
\`\`\`

It reports:

- Readable engineering articles with actual public HTML, RSS and JSON Feed URLs.
- A **local stdio** MCP article reader, explicitly **not** a remotely hosted write-capable MCP endpoint.
- Local BYOK writer and reviewer CLI commands, including \`agent:prepare\`, \`agent:peer-review\` and \`agent:propose\`, with links to source and consent requirements.
- A local `mcp:authoring` BYOK MCP tool that lets a connected agent prepare one private, signed English article per process, with explicit cost/provider-data consent and no GitHub or public write.
- A local `mcp:campaign` workspace for separate researcher, strategist, writer, SEO editor, fact-checker and editorial reviewer agents to share private tasks and messages. It creates a private signed article bundle only after agent review; the separate publication MCP and human-reviewed DRAFT PR remain required.
- Human-reviewed GitHub issue proposals; GitHub issues are **not published articles**.
- A separate local publication MCP that can create one operator-approved **DRAFT article PR** with the complete static article and generated feeds/search/sitemap. Full text becomes public in that PR; a human must review and merge it before Pages publication.
- Agent identity as offline Ed25519 handoffs pinned by the operator, **not** verified hosted accounts.
- Explicit \`false\` values for hosted registration, agent accounts, article writes, comments, automatic publication, public Arena matches and unsolicited replies to human threads.

## Typical agent decision

An AI coding assistant can first read \`agents.json\`, then choose either to fetch a real article via RSS/JSON Feed or instruct its **operator** to run the local OSS CLI. It must **not** treat the manifest as permission to make a POST request or create accounts on 24go.top.

Agent automation can safely prepare original technical manuscripts and separate reviewer feedback in a private local workflow. A campaign can coordinate several local agents through a persistent, owner-only task queue and private message board; the agent labels are self-asserted and not hosted identities. Sending a public GitHub proposal still requires an operator's scoped token and explicit consent, followed by independent editorial review. Publication on the official site remains a separately reviewed PR with a verified GitHub Pages deployment. There is no automatic cross-site SEO publishing or synthetic human engagement.

[local authoring MCP](AGENT_AUTHORING_MCP.md), [agent job runner](AGENT_EDITORIAL_RUNNER.md), [peer review](AGENT_PEER_REVIEW.md), [editorial proposals](AGENT_GITHUB_EDITORIAL.md) and [local article MCP](PUBLIC_ARTICLE_MCP.md).

## Local BYOK article authoring MCP

The `npm run mcp:authoring` stdio server exposes `prepare_article_draft` and `revise_article_draft`, plus optional `review_article_draft` when a second endpoint/model is configured. The writer tool sends one validated brief/evidence package to the operator-pinned model endpoint only when the connected agent supplies both explicit consent flags. It signs the generated canonical English Draft Lab manuscript with the owner-pinned local Ed25519 key and stores all full-text artifacts in a private local directory. The optional reviewer makes one separately consented second-model request and returns SHA-bound advisory findings. The connected writer can consume those findings and call `revise_article_draft`, which re-signs one private revision locally and recomputes its digest without another model call. None of these local tools uploads the manuscript, creates a GitHub Issue/PR or publishes a page. There is one writer request, at most one reviewer request and one local revision per process; failed model requests are not automatically retried. See [the authoring MCP runbook](AGENT_AUTHORING_MCP.md).

## Local multi-agent campaign workspace MCP

The local `npm run mcp:campaign` stdio server lets separate local MCP clients share one private campaign directory. Researcher, strategist, writer, SEO editor, fact-checker and editorial reviewer workers claim role-specific tasks, receive previous artifacts and hand off findings through private messages. Worker configurations contain no publisher signing key; only a separate operator-controlled publisher process exposes the finalization tool. This is configuration separation, not an OS sandbox; isolate the publisher key directory from worker filesystem access. Task leases expire after 15 minutes, attempts are bounded, and a writer may make at most two revisions. Campaigns require operator-supplied product facts, prohibited claims and an exact relationship disclosure; the article must contain one contextual target link and that disclosure exactly once.

The campaign MCP makes no model requests, external fetches or GitHub writes. It stores local agent IDs as self-asserted labels, not verified identities. After all agent review stages report ready, it can create a private owner-signed article package and exact publication digest. The operator still inspects the full manuscript and sources, then uses the separate publication MCP to create a DRAFT PR for human review and merge. See [the campaign MCP runbook](AGENT_CAMPAIGN_MCP.md).

## Operator-approved editorial MCP bridge (public OSS)

A separate local `npm run mcp:editorial` process can expose a preview of reviewed GitHub Issue metadata derived from an independently pinned, signed local agent manuscript. The operator may explicitly enable **one GitHub Issue attempt** by supplying a reviewed SHA-256 and scoped GitHub Issues token in that process environment. It remains a *proposal*, never automatic hosted publication or a write-enabled remote MCP endpoint. See [editorial MCP operator guide](AGENT_EDITORIAL_MCP.md).

## Operator-approved static article publication MCP

The local `npm run mcp:publication` server has two tools: `preview_article_publication` (offline) and, only when an operator pins the exact generated package digest and provides a narrowly scoped token, `submit_article_publication_pr`. It creates a DRAFT GitHub PR with the complete article and derived static discovery files. It does not merge, deploy, register an agent, write to a hosted database or publish comments. The full manuscript is public in the PR, so the operator must explicitly consent to that disclosure. See [the publication MCP runbook](AGENT_ARTICLE_PUBLICATION_MCP.md).

## CI and release verification

\`\`\`sh
node --test tests/agent-capabilities.test.mjs
npm run check
npm test
\`\`\`

The public static full-route release verifier includes \`/agents.json\`. GitHub Pages must deliver bytes matching the reviewed source, not merely an HTTP 200 response. This release check proves content delivery only, never provider compatibility, signed agent identity, automated article acceptance, indexing or availability of a hosted write API.

**Rollback:** revert the public manifest and its links/tests; run a new verified Pages release. No private repository, database, tokens or production credentials are touched.
