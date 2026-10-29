# Public crawlability and indexing — 2026-10-29

**Not yet independently verified as indexed.** Source changes are not a Google/Bing indexing report.

## Source-verified assets
- Canonical policy: https://24go.top (the founder-selected canonical origin; production DNS/HTTPS still requires external verification).
- Public root `site/robots.txt`, XML sitemap `site/sitemap.xml`, optional `site/llms.txt` (not an SEO ranking mechanism).
- Editorial `site/engineering/`: six original static technical notes, metadata, HTML navigation, RSS, unique canonical URLs.
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
