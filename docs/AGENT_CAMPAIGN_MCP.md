# Local multi-agent campaign workspace MCP

**Status: local PUBLIC OSS workflow.** This MCP gives separate local AI agents a shared, private task queue and message board for preparing one evidence-led article about an operator-selected website. It is designed for researcher, strategist, writer, SEO editor, fact-checker and editorial reviewer agents.

It is not a hosted agent network. The workspace runs on the operator's machine, persists in a private directory and exposes no public endpoint. Agent IDs in messages are self-asserted local labels, not verified 24GOTOP identities.

## What the workflow does

1. The operator creates a campaign with a public HTTPS target URL, audience, goal, product facts, prohibited claims and an exact relationship disclosure.
2. A research agent claims the first task and submits at least two public source references with relevant excerpts and supported claims.
3. A strategist receives the research artifact and submits a reader-first angle, search intent, outline, title and public summary.
4. A writer receives the prior artifacts and submits a canonical Draft Lab article.
5. An SEO editor reviews usefulness, structure, intent and the contextual link.
6. A fact-checker reviews claims against the supplied source set. Its verification is agent-reported, not independently certified by this MCP.
7. An editorial reviewer checks originality, privacy, attribution and rights. A ready result must explicitly report all three checks.
8. If any review requests changes, a writer receives a revision task. The pipeline restarts at SEO review. At most two revisions are allowed before operator intervention.
9. After all agent stages report ready, the finalization tool signs a private article package and calculates the exact publication digest.
10. The operator inspects the full private draft and sources, then uses the separate Article Publication MCP to create a public DRAFT PR. A human reviews and merges it; the normal Pages deployment and HTTPS checks follow.

Agent review is advisory. It does not replace human review, source verification or publication approval.

## Local setup

Use Node.js 22+ and a clean, current clone of rf24kja/24GO.top.

Create a private state directory and owner-pinned Ed25519 identity outside the repository:

~~~sh
mkdir -p "$HOME/.config/24gotop" "$HOME/.local/share/24gotop-campaigns"
chmod 700 "$HOME/.config/24gotop" "$HOME/.local/share/24gotop-campaigns"

npm run agent:keys -- \
  --private-out "$HOME/.config/24gotop/campaign-publisher.private.pem" \
  --public-out "$HOME/.config/24gotop/campaign-publisher.public.pem"
~~~

The private key must be owner-only (0600). The state directory must be owner-only (0700). The public key must be pinned independently to the expected owner and publisher-agent IDs. On Windows, review NTFS ACLs; POSIX mode bits are not an ACL substitute.

Configure a **worker process** for each local agent client. Every worker points at the same private state directory and receives no signing key. Configure one separate **publisher process** for the operator only; it shares the state directory but receives the owner-pinned signing key. The browser helper offers both modes:

~~~json
{
  "mcpServers": {
    "24gotop-local-campaign-workers": {
      "command": "node",
      "args": ["/absolute/path/to/24GO.top/packages/mcp/campaign-stdio.mjs"],
      "env": {
        "MCP_CAMPAIGN_STATE_DIR": "/home/user/.local/share/24gotop-campaigns"
      }
    }
  }
}
~~~

The operator-controlled publisher uses the same state directory and is the **only** process that receives the signing key:

~~~json
{
  "mcpServers": {
    "24gotop-local-campaign-publisher": {
      "command": "node",
      "args": ["/absolute/path/to/24GO.top/packages/mcp/campaign-stdio.mjs"],
      "env": {
        "MCP_CAMPAIGN_STATE_DIR": "/home/user/.local/share/24gotop-campaigns",
        "MCP_CAMPAIGN_PRIVATE_KEY": "/home/user/.config/24gotop/campaign-publisher.private.pem",
        "MCP_CAMPAIGN_PUBLIC_KEY": "/home/user/.config/24gotop/campaign-publisher.public.pem",
        "MCP_CAMPAIGN_OWNER_ID": "founder-team",
        "MCP_CAMPAIGN_PUBLISHER_AGENT_ID": "campaign-publisher"
      }
    }
  }
}
~~~

Do not put provider keys, GitHub tokens, private client material or credentials in campaign fields. The campaign MCP itself makes no model requests and does not need a provider API key. Each worker agent uses its own configured model/tools. Worker processes do not expose the finalization tool. Only the separate operator-controlled publisher process loads the Ed25519 private key and can finalize a reviewed campaign. The worker configuration omits the key path, but this is not an OS sandbox: an agent with unrestricted shell/file access under the same operating-system account may still read files available to that account. For stronger isolation, run worker agents under a restricted OS account or sandbox that cannot access the publisher key directory, and run the publisher separately.

The browser helper at https://24go.top/agents/ can generate this non-secret local configuration.

## MCP tools

| Tool | Purpose |
| --- | --- |
| create_promotion_campaign | Create one private campaign and its first research task. |
| list_campaigns | Discover recent campaigns and resume work after a client restart. |
| claim_campaign_task | Claim the next queued task for a role and receive the prior artifacts. |
| submit_campaign_task_result | Submit a role-specific result and automatically create the next task. |
| release_campaign_task | Return an unfinished task to the queue with a blocker reason. |
| send_campaign_message | Send a private handoff, question, finding or blocker to an agent or the whole team. |
| read_campaign_messages | Read directed and broadcast messages, optionally from a message cursor. |
| get_campaign_status | Inspect task states, roles, attempts, prior artifacts and campaign readiness. |
| finalize_campaign_article | Create a private owner-signed article package after all review stages are ready. |

### Campaign brief

create_promotion_campaign requires:

- campaignName, targetSiteName, and a canonical public targetUrl (HTTPS, without credentials, query or fragment).
- audience and goal.
- productFacts: facts supplied and approved by the operator.
- prohibitedClaims: claims the agents must not make.
- relationshipDisclosure: the exact disclosure sentence that must appear once in the article body.
- topic: a working title, the reader's problem and the proposed angle.

One campaign creates one article. Create separate campaigns for distinct topics. Duplicate active target/topic pairs are rejected. The system does not invent product features, customer results or commercial relationships.

### Task handoff and result formats

Every agent first calls claim_campaign_task with campaignId, its role and a local agentId. A claim returns the campaign brief, prior artifacts, role-specific task instructions and a private lease token; it expires after 15 minutes. Submit with the same agent ID and token. An expired task can be reclaimed; there are at most three attempts. Use release_campaign_task when an agent cannot complete the work.

submit_campaign_task_result validates the exact result structure for the claimed stage:

**Researcher**

~~~json
{
  "summary": "A bounded summary of the evidence and what it does not establish.",
  "sources": [
    {
      "url": "https://example.org/documentation",
      "title": "Public documentation title",
      "excerpt": "A short relevant excerpt from the source.",
      "supports": "The specific factual point this source supports."
    },
    {
      "url": "https://www.w3.org/WAI/fundamentals/accessibility-intro/",
      "title": "Accessibility introduction",
      "excerpt": "A second short relevant excerpt from a public source.",
      "supports": "The specific accessibility point this source supports."
    }
  ]
}
~~~

The tool stores source excerpts and URLs; it does not fetch or certify that a source was read. The next agent must treat them as research claims and check the original sources independently.

**Strategist**

~~~json
{
  "angle": "A reader-first angle grounded in the research and campaign facts.",
  "searchIntent": "The informational question the article answers.",
  "outline": "## Section one\n## Section two\n## Section three",
  "suggestedTitle": "A descriptive article title",
  "publicSummary": "An accurate public summary between 80 and 320 characters."
}
~~~

**Writer and revision agent**

~~~json
{
  "title": "A descriptive article title",
  "body": "## First section\n\nOriginal, useful article text...",
  "category": "guides",
  "source": "https://example.org/documentation",
  "publicSummary": "An accurate public summary between 80 and 320 characters."
}
~~~

The article must pass the existing Draft Lab validation, use one source from the research task, contain the target URL exactly once as a contextual link, and include the exact relationship disclosure exactly once. Prohibited claims, credentials and email addresses are rejected by the local checks. These heuristics do not prove that a manuscript is safe or accurate.

**SEO editor**

~~~json
{
  "decision": "ready",
  "findings": "Specific findings about usefulness, intent, title, structure and contextual link."
}
~~~

Use decision "changes_requested" when concrete corrections are needed. An optional suggestedTitle may be included.

**Fact-checker**

~~~json
{
  "decision": "ready",
  "findings": "What was checked and what remains uncertain.",
  "unsupportedClaims": [],
  "agentReportedVerifiedSourceUrls": ["https://example.org/documentation"]
}
~~~

A ready result requires at least one source URL from the research task and no unsupported claims. The URLs remain agent-reported, not externally certified.

**Editorial reviewer**

~~~json
{
  "decision": "ready",
  "findings": "Originality, privacy, source attribution and rights findings.",
  "rightsReviewed": true,
  "privacyReviewed": true,
  "sourceAttributionReviewed": true
}
~~~

A ready result requires all three booleans to be true. They are still claims made by a local agent, not a human approval.

If any reviewer chooses changes_requested, the writer receives a revision task with the findings in its prior artifacts. A revision must change the manuscript. After two revision cycles, the campaign moves to needs-operator.

## Private agent messages

Use send_campaign_message for a handoff, question, finding or blocker. Messages can be directed to one local agent or broadcast to the campaign team. read_campaign_messages filters by the agent ID and supports an afterMessageId cursor.

Messages and artifacts are private local state. No messages are posted to public Issues, site comments, forums, social networks or human discussion threads. Local agent IDs are labels only and are not authenticated identities.

## Finalize and publish separately

After the editorial reviewer reports ready, inspect get_campaign_status and call:

~~~json
{
  "campaignId": "the-campaign-uuid",
  "publicationTime": "2026-11-17T17:00:00Z",
  "confirmPrivateFinalization": true
}
~~~

Choose a real UTC time later than the current engineering-feed item. The existing publication validator accepts a timestamp no more than 24 hours in the past and no more than five minutes in the future, so finalize near the intended publication time; a delayed PR merge may require a refreshed package. The server checks the current clean main checkout, signs with the owner-pinned Ed25519 identity and writes these owner-only files under the campaign workspace:

- draft.md — complete Draft Lab manuscript.
- signed-proposal.json — owner-signed local handoff.
- public-summary.txt — public article summary.
- issue-preview.json — local-only editorial preview.
- receipt.json — campaign, source SHA, manuscript digest, publication digest and pending-review state.

The response includes the exact publicationSha256, sourceMainSha, canonical URL and file paths. It always reports published: false and submitted: false.

Use the returned signed-proposal.json, public key, summary, publisher owner/agent IDs and publication time to configure the separate Article Publication MCP (docs/AGENT_ARTICLE_PUBLICATION_MCP.md). Preview first. Only after inspecting the complete package should the operator separately enable its exact-digest-approved DRAFT PR write with a repository-scoped token. The DRAFT PR is public; a human must review and merge it.

## Storage, concurrency and limits

- State and message files are private, outside the repository, and bounded to 8 MB.
- Short state transactions use an exclusive lock file so separate local MCP processes can share the same directory without overlapping writes.
- If a process crashes while holding the lock, the next request fails closed. After confirming that no campaign MCP process is running, the operator may remove .campaigns.lock manually.
- Campaign task leases expire after 15 minutes and allow at most three attempts.
- One campaign produces one article; each campaign permits at most two writer revision cycles.
- No model request, external fetch, GitHub API call, automatic PR, auto-merge, Pages deployment, social posting, comments, backlink exchange or synthetic engagement occurs in this MCP.

## Tests

~~~sh
node --check packages/agents/campaign-workspace.mjs
node --check packages/mcp/campaign-stdio.mjs
node --test tests/agent-campaign-workspace.test.mjs tests/agent-campaign-mcp.test.mjs
npm run check
npm test
~~~

Tests use temporary private directories and real Ed25519 keys. They cover role handoffs, leases, cross-agent messages, source and disclosure constraints, review/revision transitions, private bundle creation, digest/signature checks and fail-closed behavior. They do not use a live model provider or public GitHub token.
