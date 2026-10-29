# Public crawlability and indexing — 2026-10-29

**Not yet independently verified as indexed.** Source changes are not a Google/Bing indexing report.

## Source-verified assets
- Canonical policy: https://24go.top (the founder-selected canonical origin; production DNS/HTTPS still requires external verification).
- Public root `site/robots.txt`, XML sitemap `site/sitemap.xml`, optional `site/llms.txt` (not an SEO ranking mechanism).
- Editorial `site/engineering/`: five original static technical notes, metadata, HTML navigation, RSS, unique canonical URLs.
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
