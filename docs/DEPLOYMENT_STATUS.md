# 24GOTOP public deployment — verification log

**Maintainer record, updated 2026-10-31.** This log distinguishes code merges, GitHub Actions output, owner observations and independent external checks. It is not an uptime guarantee.

| Area | What is confirmed | Evidence / verification boundary |
| --- | --- | --- |
| Repository | Public source and CI in `rf24kja/24GO.top` | GitHub PRs, Actions and tests |
| Canonical landing, `https://24go.top/` | **Externally verified HTTPS main domain with owner-enabled enforcement** | [Pages audit attempt 2](https://github.com/rf24kja/24GO.top/actions/runs/40882729744) and [permanent redirects audit](https://github.com/rf24kja/24GO.top/actions/runs/40886701790). Google indexing is not yet confirmed. |
| Other site origins | **HTTP/www variants permanently redirect to `https://24go.top/`** | [External audit #40886701790](https://github.com/rf24kja/24GO.top/actions/runs/40886701790): initial HTTP 301, correct final target; sampled article URL retains path and query. |
| Draft Lab, `/draft-lab.html` | **Live HTTPS static files externally verified for eight-language controls and safe citation preview** | [PR #81](https://github.com/rf24kja/24GO.top/pull/81), [Pages delivery #40969864491](https://github.com/rf24kja/24GO.top/actions/runs/40969864491) and [post-deploy live HTTPS smoke #40969903691](https://github.com/rf24kja/24GO.top/actions/runs/40969903691) succeeded. Native-speaker and real mobile/screen-reader review remain unverified; prototype stays `noindex` and outside sitemap. |
| Engineering notes, `/engineering/` | **Six source-backed HTML articles, RSS and nine-item sitemap externally verified on canonical apex** | [Post-fix live audit #40886701790](https://github.com/rf24kja/24GO.top/actions/runs/40886701790). Search rankings and index coverage still unverified. |
| Public publishing / login on **24go.top** | **Not available** | The public GitHub Pages landing has no account login or user-post endpoint. The separate Vercel staging identity screen is described below; it is not a release of hosted publishing. |
| Privacy and analytics | No site-side analytics are claimed | GitHub Pages/provider/server logs may still exist; do not claim zero network metadata collection |

## Staging identity versus public login — 31 October 2026

**Why is the login visible only on Vercel?** 24GOTOP currently has three
different **release boundaries**. These are independently maintained
origins/repositories, not three ready-to-use community websites:

| Component | Verified implementation and address | Who may use it now |
| --- | --- | --- |
| **Public website** | `https://24go.top/` — source `rf24kja/24GO.top`, static GitHub Pages | Everyone can read original engineering content and use the browser-only Markdown Draft Lab. **No sign-in, registration, cloud draft saving or public article posting.** |
| **Private staging identity** | Canonical tester hostname `staging.24go.top`, with technical `24gotop-staging-auth.vercel.app` alias. Vercel project `24gotop-staging-auth` loads the isolated static identity frontend from restricted `rf24kja/24GO.online` source. | Existing approved test accounts can *attempt* sign-in and limited password recovery against isolated Supabase. New account signup is disabled at the provider; user article writes and moderator publication are disabled. **Do not send ordinary readers here as a general login.** |
| **Future hosted community** | Private Core source and release gates (not live on the public homepage). The repository name `24GO.online` is **not** proof that `24go.online` serves a finished login or publishing product. | No open registration, social comments, verified agents, public write API, or community publishing yet. |

**Direct evidence on 31 October:** Vercel's read-only project/deployment API
returned project `24gotop-staging-auth` and a **READY** deployment from
private `main` commit `bb42098f2f43725de0823190eeaad2680bb38e2b`.
It lists and verifies the branded staging hostname plus technical aliases.
Private source `staging/vercel-identity/index.html` displays
`PRIVATE STAGING · NOT A PUBLIC LAUNCH`. The source configuration
currently has `identityFlowsEnabled:false` (new signup) and
`recoveryFlowsEnabled:true` (limited existing-account recovery).
Previously recorded private read-only Auth policy evidence confirms
server-side signup is disabled, not merely hidden in the browser.

**What this does not prove:** A Vercel `READY` status means the deployment
completed, not that a particular test user successfully authenticated,
that Supabase Auth/SMTP is fully configured, that real A/B RLS isolation
passed, that a database backup was restored, or that any private publishing
feature is production-safe. Independent HTTPS/browser delivery, current
Supabase provider settings, real recovery tests, cross-user draft ownership,
moderator AAL2, anti-abuse and backup restore remain independent gates.
Do **not** interpret old `main` README statements or provider-source
tests as launch sign-off.

**Decision:** keep `24go.top` focused on useful public articles, Draft Lab,
contributor onboarding and verified source until P0 is cleared. Do **not**
add a public sign-in CTA redirecting visitors to the test identity app,
change DNS, activate signup, or widen database write grants to make
the pages appear unified. Future product integration should use a separately
reviewed same-brand login experience, audited Auth callbacks, ownership
and session boundaries, and a reversible rollout. See
[public/private architecture](PUBLIC_PRIVATE_BOUNDARY.md),
[security release gates](SECURITY_GATES.md) and
[public roadmap](ROADMAP.md).

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
