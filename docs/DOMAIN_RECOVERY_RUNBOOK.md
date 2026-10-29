# 24GOTOP — verified GitHub Pages domain recovery

**Date:** 2026-10-29. **Status: RESOLVED, independently verified.** The founder changed only GitHub Pages custom domain/HTTPS settings. No Namecheap SSL purchase or DNS changes were needed.

[Pages configuration run attempt 2](https://github.com/rf24kja/24GO.top/actions/runs/40882729744): **PASS**, `cname=24go.top`, `https_enforced=true`, approved two-domain certificate. [Live canonical and permanent redirect audit #40886701790](https://github.com/rf24kja/24GO.top/actions/runs/40886701790): **PASS** all nine sitemap pages, RSS, robots, root 301 redirections and article path/query preservation. [Issue #59](https://github.com/rf24kja/24GO.top/issues/59): closed as completed.

## Historical root cause — before the owner fixed Pages

- Live [full sitemap audit](https://github.com/rf24kja/24GO.top/actions/runs/40881090465) confirmed all **nine** sitemap-listed pages, `/robots.txt` and RSS are accessible over HTTPS and return expected content. Every apex HTTPS request redirects to the www subdomain; HTTP variants terminate on HTTP www rather than upgrading.
- The [GitHub Pages settings API audit](https://github.com/rf24kja/24GO.top/actions/runs/40882729744) confirms `cname = www.24go.top`, `https_enforced = false`, `html_url = http://www.24go.top/`, and `https_certificate.state = approved`. The certificate covers **both** `www.24go.top` and `24go.top`.
- GitHub-hosted DNS lookups confirmed all four official Pages apex A addresses: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. The www CNAME is `rf24kja.github.io.`.
- Approved canonical policy remains `https://24go.top`. No provider changes or paid purchases are required based on current evidence. Do **not** alter registrar DNS or production infrastructure as a first fix.

## Recovery steps performed by the owner (historical, no action needed)

1. Keep a screenshot or written note of existing GitHub Pages settings and current DNS records for rollback.
2. Open https://github.com/rf24kja/24GO.top/settings/pages while signed in as an administrator.
3. In **Custom domain**, replace `www.24go.top` with exactly `24go.top`, then **Save**. Ensure Build and deployment stays **GitHub Actions**. A committed `CNAME` file does not substitute for the GitHub Pages custom-domain setting with Actions publishing.
4. Recheck certificate validity and the Pages settings read-only audit. The existing approved certificate includes the apex, but GitHub may still re-evaluate the domain; do not assume immediate availability.
5. When the **Enforce HTTPS** control is available, enable it. If it cannot be enabled, do not disable TLS checks or issue insecure redirects; inspect Pages errors and certificate/DNS status first.
6. Re-run both [Pages settings audit](https://github.com/rf24kja/24GO.top/actions/workflows/pages-settings-audit.yml) and [external SEO availability audit](https://github.com/rf24kja/24GO.top/actions/workflows/seo-live.yml) manually through **Run workflow** on `main`.

## Verified acceptance criteria (complete on 2026-10-29)

- `https://24go.top/` serves the homepage directly with valid TLS.
- `https://www.24go.top/`, `http://24go.top/`, and `http://www.24go.top/` ultimately redirect to `https://24go.top/`, preserving paths and query strings.
- GitHub Pages API reports `cname=24go.top`, `https_enforced=true`, and a valid certificate covering the apex.
- All nine URLs listed in `https://24go.top/sitemap.xml`, plus `robots.txt` and the engineering RSS feed, are externally reachable without authentication, HTTP errors or canonical drift.
- The independent [post-fix audit #40886701790](https://github.com/rf24kja/24GO.top/actions/runs/40886701790) confirmed the tested initial redirects are HTTP **301** and preserve article path/query; [Issue #59](https://github.com/rf24kja/24GO.top/issues/59) was closed with evidence.
- **Next separate task:** verify site ownership and sitemap status in Google Search Console and Bing Webmaster Tools. That has **not** been confirmed and is not part of the completed HTTPS issue.

## Safety and rollback

If changes cause outage, stop further configuration changes. In Pages settings, restore the previously recorded `www.24go.top` custom domain, wait for GitHub verification, and rerun the external audits. Restoring the old value also restores the *known* SEO canonical mismatch; a rollback is temporary recovery, not a final SEO fix. Do not touch other services, issue wildcard DNS records or alter site-wide infrastructure.

Official sources: [GitHub Pages custom-domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) and [Enforce HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).
