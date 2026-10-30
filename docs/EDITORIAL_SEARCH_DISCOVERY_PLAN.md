# 24GOTOP: search and AI-discovery editorial plan

**Status: 2026-10-30.** Source-backed public editorial strategy, not a claim of traffic, indexing, generative answer citations or production user publishing.

## What is genuinely available today

- One canonical public website: `https://24go.top/`, with static HTML engineering pages under `/engineering/`.
- The public engineering archive, `/sitemap.xml`, `/robots.txt`, `/engineering/feed.xml` and a clearly optional `/llms.txt`. The RSS and sitemap are **not** substitutes for crawlable HTML navigation.
- Three original, source-backed new October 30 guides: independent UI/article languages in Markdown editors, a real GitHub Pages verification race, and safe citation URL rendering. Each links to public merged PRs and reproducible tests, is represented in the archive, homepage, feed and sitemap, and declares its canonical URL.
- `/draft-lab.html` is a useful browser-only writing prototype intentionally **noindex** until there is a stronger reason to index that specific page; it does not publish user articles.

## Search intentions worth serving with actual substance

| Reader question (English examples, not measured search volume) | Existing useful destination | Evidence a reader can verify |
|---|---|---|
| How do I add multiple UI languages to a Markdown editor without corrupting drafts? | `multilingual-markdown-editor-without-losing-drafts.html` | public PR #81, source and tests |
| How do I verify GitHub Pages actually published a new revision? | `verify-github-pages-deploy-not-just-ci.html` | public PRs #79/#82, failed + successful Actions |
| How can I parse Markdown links without executing hostile input? | `safe-markdown-citation-links-without-xss.html` | public PR #78, URL sanitizer and DOM tests |
| How can I make original engineering articles discoverable in AI search? | `discoverable-technical-articles.html` | official Google sitemap and AI-feature docs |
| Why can PostgreSQL INSERT succeed while RETURNING fails? | `postgres-insert-returning-least-privilege.html` | official PostgreSQL manual, example SQL |
| How do I keep a local developer SDK API token off remote hosts? | `javascript-sdk-api-key-leak-prevention.html` | public SDK source and adversarial tests |

These examples are **editorial hypotheses**, not keyword volume estimates. Avoid multiple near-identical pages optimized for query variants.

## Quality release contract for new articles

1. Only publish when a real original lesson, tested PR, bug, benchmark with reproducible methodology, or a clearly labeled research synthesis exists. No mass AI-generated filler or scraped competitor content.
2. Lead with the exact problem and a useful answer; add a concrete example, constraints, failure modes and how a reader can reproduce it. Do not invent companies, authors, installs, usage, funding, Google placement or performance.
3. Name the actual publisher **24GOTOP Engineering** for team-authored content; do not invent individual bylines. Match visible heading/date to JSON-LD `Article`, canonical, OpenGraph and RSS.
4. Keep readable, crawlable server-delivered HTML (not text hidden behind JavaScript); ensure navigation from the engineering index and homepage, canonical self URL, RSS item and sitemap location. Exclude drafts and private services.
5. Link to first-party original evidence and relevant official standards. Include a precise “what is not proven” paragraph. Write human-useful references, not artificial backlinks or mutual-promotion spam.
6. Review source links, accessibility, security, licensing, legal/reputation claims and release boundaries. CI verifies HTML, JSON-LD data, canonical/feed/sitemap parity and presence of real evidence. Pages and independent HTTPS smoke prove public delivery.
7. For actual translated pages, request native-speaker review, publish genuine localized content and localized URL/canonical/hreflang. The eight-language *editor UI* is not eight localized article pages. Do not add speculative language variants.
8. Update/annotate old articles if the implementation materially changed (e.g., the original text-only Markdown preview later gained safe links).

## Measurement: distinguish reality from targets

| Outcome | How to verify | Status now |
|---|---|---|
| Exact public static article delivered | Post-Pages independent HTTPS fetch of canonical HTML | Verify from actual Actions; do not infer from merge alone |
| Page eligible for indexing | HTTP 200, correct canonical and robots, reachable internal links | Source checks; external checks still needed per new article |
| Google indexing, queries, impressions, clicks | Verified Google Search Console site property, URL Inspection and Performance | **Not measured** |
| Bing indexing / search clicks | Verified Bing Webmaster Tools site property | **Not measured** |
| AI answer citation or referral | Reproducible answer URLs/referral logs with privacy safeguards | **Not measured** |
| Real subscribed readers, repeat visits, conversions | Explicit consent-based analytics / RSS reader feedback | **Not measured** |
| Community contributions | Independent GitHub issues, discussions and externally merged PRs | Track actual GitHub actors, not automated account actions |

### Proposed next research and distribution experiments (NOT completed)

- After domain/property access is available, verify Search Console and Bing Webmaster Tools; submit the **existing** sitemap and inspect indexing/coverage of 2–3 representative article URLs. Record exact result dates. No Google/Bing API credentials in GitHub or chat.
- Publish a related next article **only when** a new independently reviewed technical change is merged, with links to the established topic cluster.
- Invite voluntary readers through existing GitHub Discussions and relevant communities when genuinely helpful to them; do not bulk-post unsolicited links in other repositories or simulate reactions.
- Run a real-reader usability pilot on the Draft Lab (Issue #29) and collect anonymized, opt-in corrections; use feedback to inform content/UX instead of assuming traffic guarantees.
- Assess a simple privacy-respecting analytics strategy before deploying cookies or trackers; minimize collection and preserve opt-out.

## Additional interoperable format — JSON Feed 1.1 (source PR; deployment pending)

- A standards-based `/engineering/feed.json` is deterministically built from the already reviewed RSS and each canonical article's `Article` JSON-LD. Every item contains the true title, author, publication time, canonical HTML URL and short summary. It intentionally does not pretend to expose full article text or a new public publishing API.
- `npm run feed:check` rejects stale JSON or drift in editorial source metadata; `npm run feed:write` rebuilds the file after reviewing an article. The homepage and archive advertise the feed; a read-only HTTPS audit will check it after Pages.
- This improves general feed reader and programmatic accessibility, **not Google rank or any guarantee of AI citations**. Google states SEO fundamentals and original, helpful content matter, not special AI markup or llms.txt.

## Why not GEO hacks?

Google's [official AI-search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) says ordinary SEO fundamentals and unique, valuable content remain important. There is **no special AI SEO schema or file required** to become eligible for Google's AI features, and even eligible pages are not guaranteed to be crawled, indexed or cited. `llms.txt` is optional documentation, not a ranking lever. Avoid manufactured citations, forced content chunking, fake awards and mass-produced SEO articles. See [Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article) for supported `Article` properties and consistency requirements.

## Rollback and ownership

Editorial files are public MIT repository content, separate from the founder-owned private hosted core. Content changes use a reviewed public PR with green CI; rollback is a Git revert and a verified Pages redeploy. Do not expose private Supabase configurations, service credentials, staging data or proprietary backend logic in examples.

## Author content preservation and SEO/GEO boundary (2026-10-30 source PR)

The public browser-only Draft Lab now rejects slow asynchronous local Markdown
file imports when the author has already typed, formatted, cleared or selected
a newer file. This prevents losing original unpublished work, a prerequisite
for high-quality source-backed content. It is **not** a search ranking
mechanism, public user post API, AI discovery protocol or evidence of
indexing. Existing canonical HTML, human-readable originals, XML sitemap,
RSS and interoperable JSON Feed remain the public discovery baseline.
