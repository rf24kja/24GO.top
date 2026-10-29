# 24GOTOP public deployment — verification log

**Maintainer record, updated 2026-10-29.** This log distinguishes code merges, GitHub Actions output, owner observations and independent external checks. It is not an uptime guarantee.

| Area | What is confirmed | Evidence / verification boundary |
| --- | --- | --- |
| Repository | Public source and CI in `rf24kja/24GO.top` | GitHub PRs, Actions and tests |
| Canonical landing, `https://24go.top/` | **Externally verified HTTPS main domain with owner-enabled enforcement** | [Pages audit attempt 2](https://github.com/rf24kja/24GO.top/actions/runs/40882729744) and [permanent redirects audit](https://github.com/rf24kja/24GO.top/actions/runs/40886701790). Google indexing is not yet confirmed. |
| Other site origins | **HTTP/www variants permanently redirect to `https://24go.top/`** | [External audit #40886701790](https://github.com/rf24kja/24GO.top/actions/runs/40886701790): initial HTTP 301, correct final target; sampled article URL retains path and query. |
| Draft Lab, `/draft-lab.html` | Source committed and browser-only logic tested | Browser/device verification not independently completed; intentionally noindex and excluded from sitemap |
| Engineering notes, `/engineering/` | **Six source-backed HTML articles, RSS and nine-item sitemap externally verified on canonical apex** | [Post-fix live audit #40886701790](https://github.com/rf24kja/24GO.top/actions/runs/40886701790). Search rankings and index coverage still unverified. |
| Public publishing / login | **Not implemented** | The site's public landing is not the Node.js API and does not accept user posts |
| Privacy and analytics | No site-side analytics are claimed | GitHub Pages/provider/server logs may still exist; do not claim zero network metadata collection |

## What the owner can verify without changing DNS

1. In a private browser window, open `https://24go.top/` and inspect HTTPS/certificate.
2. Open `https://24go.top/draft-lab.html`, test typing, local Markdown download and Clear cancellation.
3. Open `https://24go.top/engineering/` and its article and RSS links.
4. Verify `www` and HTTP variants redirect to the canonical apex HTTPS address (automated tests already passed).
5. Check mobile keyboard navigation and whether every asset loads correctly; do not paste private drafts into bug reports.

## Closed delivery issues

[Landing delivery #11](https://github.com/rf24kja/24GO.top/issues/11) and [canonical/HTTPS routing #59](https://github.com/rf24kja/24GO.top/issues/59) are both **completed with independent Actions evidence**. The owner performed the Pages settings correction; no Namecheap/DNS or paid SSL change was necessary. Full hosted user publishing is a distinct incomplete release gate.

## Pending public navigation smoke test

Separately confirm `24go.top` home has visible, keyboard-focusable links to Draft Lab, Engineering Notes, Progress and GitHub on mobile. This is an **unverified browser check** until recorded by a human; source-level tests alone do not establish working deployed pages.

## Post-remediation external evidence (29 October 2026)

The owner changed the Pages custom domain and enabled HTTPS. [Official Pages audit attempt 2](https://github.com/rf24kja/24GO.top/actions/runs/40882729744) succeeded with canonical `https://24go.top/`, `https_enforced=true`, and approved certificate. [Independent full SEO availability audit attempt 2](https://github.com/rf24kja/24GO.top/actions/runs/40881090465) succeeded on nine canonical pages, plus RSS and robots, and verified all root variants ultimately reach HTTPS apex. Earlier redirect discrepancies in the historical table refer to **prior configuration**, not current conditions. Search engine indexing remains unverified; see [SEO discovery status](SEO_DISCOVERY_STATUS.md).
