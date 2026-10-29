# Public crawlability and indexing — 2026-10-29

**Public HTML and sitemap accessibility are externally confirmed on 2026-10-29; Google/Bing indexing is NOT confirmed.** Source changes and GitHub Actions success are not a search coverage report.

## Source-verified assets
- Canonical policy: https://24go.top (the founder-selected canonical origin; production DNS/HTTPS still requires external verification).
- Public root `site/robots.txt`, XML sitemap `site/sitemap.xml`, optional `site/llms.txt` (not an SEO ranking mechanism).
- Editorial `site/engineering/`: six original static technical notes, metadata, HTML navigation, RSS, unique canonical URLs; every one appears in the now nine-URL sitemap.
- The experimental `site/draft-lab.html` intentionally retains its `noindex,follow` metadata and is excluded from sitemap.
- No fake translations, unverified `hreflang`, invented review stars, paid backlinks, synthetic traffic or fake public publishing API.

## Pending independent external verification (blocking indexation claims)
1. Confirm `24go.top` resolves and returns HTTP 200 with valid HTTPS from an outside network. Test `www.24go.top` and decide/verify 301/308 forwarding to the canonical apex.
2. Confirm deployed Pages workflow and request exact `/robots.txt`, `/sitemap.xml`, five article URLs and `/engineering/feed.xml`. Ensure bot access does not fail DNS/403/404/CAPTCHA.
3. In Google Search Console, verify the domain and use URL Inspection for home and article URLs; submit `https://24go.top/sitemap.xml`. Record Google-selected canonical and indexed/not indexed reason.
4. In Bing Webmaster Tools, verify ownership and submit the same sitemap; record observed status separately.
5. Record a dated, privacy-aware crawl/index coverage measurement. A successful Pages deploy or `site:` query alone never guarantees indexing.

Official evidence: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap and https://developers.openai.com/api/docs/bots.

**Environment note:** Direct HTTP/DNS verification was unavailable from the assistant runtime, including unrelated sites; do not mistake that constraint for proof of the domain's global outage. No DNS or Pages settings were modified.

## External crawlability verification workflow — 2026-10-29

The new [External SEO availability audit](https://github.com/rf24kja/24GO.top/actions/workflows/seo-live.yml) uses a GitHub-hosted Linux runner to verify DNS/TLS and HTTP delivery of the actual canonical `https://24go.top` pages, sitemap, robots and RSS, plus permanent-host routing expectations from www and HTTP variants. It is read-only, on-demand + scheduled daily, with short bounded retries, no credentials and no paid monitoring services.

**A green run is evidence that these public URLs responded from that runner at that time, not that Google/Bing indexed them or AI systems recommend them.** If the check is red, preserve its log and review [Issue #59](https://github.com/rf24kja/24GO.top/issues/59) before changing DNS/HTTPS/Pages settings. The check intentionally fails for a wrong www/apex redirect or unexpected canonical, rather than silently passing by accepting a duplicate host. In particular, the GitHub Pages deployment's `http://www.24go.top/` reported environment URL needs independent confirmation.

## Source-backed API credential article — 2026-10-29

- Added `javascript-sdk-api-key-leak-prevention.html` with a reproducible local SDK key-recipient test, strictly tied to public PR #56 and existing JavaScript SDK tests. No private code, real API keys or production Auth claims.
- Added index/home navigation, RSS entry, canonical and XML sitemap location. The article is editorial static HTML, not a user-created hosted post.
- Independent GitHub-hosted HTTP audit on commit `42adc9ab0275d8f169f416cbea9480dd2f1e549d` observed that `https://24go.top/` **redirects to `https://www.24go.top/`**, contradicting the approved apex canonical. See [failure run](https://github.com/rf24kja/24GO.top/actions/runs/40879899999) and [Issue #59](https://github.com/rf24kja/24GO.top/issues/59). No domain settings changed. This is a demonstrable canonical mismatch, not a claim that the HTTPS site is globally down.


## Independent live evidence — 2026-10-29

An actual GitHub-hosted Ubuntu runner completed full HTTP/TLS/content checks in [External SEO availability audit #40881090465](https://github.com/rf24kja/24GO.top/actions/runs/40881090465): all **nine** sitemap-listed public pages (home, progress, engineering index, six engineering articles) returned the expected HTML with self-referential canonical tags; `robots.txt` and RSS returned their expected content. This includes the newly published SDK credential safety guide. The Pages deployment for that article succeeded independently in [run #40880803877](https://github.com/rf24kja/24GO.top/actions/runs/40880803877).

**Failing canonical behavior is independently observed, not theoretical:** every `https://24go.top/*` probe redirects to corresponding `https://www.24go.top/*`, while the editor-approved canonical host, sitemap, HTML metadata and RSS all say `https://24go.top`. Both `http://24go.top/` and `http://www.24go.top/` ended at `http://www.24go.top/`, rather than being forced onto HTTPS. These are why the external audit is red. Owner-controlled GitHub Pages custom domain/HTTPS enforcement and authoritative DNS review are needed before claiming consistent canonical hosting; see [Issue #59](https://github.com/rf24kja/24GO.top/issues/59). **No DNS, certificate or hosting settings have been modified.**

**Still not verified:** actual Google Search Console URL Inspection status, sitemap ingestion, indexed page counts, Bing coverage, search impressions/clicks, or references in AI-generated search results. The first deploy and successful HTTP fetch cannot prove those metrics. Submit/inspect sitemap after the canonical-host mismatch is corrected.

## Read-only owner Pages configuration check — 2026-10-29

A new [GitHub Pages domain settings audit](https://github.com/rf24kja/24GO.top/actions/workflows/pages-settings-audit.yml) queries GitHub's `GET /repos/rf24kja/24GO.top/pages` endpoint using the standard short-lived Actions token with **Pages read** and **Contents read** permission. It exposes only the public CNAME, HTML URL, deployment state, HTTPS enforcement and certificate state; no key/token/response dump is printed. It **never PATCHes or changes** Pages, DNS, HTTPS or production. It fails if the Pages `cname` is not exactly `24go.top` or `https_enforced` is not true. See [official GitHub Pages guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

**Important:** for GitHub Actions publishing, committing a `CNAME` file does not override the custom domain setting; GitHub explicitly documents that Pages ignores this file for Actions deployments. Repairing any Pages custom domain mismatch requires a separate reviewed owner-approved configuration change and subsequent external redirect audit.

## Exact Pages remediation

The confirmed settings/DNS evidence and step-by-step, owner-controlled fix are now collected in [DOMAIN_RECOVERY_RUNBOOK.md](DOMAIN_RECOVERY_RUNBOOK.md). This replaces speculation about paid IPv4 or missing DNS; only Pages `Custom domain` and `Enforce HTTPS` need owner review at this stage.

## Verified Pages settings and canonical URLs — 2026-10-29

The founder enabled correct Pages settings and our [configuration audit attempt 2](https://github.com/rf24kja/24GO.top/actions/runs/40882729744) returned **PASS**: `cname=24go.top`, `https_enforced=true`, `html_url=https://24go.top/`, approved certificate for both apex and www. [External content audit attempt 2](https://github.com/rf24kja/24GO.top/actions/runs/40881090465) returned **PASS** for all nine sitemap URLs, robots, RSS and final HTTP/www redirects to HTTPS apex. Earlier failures remain in original Actions logs as historical evidence, not current configuration. Redirect first-hop permanence and path/query preservation are additionally audited in the updated live script before closing [Issue #59](https://github.com/rf24kja/24GO.top/issues/59).

Search Console or Bing index coverage, ranking positions and AI recommendation visibility are **not** established by these tests.
