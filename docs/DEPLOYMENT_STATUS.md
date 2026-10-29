# 24GOTOP public deployment — verification log

**Maintainer record, updated 2026-10-30.** This log distinguishes code merges, GitHub Actions output, owner observations and independent external checks. It is not an uptime guarantee.

| Area | What is confirmed | Evidence / verification boundary |
| --- | --- | --- |
| Repository | Public source and CI in `rf24kja/24GO.top` | GitHub PRs, Actions and tests |
| Canonical landing, `https://24go.top/` | **Externally verified HTTPS main domain with owner-enabled enforcement** | [Pages audit attempt 2](https://github.com/rf24kja/24GO.top/actions/runs/40882729744) and [permanent redirects audit](https://github.com/rf24kja/24GO.top/actions/runs/40886701790). Google indexing is not yet confirmed. |
| Other site origins | **HTTP/www variants permanently redirect to `https://24go.top/`** | [External audit #40886701790](https://github.com/rf24kja/24GO.top/actions/runs/40886701790): initial HTTP 301, correct final target; sampled article URL retains path and query. |
| Draft Lab, `/draft-lab.html` | **Live HTTPS static files externally verified for eight-language controls and safe citation preview** | [PR #81](https://github.com/rf24kja/24GO.top/pull/81), [Pages delivery #40969864491](https://github.com/rf24kja/24GO.top/actions/runs/40969864491) and [post-deploy live HTTPS smoke #40969903691](https://github.com/rf24kja/24GO.top/actions/runs/40969903691) succeeded. Native-speaker and real mobile/screen-reader review remain unverified; prototype stays `noindex` and outside sitemap. |
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

## 30 October 2026 — Public Draft Lab feature deployment evidence

- **Source:** [Public PR #78](https://github.com/rf24kja/24GO.top/pull/78), merged as `6a7b40a7f381d5b471bc86cad708b997cc24240a`. This adds a browser-only Markdown Link tool and a strictly limited safe DOM citation preview. All original public publishing/Auth restrictions remain in place.
- **Static deployment:** [GitHub Pages action #40967412610](https://github.com/rf24kja/24GO.top/actions/runs/40967412610) successfully deployed the reviewed `site/` artifact. [CI #40967412855](https://github.com/rf24kja/24GO.top/actions/runs/40967412855) also passed on that commit.
- **Independent public delivery:** [PR #79](https://github.com/rf24kja/24GO.top/pull/79) added a least-privilege GitHub-hosted HTTPS test. [External smoke run #40967854616](https://github.com/rf24kja/24GO.top/actions/runs/40967854616) succeeded and fetched the actual canonical homepage, Draft Lab page and three browser scripts over HTTPS. It checked for the new Link control, safe URL handling, user-generated link privacy attributes and truthful pre-launch disclosure. This confirms the reviewed static files were publicly served when the test ran.
- **Boundaries:** A live smoke check is **not** a screen-reader/mobile QA pass, uptime guarantee, analytics result, real registration, public article publishing or proof that private hosted Core is deployed. No new DNS, Supabase, VPS, payment or Vercel configuration was changed. The staging-auth Vercel connector currently does not permit deployment inspection, so no Vercel deployment is claimed.
- **Rollback:** Revert the public PR and allow the same existing Pages workflow to redeploy `site/`. Any claim of rollback success requires an independently passing live smoke run.

## 30 October 2026 — Eight-language Draft Lab actually delivered

- **Reviewed source and tests:** [PR #81](https://github.com/rf24kja/24GO.top/pull/81) added separate EN/RU/TH/ES/FR/DE/PT/ZH interface localization without altering the selected article language, text, local export or file baseline. [CI #40969864484](https://github.com/rf24kja/24GO.top/actions/runs/40969864484) succeeded on merged commit `fc479a92`.
- **Public deployment:** [GitHub Pages #40969864491](https://github.com/rf24kja/24GO.top/actions/runs/40969864491) succeeded. [Independent HTTPS probe #40969903691](https://github.com/rf24kja/24GO.top/actions/runs/40969903691), triggered **after** that Pages success, fetched the real canonical assets and confirmed the new selector, dictionary and privacy disclosure.
- **Honest failure evidence:** The initial [push-triggered live probe #40969864523](https://github.com/rf24kja/24GO.top/actions/runs/40969864523) ran while Pages was still deploying, observed the old assets and failed. It does **not** invalidate the successful later verification. The follow-up PR removes the racy push trigger: only successful Pages completion or manual dispatch initiates new live checks.
- These checks prove public static delivery at the test time, **not** translation quality, mobile UI, browser screen-reader behavior, production author identity, or actual user publishing. No private backend, migrations, Auth grants, DNS, VPS, Vercel project or customer data was changed.
