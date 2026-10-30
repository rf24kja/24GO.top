# Organic discovery measurement: evidence gates (2026-10-30)

This is a **prelaunch measurement protocol**, not a traffic report. It complements [Growth Experiments](GROWTH_EXPERIMENTS.md) and [Editorial Search Discovery Plan](EDITORIAL_SEARCH_DISCOVERY_PLAN.md).

## Separate signals, never conflate them

| Signal | Acceptable evidence | Not evidence |
| --- | --- | --- |
| HTTPS availability | Independent GET with final URL, status, UTC time and response content type | A green build alone |
| Search index inclusion | Search Console URL Inspection or Bing URL Inspection for the exact canonical URL and date | A sitemap entry or successful fetch |
| Search impressions/clicks | Dated, property-scoped Search Console/Bing Webmaster report with query/page filters | GitHub traffic, server hits, or estimates |
| Unique visitors | Consent-appropriate first-party analytics with documented counting method and exclusions | Requests, bot crawls, or GitHub clones |
| RSS subscribers | Privacy-respecting, deduplicated subscriber measurement with known limitations | RSS endpoint hits |
| AI citations | Reproducible dated answer captures with exact model/product, query, linked source and caveats | A page being crawlable or an AI crawler request |

## Per-release checklist

1. Pin public `main` SHA and the Pages workflow run and artifact. Confirm no private Core code is included.
2. Independently fetch the deployed HTTPS homepage, `robots.txt`, `sitemap.xml`, `engineering/feed.xml`, and each newly added canonical article URL. Record status, redirects, MIME type and final URL.
3. Validate sitemap locs against canonical URLs, no accidental `noindex`, Article JSON-LD only for real published editorial articles, and working internal navigation. A successful check does **not** prove indexing.
4. For any original engineering article, link source PR, successful CI and reproducible commands. Record limitations, date, and original language; do not invent translations.
5. Record measurements as `unavailable` until verified access to the relevant reporting property exists. Never substitute estimates or fabricate search positions.
6. If any gate fails, create an Issue with reproducible evidence and a rollback path; do not declare the release verified.

## Experiment log template

- Date (UTC), public commit SHA, Pages run URL, independent live-check URL
- Hypothesis, single change, target reader, expected outcome (clearly a target)
- Observed index status, impressions, clicks, unique visitors, RSS subscribers, AI citations (each independently sourced or `unavailable`)
- Confounders and privacy limitations; decision: continue / revise / stop

**Cost:** no new vendors, analytics cookies or paid tooling required for this protocol. **Rollback:** revert this documentation PR. No live configuration, production Auth, DNS or private hosted Core changes.
