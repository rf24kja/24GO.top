# Public crawlability and indexing — verified 2026-10-31

## Crawlable contextual article navigation (2026-10-31)

The ten **existing** source-reviewed engineering notes now have an accessible static `Continue reading` section after each article's main researched body. It links to exactly two other verified notes (first the closest topic match, then a neighboring published note in RSS order), plus the full archive. This is an aid to readers and a clean internal link graph; it is not a ranking guarantee or synthetic popularity claim. Links remain ordinary HTML when scripts are disabled, and are outside the `<article>` block so the independently validated full-text index remains unchanged.

The generator reads the verified RSS/Article JSON-LD-backed JSON Feed and the archive's existing topic categories, checks the approved canonical inventory, escapes link text, and refuses duplicates, foreign URLs or stale files. Run `npm run related:write` after reviewing new source articles, then `npm run related:check` (also included in `npm run check`) and `npm test`. Post-Pages external HTTPS smoke checks that every sitemap-listed technical article actually delivers its static related-reading links. No dynamic recommendation engine, agent interaction, tracking, generated articles or backend privileges.

**Rollback:** revert the static article navigation, generator, styles, npm script/tests and source notes in one public commit; restore last green Pages artifact. Indexing, impressions, retention and AI citations must still be measured separately.


## Deterministic source-verified sitemap — 31 October 2026

The public static `sitemap.xml` is now produced by `npm run sitemap:write`, and checked with `npm run sitemap:check` as part of `npm run check`. The generator takes eight reciprocal canonical homepage languages, three explicit public editorial/navigation pages and published engineering RSS entries validated against the exact visible Article JSON-LD, dates, bylines and canonical URLs. It refuses forged domains, repeated URLs, missing canonical/h1, broken reciprocal hreflang and unindexable `noindex` pages; browser-only Draft Lab remains excluded. It does not crawl file-system uploads, invent timestamps, use API credentials or call external services.

To publish a new reviewed article: add article HTML with visible canonical metadata and verified JSON-LD, update RSS and the archive, run `npm run feed:write`, `npm run search:write` and `npm run sitemap:write`, run `npm run check && npm test`, then review and deploy only the `site/` Pages artifact. If an output is stale, CI fails. This change verifies consistency of **published source**, not Google/Bing indexing or AI answer citations. Revert the generator, scripts, sitemap and tests for rollback; no database migration.


## Canonical WebSite identity source merged and static Pages released — 31 October 2026

The public English canonical homepage declares a minimal inert `schema.org/WebSite` JSON-LD entity with the verified project brand, canonical root URL, matching meta description and eight real language versions. Regression tests check on-disk locale HTML, reciprocal homepage hreflang and the sitemap. The change does NOT invent user adoption, reviews, registered-organization status or an unavailable public search endpoint. It does not claim Google indexing, rankings, impressions or AI citations.

**Release evidence:** public [PR #126](https://github.com/rf24kja/24GO.top/pull/126), exact merged `a87310ba5f432dcb1546a997742a4deb48cc58e3`, [public Pages deploy #41203226060](https://github.com/rf24kja/24GO.top/actions/runs/41203226060), [post-deploy external SEO audit #41203265026](https://github.com/rf24kja/24GO.top/actions/runs/41203265026) and [Draft Lab smoke #41203265114](https://github.com/rf24kja/24GO.top/actions/runs/41203265114) all passed. The previous external SEO audit validated canonical URLs and site delivery but **did not explicitly assert WebSite JSON-LD**; this follow-up adds that specific live assertion. Do not report live markup verified until the updated probe actually passes.

This is a modest **site-name clarity** measure, not a GEO hack. Google Search Central: https://developers.google.com/search/docs/appearance/site-names and https://developers.google.com/search/docs/fundamentals/ai-optimization-guide. Public Pages deploy and HTTPS verification must be measured separately from PR CI.


**Latest verification (31 October 2026): all 21 canonical sitemap URLs, including ten original engineering articles and eight homepage locales, were reachable over HTTPS from a GitHub-hosted runner.** [External SEO audit #41174110459](https://github.com/rf24kja/24GO.top/actions/runs/41174110459) checked the sitemap-driven URLs, RSS, JSON Feed and redirect behavior. [Post-deploy live asset smoke #41174110445](https://github.com/rf24kja/24GO.top/actions/runs/41174110445) also passed. Google/Bing indexing, search impressions and AI citations remain **UNVERIFIED**.

**Historical 30 October checkpoint:** all 12 then-listed sitemap URLs, including nine original engineering articles, were reachable from GitHub-hosted infrastructure; do not treat those old counts as current. This proves HTTP delivery at that time, not search traffic or AI citations.

## JSON Feed 1.1 — now available over verified HTTPS

Published public `/engineering/feed.json` is a standard alternative to RSS for programmatic readers. It derives real article URLs, bylines and dates from source-controlled RSS and `Article` JSON-LD, with a source parity CI gate. Its actual public HTTPS delivery is confirmed by audit #41174110459. Google/Bing indexing, rankings, visitors and AI search citations are **not confirmed** by an HTTP response.

## Source-verified assets
- Canonical policy: https://24go.top (**owner settings and live routing independently verified on 2026-10-29**).
- Public root `site/robots.txt`, XML sitemap `site/sitemap.xml`, optional `site/llms.txt` (not an SEO ranking mechanism).
- **Historical 30 October:** editorial `site/engineering/` held **nine** original static technical notes, metadata, HTML navigation, RSS, unique canonical URLs; all nine appear in the **12-URL** source sitemap (home, progress, archive and nine articles).
- The experimental `site/draft-lab.html` intentionally retains its `noindex,follow` metadata and is excluded from sitemap.
- No fake translations, unverified `hreflang`, invented review stars, paid backlinks, synthetic traffic or fake public publishing API.

## Verified transport and pending search-engine evidence

1. **DONE:** HTTPS, certificate and Pages canonical domain independently checked by [Pages audit](https://github.com/rf24kja/24GO.top/actions/runs/40882729744).
2. **DONE:** Nine sitemap pages, `/robots.txt`, RSS, HTTP 301 redirects and article path/query preserved by [live audit](https://github.com/rf24kja/24GO.top/actions/runs/40886701790).
3. **PENDING:** In Google Search Console, verify the domain and use URL Inspection for home and article URLs; submit `https://24go.top/sitemap.xml` and record the actual index status.
4. **PENDING:** In Bing Webmaster Tools, verify ownership and submit the same sitemap; record observed coverage.
5. **PENDING:** Record dated real impressions/clicks/AI-search citations only when measured; site availability and `site:` queries alone never guarantee indexing.

Official evidence: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap and https://developers.openai.com/api/docs/bots.

**Environment note:** Direct HTTP/DNS verification was unavailable from the assistant runtime, including unrelated sites; do not mistake that constraint for proof of the domain's global outage. No DNS or Pages settings were modified.

## External crawlability verification workflow — 2026-10-29

The new [External SEO availability audit](https://github.com/rf24kja/24GO.top/actions/workflows/seo-live.yml) uses a GitHub-hosted Linux runner to verify DNS/TLS and HTTP delivery of the actual canonical `https://24go.top` pages, sitemap, robots and RSS, plus permanent-host routing expectations from www and HTTP variants. It is read-only, on-demand + scheduled daily **and after successful Pages deployment**, with short bounded retries, no credentials and no paid monitoring services.

**A green run is evidence that these public URLs responded from that runner at that time, not that Google/Bing indexed them or AI systems recommend them.** If the check is red, preserve its log and review [Issue #59](https://github.com/rf24kja/24GO.top/issues/59) before changing DNS/HTTPS/Pages settings. The check intentionally fails for a wrong www/apex redirect or unexpected canonical, rather than silently passing by accepting a duplicate host. In particular, the GitHub Pages deployment's `http://www.24go.top/` reported environment URL needs independent confirmation.

## Source-backed API credential article — 2026-10-29

- Added `javascript-sdk-api-key-leak-prevention.html` with a reproducible local SDK key-recipient test, strictly tied to public PR #56 and existing JavaScript SDK tests. No private code, real API keys or production Auth claims.
- Added index/home navigation, RSS entry, canonical and XML sitemap location. The article is editorial static HTML, not a user-created hosted post.
- Independent GitHub-hosted HTTP audit on commit `42adc9ab0275d8f169f416cbea9480dd2f1e549d` observed that `https://24go.top/` **redirects to `https://www.24go.top/`**, contradicting the approved apex canonical. See [failure run](https://github.com/rf24kja/24GO.top/actions/runs/40879899999) and [Issue #59](https://github.com/rf24kja/24GO.top/issues/59). No domain settings changed. This is a demonstrable canonical mismatch, not a claim that the HTTPS site is globally down.


## Independent live evidence — 2026-10-29

An actual GitHub-hosted Ubuntu runner completed full HTTP/TLS/content checks in [External SEO availability audit #40881090465](https://github.com/rf24kja/24GO.top/actions/runs/40881090465): all **nine** sitemap-listed public pages (home, progress, engineering index, six engineering articles) returned the expected HTML with self-referential canonical tags; `robots.txt` and RSS returned their expected content. This includes the newly published SDK credential safety guide. The Pages deployment for that article succeeded independently in [run #40880803877](https://github.com/rf24kja/24GO.top/actions/runs/40880803877).

**Historical pre-fix canonical behavior (resolved on 29 October) was independently observed:** every `https://24go.top/*` probe redirects to corresponding `https://www.24go.top/*`, while the editor-approved canonical host, sitemap, HTML metadata and RSS all say `https://24go.top`. Both `http://24go.top/` and `http://www.24go.top/` ended at `http://www.24go.top/`, rather than being forced onto HTTPS. These conditions caused the **first audit attempt** to fail, but the owner corrected Pages settings and [the later audit #40886701790](https://github.com/rf24kja/24GO.top/actions/runs/40886701790) passed. [Issue #59](https://github.com/rf24kja/24GO.top/issues/59) is closed. No DNS changes were needed.

**Still not verified:** actual Google Search Console URL Inspection status, sitemap ingestion, indexed page counts, Bing coverage, search impressions/clicks, or references in AI-generated search results. The first deploy and successful HTTP fetch cannot prove those metrics. Submit/inspect sitemap after the canonical-host mismatch is corrected.

## Read-only owner Pages configuration check — 2026-10-29

A new [GitHub Pages domain settings audit](https://github.com/rf24kja/24GO.top/actions/workflows/pages-settings-audit.yml) queries GitHub's `GET /repos/rf24kja/24GO.top/pages` endpoint using the standard short-lived Actions token with **Pages read** and **Contents read** permission. It exposes only the public CNAME, HTML URL, deployment state, HTTPS enforcement and certificate state; no key/token/response dump is printed. It **never PATCHes or changes** Pages, DNS, HTTPS or production. It fails if the Pages `cname` is not exactly `24go.top` or `https_enforced` is not true. See [official GitHub Pages guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

**Important:** for GitHub Actions publishing, committing a `CNAME` file does not override the custom domain setting; GitHub explicitly documents that Pages ignores this file for Actions deployments. Repairing any Pages custom domain mismatch requires a separate reviewed owner-approved configuration change and subsequent external redirect audit.

## Exact Pages remediation

The completed root cause, owner settings change and rollback procedure are documented in [DOMAIN_RECOVERY_RUNBOOK.md](DOMAIN_RECOVERY_RUNBOOK.md). Free GitHub Pages HTTPS is now active; there is no pending Namecheap or DNS repair.

## Verified Pages settings and canonical URLs — 2026-10-29

The founder enabled correct Pages settings and our [configuration audit attempt 2](https://github.com/rf24kja/24GO.top/actions/runs/40882729744) returned **PASS**: `cname=24go.top`, `https_enforced=true`, `html_url=https://24go.top/`, approved certificate for both apex and www. [External content audit attempt 2](https://github.com/rf24kja/24GO.top/actions/runs/40881090465) returned **PASS** for all nine sitemap URLs, robots, RSS and final HTTP/www redirects to HTTPS apex. Earlier failures remain in original Actions logs as historical evidence, not current configuration. [PR #70](https://github.com/rf24kja/24GO.top/pull/70) added first-hop HTTP 301 and article path/query verification; the [post-merge live audit #40886701790](https://github.com/rf24kja/24GO.top/actions/runs/40886701790) passed and [Issue #59](https://github.com/rf24kja/24GO.top/issues/59) was closed.

Search Console or Bing index coverage, ranking positions and AI recommendation visibility are **not** established by these tests.

## Source and release-audit reconciliation — 2026-10-30

- **Historical 30 October source snapshot:** public `main` then included **nine** engineering HTML articles, **nine** RSS items and **12** XML sitemap URLs. Current verified totals are 10 / 10 / 21 (31 October audit above). The three newest original guides were merged in [PR #83](https://github.com/rf24kja/24GO.top/pull/83), and metadata/feed parity in [PR #84](https://github.com/rf24kja/24GO.top/pull/84). The existing [Article structured-data test](https://github.com/rf24kja/24GO.top/blob/main/tests/article-structured-data.test.mjs) checks matching visible headings, Article JSON-LD, canonical URLs, RSS publication dates, index navigation and newest-first ordering. This is **source verification**, not search indexing.
- [Pages deployment #40973542565](https://github.com/rf24kja/24GO.top/actions/runs/40973542565) completed after PR #84. [Draft Lab HTTPS check #40973593512](https://github.com/rf24kja/24GO.top/actions/runs/40973593512) also passed, but its scope is the Draft Lab, **not** an independent full check of the three newest article URLs. The earlier full [SEO audit #40894098316](https://github.com/rf24kja/24GO.top/actions/runs/40894098316) predates those additions and must not be used as proof of their delivery.
- The read-only `workflow_run` trigger now follows **successful completion** of the named Pages workflow; it checks every URL actually listed in the deployed sitemap, not a hard-coded historical page count. **Observed:** [External SEO audit #40986751453](https://github.com/rf24kja/24GO.top/actions/runs/40986751453) passed at 2026-10-30 01:35 UTC after merge of [PR #86](https://github.com/rf24kja/24GO.top/pull/86). The job log explicitly reports PASS for **12 sitemap pages**, all nine engineering articles, `robots.txt`, RSS, homepage CSS/JS, canonical self URLs and HTTP/www 301 redirects preserving article path and query. This is the first complete live audit after the three new guides.
- Neither a passing source test nor an HTTPS response proves Google/Bing index coverage, impressions, clicks, RSS subscribers, unique readers or AI answer citations. All remain **unmeasured** without their respective authoritative telemetry. No live DNS/Pages configuration, Supabase or billing was changed.

## Independent full nine-article HTTPS audit — 2026-10-30 01:35 UTC

**PASS:** [External SEO availability audit run #40986751453](https://github.com/rf24kja/24GO.top/actions/runs/40986751453) on public merge SHA `47df3a53ad4dbf07d14b4824dff5d8057f4177f8` checked all **12** live sitemap URLs, including the three new October 30 engineering guides, plus `robots.txt`, RSS, homepage CSS/JS, canonical tags and permanent www/HTTP redirects. Its actual job log reports all checks passing. [Main CI #40986751398](https://github.com/rf24kja/24GO.top/actions/runs/40986751398) also passed.

**Scope:** GitHub-hosted external network observation of HTTP/DNS/TLS and expected HTML at one moment. It does not prove Google/Bing crawling or indexing, Search Console sitemap ingestion, impressions, clicks, AI answer citations, human visitors, RSS subscribers, content accessibility with assistive technology, or production user publishing. Those metrics remain unmeasured; do not publish fabricated results. No DNS, Pages settings, paid monitoring, staging or Supabase changes.
