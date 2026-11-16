# AI-agent editorial job runner — one command, one private review bundle

**Status: working PUBLIC OSS CLI, not a hosted publication service.**

\`npm run agent:prepare\` joins existing 24GOTOP primitives into a real, single-job workflow:

\`\`\`text
approved factual brief + public summary
         ↓ one explicit BYOK/local-model request
private canonical Draft Lab Markdown
         ↓ owner-pinned Ed25519 verification
private signed human-review proposal
         ↓ local, safe GitHub Issue PREVIEW
human fact-check and explicit optional GitHub proposal
         ↓ separately reviewed static HTML PR + Pages checks
publicly verified article (only after actual merge/deployment)
\`\`\`

A completed bundle is a **real local artifact** that can be checked and submitted by its operator. It is **not** a posted article, authenticated 24GOTOP account, production moderation decision or cross-platform promotional campaign. The code does not self-reply, invent community engagement, buy traffic, insert backlinks or silently post to other sites.

## Prepare a job

Requires Node.js 22+ from the public repository. Store all files **outside the Git checkout**; the runner rejects an output directory inside the checkout, including ignored files.

Create a \`job.json\` containing **exactly** these two keys: \`article\` and \`publicSummary\`. The article object uses the existing six-field generator contract, with a source you have the right to cite and evidence you have the right to send to the model provider.

\`\`\`json
{
  "article": {
    "title": "Reproducibly verifying article delivery after a GitHub Pages release",
    "brief": "Explain how to compare reviewed source bytes with the real canonical HTTPS response, and distinguish a green build from a verified delivered page.",
    "locale": "en",
    "category": "guides",
    "source": "https://docs.github.com/en/pages",
    "evidence": "The public release checker can compare source assets byte-for-byte after Pages deployment. It does not claim that search engines indexed the article."
  },
  "publicSummary": "A technical guide to checking a real public website release against its reviewed source. It explains the verification method, limits of CI badges, and how maintainers can reproduce the check without confusing deployment with indexing."
}
\`\`\`

\`publicSummary\` is **human-reviewed, public-only metadata** (80–1,200 characters). It is not generated from the private manuscript or automatically uploaded. Do not put private sources, PII, credentials, GitHub @mentions, unverifiable endorsements, or promotional copy in the summary. Heuristic checks cannot certify data is safe; inspect it yourself.

Create and securely store an Ed25519 agent private/public keypair using the existing \`agent:keys\` command. **Pin the public key to the intended owner/agent independently**; do not accept a public key just because an agent provided it. Use a protected secret manager or owner-only private PEM on POSIX (0600). Review Windows NTFS ACLs separately.

Configure these environment variables only on the operator's machine:

| Environment variable | Meaning |
| --- | --- |
| \`AGENT_DRAFT_ENDPOINT\` | Full chat-completions URL, HTTPS or HTTP loopback |
| \`AGENT_DRAFT_MODEL\` | Exact model identifier supported by that endpoint |
| \`AGENT_DRAFT_KEY\` | Your model API key (omitted for keyless loopback inference) |

Provider data handling, tokens and bills belong to your chosen provider. **Both** \`--confirm-costs\` and \`--confirm-provider-data\` are required on every single run. A 1,800 output-token request limit and 20-second timeout do **not** constitute a dollar spending cap.

Run a single job:

\`\`\`sh
npm run agent:prepare -- \
  --job /private/jobs/job.json \
  --output-dir /private/jobs/review-001 \
  --private-key /private/identities/writer.private.pem \
  --public-key /trusted/identities/writer.public.pem \
  --owner-id team-owner \
  --agent-id technical-writer \
  --confirm-costs --confirm-provider-data
\`\`\`

\`--output-dir\` must **not exist** at the time of the request. This is a deliberate duplicate/cost guard: scheduling the same job with the same path can make only one model call. There are no infinite loops, API retries, periodic background tasks or uncontrolled posting. A scheduling system you control may invoke this bounded command once per approved assignment with a unique output directory. Reusing the same directory must fail without contacting the model.

## Inspect the generated artifacts

A successful command writes an owner-only directory and five new 0600 files:

| File | Contents |
| --- | --- |
| \`draft.md\` | Unpublished canonical Draft Lab Markdown; **private** |
| \`signed-proposal.json\` | Full **unencrypted** signed Markdown and owner/agent handoff metadata; **private** |
| \`public-summary.txt\` | Short, independently reviewed public summary |
| \`issue-preview.json\` | Exact public GitHub Issue headline/body preview; **not posted** |
| \`receipt.json\` | SHA-256, key fingerprint, creation time; explicitly \`submitted: false\`, \`published: false\`, \`awaiting-human-review\` |

The receipt is the **last** file written. An absent receipt is an incomplete job: do not submit its contents. Failure with an empty newly reserved directory cleans that directory; any partially written files are kept for explicit manual inspection, never silently deleted or treated as published.

**Optional second-agent quality check:** after a successful bundle, run [`agent:peer-review`](AGENT_PEER_REVIEW.md) against its `signed-proposal.json`. An independent model can produce a SHA-256-bound private critique, but it cannot rewrite or approve a manuscript, grant authority or publish. Always resolve findings manually before choosing to submit a public proposal.

The runner will **not** submit a GitHub issue itself. A human must verify the generated text, sources, copyright and the exact public summary. To edit the draft, retain the revised canonical file and **re-sign** it using \`agent:sign\` before submission; never claim a signature still covers a changed article.

After review, use the independent existing GitHub proposal command (with repo-scoped GitHub Issues token via a secret manager):

\`\`\`sh
# No network, no submission; examine the exact public preview first.
npm run agent:propose -- \
  --package /private/jobs/review-001/signed-proposal.json \
  --public-key /trusted/identities/writer.public.pem \
  --owner-id team-owner --agent-id technical-writer \
  --summary-file /private/jobs/review-001/public-summary.txt

# Only after factual/legal review, explicit operator consent and
# a scoped GITHUB_TOKEN in the environment:
npm run agent:propose -- \
  --package /private/jobs/review-001/signed-proposal.json \
  --public-key /trusted/identities/writer.public.pem \
  --owner-id team-owner --agent-id technical-writer \
  --summary-file /private/jobs/review-001/public-summary.txt \
  --submit --confirm-public
\`\`\`

An Issue is a **public editorial proposal**; no 24GOTOP account, hosted write API, moderation or publication is granted. A human maintainer may subsequently review a separate HTML article PR. Merging, successful Pages release, byte-exact HTTPS check and rights verification remain the criteria for a public editorial article.

## Security and reproducibility

- Fail closed before a model call if options, job format, source URL, owner/agent IDs, public summary, private key, pinned public key, provider configuration or output location are invalid. There is no arbitrary GitHub destination or user-supplied publish URL.
- The private/public Ed25519 keys must cryptographically match before a paid request. Sensitive manuscript and signing key never enter public GitHub issue preview. Model responses are still untrusted and may be inaccurate.
- No private article, model credential, GitHub token, signed handoff text or model endpoint is included in a receipt or logged on failure. GitHub token is never needed by \`agent:prepare\`.
- Exactly one model API call. If that call fails, it is **not retried automatically**. Reusing the old job directory does not trigger new inference. Ensure a provider-side hard budget; tool token limits are not monetary guarantees.
- No live production database changes, moderation bypass, agent identity enrollment, auto-replies or shared credentials.

Reproduce against built-in mock-provider integration tests:

\`\`\`sh
node --test tests/agent-editorial-runner.test.mjs
npm run check
npm test
\`\`\`

These tests exercise input rejection before network, one real signed Ed25519 handoff from a mocked provider response, independently verified preview, no-clobber duplicate execution, mode 0600 outputs, absent public writes and failed-provider cleanup. Tests neither consume API credits nor prove compatibility with a particular remote model.

**Rollback:** revert the reviewed public source commit. Existing private job directories stay on the operator's device and are not erased by source rollback. Stop any independent external scheduler separately if you have configured one.
