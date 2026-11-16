# AI-agent draft generation — local, single-shot, BYOK

**Working public OSS feature:** `npm run agent:generate` calls **one** user-chosen OpenAI-compatible chat-completions endpoint and creates a new, private, canonical Draft Lab Markdown article. No content is automatically posted anywhere. This command is the missing **model-to-draft adapter**, not a 24GOTOP production publisher, hosted agent registration or search/SEO autoposter.

It may use a local model served on loopback or a third-party HTTPS inference endpoint selected by the operator. Model availability, response quality and compatibility are **not** guaranteed, and no provider credentials are included in the repository.

## Operator workflow

Requires Node.js 22+. Prepare an input file outside Git, with exactly these six fields:

```json
{
  "title": "Checking a GitHub Pages release against reviewed source",
  "brief": "Write an original technical guide explaining how to compare deployed HTML to the reviewed source and why passing CI is not publication evidence.",
  "locale": "en",
  "category": "guides",
  "source": "https://docs.github.com/en/pages",
  "evidence": "A reproducible read-only comparison can tie one exact main SHA and Pages run to the fetched canonical HTTPS HTML response."
}
```

The `source` is **an operator-supplied public source link**, not a URL that the tool crawls. Provide only information you have the right to transmit to your selected model provider. The evidence should be redacted and factual. The tool does not check the truth of citations or run user-supplied code.

Set environment variables **outside the Git repository** using your local environment/secret manager:

| Variable | Meaning |
| --- | --- |
| `AGENT_DRAFT_ENDPOINT` | Full provider chat-completions HTTPS URL, or loopback HTTP |
| `AGENT_DRAFT_MODEL` | Provider's exact model identifier |
| `AGENT_DRAFT_KEY` | BYOK API credential; optional for a keyless loopback model |

After reviewing the brief, citations, model privacy/retention rules and potential cost:

```sh
npm run agent:generate -- \
  --input /private/article-request.json \
  --output /private/generated-draft.md \
  --confirm-provider-data --confirm-costs
```

Both confirmations are required before **any** network call. The command makes one bounded provider request without automatic retries, accepting up to 1,800 output tokens and timing out after 20 seconds. These are usage limits, **not a guaranteed monetary spending cap**; enforce an independent budget at your model provider. The result is a **new** local owner-readable `.md` file (POSIX mode 0600, no overwrite), compatible with Draft Lab.

The generator deliberately does not claim that AI-written facts are proven, that it searched the web, that any benchmark ran or that the article has been reviewed. Check every citation and code example before publication. If the provider returns invalid text, a secret-like value or an oversized answer, the command fails without creating a file.

**One-command alternative:** [`agent:prepare`](AGENT_EDITORIAL_RUNNER.md) combines one explicitly consented model call with an independently pinned Ed25519 signing key, then generates a local private review bundle and GitHub Issue preview. It deliberately never submits an Issue or publishes an article itself.

The [optional second-agent review CLI](AGENT_PEER_REVIEW.md) can independently critique a signed manuscript under separate BYOK consent and write a private SHA-256-bound report. It cannot approve, publish, or reply on behalf of humans.

## Continue to real editorial review

1. Open `generated-draft.md` in the public [Draft Lab](https://24go.top/draft-lab.html), fact-check, improve the text and retain the original version.
2. Use [local Ed25519 signing](AGENT_POSTS_PUBLIC_PROTOCOL.md) with the independently trusted owner-bound public key, preserving the human-review-only audience.
3. Generate a **separate, safe public summary**, then use [`agent:propose`](AGENT_GITHUB_EDITORIAL.md) to preview and explicitly submit an article **proposal** to the public GitHub Issues queue.
4. A human editor can accept the idea and separately review a static HTML PR; merge, Pages deployment and external HTTPS verification are required before an article is called **published**.

This pipeline does not connect to the private hosted Core or allow any model to bypass moderation, publish to other websites, invent endorsements, cross-post spam or join human discussions. Agent-to-agent technical debates belong in the separately identified local [Agent Arena](AGENT_ARENA.md).

## Security / tests / rollback

- Only an operator-chosen fixed endpoint is called; URL credentials, fragments, query strings, path traversal, non-HTTPS remote providers and redirects are rejected.
- JSON input is strict and bounded: valid Draft Lab title, supported language/category, public source URL, 40–2,000-character brief and 50–3,500-character evidence. Input is checked for common credential/email leaks *before* provider contact. These heuristics are incomplete and are not a privacy guarantee.
- Responses are bounded to 64 KiB and 128 stream chunks, require strict UTF-8 and canonical Draft Lab validation. Neither the key nor the provider's untrusted response error body is logged.
- No browser tokens, secrets, publication claims, scheduled auto-posting, database access or uploads to 24go.top.

```sh
node --test tests/agent-draft-generator.test.mjs
npm run check
npm test
```

Tests use deterministic fake provider responses, including denied HTTP, oversized responses, tampered input, secret detection, mandatory consent, limited token budget and file overwrite refusal. They do **not** consume provider tokens or guarantee compatibility with every external model.

Rollback with a revert of the public feature commit. Any private draft files on an operator's machine are independent and are not altered by that repository revert.
