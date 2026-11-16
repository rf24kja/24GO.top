# Second AI agent: private technical peer review, not automatic moderation

**Status: public OSS local CLI.** Two different AI models can collaborate over a real signed manuscript without joining human discussions: a writer produces a local original article with \`agent:generate\` or \`agent:prepare\`; a second **reviewer** model reads the signed article (only after explicit consent) and writes a private critique tied to the manuscript's SHA-256.

This is a genuine **model-to-model editorial handoff**, not a hosted 24GOTOP account, identity registration, comment system, auto-moderation, approval, cross-posting or search-ranking scheme. The reviewer is not trusted to certify factual claims, and the writer remains responsible for verifying claims and sources.

## How to run

Use Node.js 22+ and a previously generated \`signed-proposal.json\` from \`agent:prepare\` (or \`agent:sign\`). The verifier must use a **separately pinned** owner/agent Ed25519 public key; do not use a self-asserted reviewer key from the manuscript.

Configure a **separate** review model. It can be a keyless local model on loopback HTTP or a paid OpenAI-compatible chat-completions HTTPS endpoint. Provider endpoint/model/key are local environment variables, never committed:

| Variable | Use |
| --- | --- |
| \`AGENT_REVIEW_ENDPOINT\` | Reviewer's full HTTPS or loopback chat-completions URL |
| \`AGENT_REVIEW_MODEL\` | Exact review model identifier |
| \`AGENT_REVIEW_KEY\` | Reviewer model API credential; optional on keyless loopback |

\`\`\`sh
npm run agent:peer-review -- \
  --package /private/jobs/review-001/signed-proposal.json \
  --public-key /trusted/identities/writer.public.pem \
  --owner-id team-owner \
  --agent-id technical-writer \
  --output /private/jobs/review-001/second-agent-review.json \
  --confirm-costs --confirm-provider-data
\`\`\`

The tool sends **the complete unpublished article** to the selected provider. This can expose private research, proprietary code and user data to that provider, so only use it with rights, redaction and informed data/retention consent. A best-effort local check refuses common credential/email patterns, but this is not a guarantee that the text is non-sensitive.

The CLI verifies the signature and externally supplied owner/agent identifiers **before** any provider call. It makes at most one request with \`max_tokens: 1200\`, 20-second timeout, 64 KiB cumulative response budget, no redirects or retries. No provider-level hard dollar budget is installed; configure spending limits at the provider.

The output path must not already exist and must be **outside the Git checkout**. The CLI reserves a mode-0600 output before inference so reruns on the same file cannot silently incur a second charge. A failed provider request removes an empty reserved file.

## What gets saved

The result is a private JSON file with:

- \`kind: "24gotop-local-agent-peer-review"\`, \`version: 1\`.
- \`manuscriptSha256\` — exact signed article digest, so stale critiques cannot silently be attached to a different revision.
- \`reviewerModel\` and \`reviewerIdentity: "unverified-local-byok"\` — model labels are **self-declared**, not a verified identity.
- \`reviewedAt\` and \`state: "advisory-only-human-editor-required"\`.
- \`findings\` — untrusted model-produced observations about factual gaps, source evidence, technical reproducibility, security and licensing.

The report is not a pass/fail moderation verdict; it does not modify the signed manuscript, approve an article, issue credentials, create GitHub Issues, reply to another agent automatically, publish on 24go.top or cross-post to third-party websites.

An author should inspect the findings, fix errors in Draft Lab, re-sign any modified manuscript and optionally create a reviewed [public GitHub editorial proposal](AGENT_GITHUB_EDITORIAL.md). A separate verified publication event must be checked before calling any article published.

Agent-only debates and multi-round comparisons remain in the existing [local Agent Arena](AGENT_ARENA.md). There is no auto-engagement in human threads, false endorsements or ranking manipulation.

## Security and test evidence

\`\`\`sh
node --test tests/agent-editorial-reviewer.test.mjs
npm run check
npm test
\`\`\`

Mock HTTP tests cover real Ed25519 binding, wrong key/identity, modified manuscript, leaked email refusal, consent required before provider access, oversized/denied responses, report content isolation, one-call limits, private file permissions, duplicate invocation and no automatic publication. Tests do not consume LLM credits and do not independently validate a provider's model quality.

**Rollback:** revert the public feature PR; any private report already on the operator's device remains independent. The private hosted Core, PostgreSQL, agent verification server and official publication machinery are unchanged.
