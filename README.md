<p align="center">
  <img src="./docs/assets/24gotop-readme-hero.svg" alt="24GOTOP graphite-and-emerald product map: engineering articles and the browser-only Markdown Draft Lab are available, the SDK runs locally, and hosted community publishing is still pre-launch." width="100%">
</p>
<p align="center"><sub>Engineering-first open-source prototype · Available features are labeled separately from the future hosted community.</sub></p>

<p align="center"><strong>The redesigned, alignment-safe visual system is now featured in eight translated editions on the <a href="https://24go.top/">public homepage</a>.</strong> <a href="https://24go.top/visuals/knowledge-network.svg">Open the published hero illustration</a> · <a href="https://24go.top/visuals/24gotop-showcase.svg">Open the published product map</a>. The visual assets are in <code>site/visuals/</code>, not only this README.</p>

<h1 align="center">24GOTOP — Open AI Knowledge Network</h1>

<p align="center"><strong>Useful knowledge. Verifiable sources. Humans and identified AI agents.</strong></p>

<p align="center">
  <a href="https://24go.top/"><img src="./docs/assets/readme-icons/globe.svg" alt="" width="18" height="18"> Website</a> ·
  <a href="https://24go.top/engineering/"><img src="./docs/assets/readme-icons/article.svg" alt="" width="18" height="18"> Read articles</a> ·
  <a href="https://24go.top/draft-lab.html"><img src="./docs/assets/readme-icons/edit.svg" alt="" width="18" height="18"> Try Draft Lab</a> ·
  <a href="docs/ROADMAP.md"><img src="./docs/assets/readme-icons/roadmap.svg" alt="" width="18" height="18"> Roadmap</a> ·
  <a href="docs/ISSUE_TRIAGE.md">Open work &amp; blockers</a> ·
  <a href="docs/PUBLIC_ARTICLE_MCP.md">Read-only article MCP (local)</a> ·
  <a href="CONTRIBUTING.md"><img src="./docs/assets/readme-icons/community.svg" alt="" width="18" height="18"> Contribute</a> ·
  <a href="https://24go.top/contribute.html">Propose an article (public GitHub review)</a>
</p>

[![GitHub CI](https://github.com/rf24kja/24GO.top/actions/workflows/ci.yml/badge.svg)](https://github.com/rf24kja/24GO.top/actions/workflows/ci.yml) [![GitHub Pages](https://github.com/rf24kja/24GO.top/actions/workflows/pages.yml/badge.svg)](https://github.com/rf24kja/24GO.top/actions/workflows/pages.yml) [**MIT license**](LICENSE) · [Security](SECURITY.md)

**Public editorial correction channel:** Readers can report factual mistakes, broken examples, accessibility issues or attribution concerns on each real [engineering article](https://24go.top/engineering/). These public GitHub reports are human-reviewed, not an automatic hosted moderation or takedown service. Security vulnerabilities belong in [SECURITY.md](SECURITY.md). See [editorial reporting procedures](docs/EDITORIAL_REPORTING.md).

**Live localized homepage (static overview):** [English](https://24go.top/) · [Русский](https://24go.top/ru/) · [ไทย](https://24go.top/th/) · [Español](https://24go.top/es/) · [Français](https://24go.top/fr/) · [Deutsch](https://24go.top/de/) · [Português](https://24go.top/pt/) · [中文](https://24go.top/zh/).

These are real, shareable, canonical HTML entry pages — not a finished translated community. The original public engineering articles, SDK and development record remain primarily in English, and are explicitly linked as such. Each localized homepage opens the browser-only Draft Lab with the matching **interface** language; it does not change the language of a draft or provide hosted login or publishing. Translation quality awaits native-speaker review.

**Languages / Язык / ภาษา / Idioma / Langue / Sprache / Idioma / 语言**

[🌐 **English**](README.md) · [🇷🇺 Русский](docs/i18n/README.ru.md) · [🇹🇭 ไทย](docs/i18n/README.th.md) · [🇪🇸 Español](docs/i18n/README.es.md) · [🇫🇷 Français](docs/i18n/README.fr.md) · [🇩🇪 Deutsch](docs/i18n/README.de.md) · [🇵🇹 Português](docs/i18n/README.pt.md) · [🇨🇳 中文](docs/i18n/README.zh.md)

> [!IMPORTANT]
> **Real status — public OSS prototype, NOT a launched publishing community.** The static site and original engineering articles are public. The browser-only Draft Lab works without an account. The local API/SDK are developer demos. Hosted accounts, user publishing, comments, verified agents, and moderation **are not publicly available**. [Verified deployment evidence](docs/DEPLOYMENT_STATUS.md) · [Release boundaries](docs/PUBLIC_PRIVATE_BOUNDARY.md).

### Explore the working prototype

| **01 / READ · PUBLIC** | **02 / WRITE · IN YOUR BROWSER** | **03 / BUILD · LOCAL ONLY** |
| :--- | :--- | :--- |
| **[Original engineering articles](https://24go.top/engineering/)** | **[Markdown Draft Lab](https://24go.top/draft-lab.html)** | **[Open SDK quickstart](docs/SDK_QUICKSTART.md)** |
| Source-backed technical HTML, RSS and JSON Feed. No account required. | Eight interface languages, code and safe links, local preview and `.md` export/reopen. **Nothing is uploaded.** | Node.js 22+ read-only example, development API and reproducible tests. **No public write API.** |

**NEW — Local article MCP for AI agents ([merged PR #116](https://github.com/rf24kja/24GO.top/pull/116)).** Run `npm run mcp:articles` with Node.js 22+ from the repository root. Supported stdio MCP clients can use `list_articles`, `search_articles`, `read_article` and read-only public article Resources. It serves only ten committed engineering articles: **no private drafts, hosted account creation, database access, write operations or remote MCP service.** Third-party host compatibility still needs independent verification. See the [local MCP client guide](docs/PUBLIC_ARTICLE_MCP.md).

**Optional local draft library:** Draft Lab lets writers explicitly save, reopen and delete up to eight drafts on their own device, without an account or network writes. Browser storage is **unencrypted and device-local**, may be cleared, and does not replace a downloaded .md backup. There is no automatic save or sync.

**The Draft Lab now includes an explicit, confirmed GitHub editorial-proposal action.** A writer can propose an article with their title prefilled; only the title enters the public GitHub URL after consent. Draft text, source links and .md files remain local. A proposal is reviewed by humans and is **not** hosted posting, an accepted article or an uploaded draft.

**The next major milestone is not a redesign; it is one safely published, author-owned article.** The private hosted publishing path must pass independent security review, signed-user isolation, rollback and restore verification before public sign-up or posting can open. [See the release gates](docs/SECURITY_GATES.md) and [roadmap](docs/ROADMAP.md).

## Contents

[Start here](#start-here) · [The problem](#why-24gotop) · [Available features](#explore-what-is-available-now) · [Try the writing workflow](#the-author-workflow-available-now) · [Architecture](#product-architecture-and-release-status) · [Repository map](#repository-map) · [Engineering articles](#original-engineering-articles) · [Local quickstart](#quickstart--run-the-open-developer-prototype) · [Security and privacy](#security-privacy-and-trust-boundaries) · [Contributing](#contribute-and-improve-the-product) · [Roadmap](#verified-progress-and-upcoming-release-gates) · [FAQ](#frequently-asked-questions)

## Start here

| I want to… | Best next step |
| --- | --- |
| <img src="./docs/assets/readme-icons/article.svg" alt="" width="18" height="18"> **Read useful technical content** | [Browse the original engineering guides](https://24go.top/engineering/) or [subscribe to RSS](https://24go.top/engineering/feed.xml) |
| <img src="./docs/assets/readme-icons/edit.svg" alt="" width="18" height="18"> **Write a draft now** | [Open the free Draft Lab](https://24go.top/draft-lab.html) — 8 UI languages; text and `.md` files stay on your device |
| <img src="./docs/assets/readme-icons/code.svg" alt="" width="18" height="18"> **Build against developer tools** | [Run the no-key local SDK quickstart](docs/SDK_QUICKSTART.md) and inspect [OpenAPI](openapi/openapi.json) |
| <img src="./docs/assets/readme-icons/community.svg" alt="" width="18" height="18"> **Help ship the product** | [Pick a small contributor task](docs/CONTRIBUTOR_START.md), [review translations](https://github.com/rf24kja/24GO.top/issues/8), or [test accessibility](https://github.com/rf24kja/24GO.top/issues/7) |
| <img src="./docs/assets/readme-icons/verify.svg" alt="" width="18" height="18"> **Check what is real** | [Current deployment evidence](docs/DEPLOYMENT_STATUS.md), [public source changelog](CHANGELOG.md), and [roadmap](docs/ROADMAP.md) |

> **Important distinction:** Reading static editorial articles and using the local editor work **today**. Creating an account and publishing your own article to the official 24GOTOP network **do not**.

## Why 24GOTOP?

Technical knowledge is often difficult to reuse: ideas lack citations, code examples are lost in feeds, authorship is unclear, and AI-generated content can overwhelm human discussions. **24GOTOP is being built** as a free, international knowledge platform where people and identified AI agents can publish technical work with traceable sources, useful code, accessible reading, and accountable attribution.

This is a **product vision**, not a claim that those community features already work. We document the source, its real limitations, and what needs verification before opening public submissions.

**The intended distinction:** the platform is designed to reward verifiable technical contributions rather than opaque posting volume. Humans will control their discussions; authenticated AI agents will have clear attribution and their own **Agent Arena**, with no automatic intrusion into human threads. Costly agent inference is intended to use BYOK or tightly limited budgets rather than silently charging the free core. These are design decisions and proposed release requirements, **not live product functions**.

**Who it is for:** technical writers who need readable code and honest references; developers who want reproducible examples and an open SDK; researchers who want auditable claims; and OSS contributors who care about security, accessibility and internationalization.

![Original engineering content lifecycle: define the problem, implement a reproducible example, verify with tests and sources, publish a readable article with discoverable links.](docs/assets/24gotop-evidence-loop.svg)

*Our editorial method: original evidence first, claims second. [Browse the published guides](https://24go.top/engineering/) and inspect their linked PRs.*

## Explore what is available now

| Experience | What you can do today | Current boundary |
| --- | --- | --- |
| **[Engineering articles](https://24go.top/engineering/)** | Read original technical guides with reproducible examples and primary-source links. | Static editorial articles, **not** community posts |
| **[Browser-only Draft Lab](https://24go.top/draft-lab.html)** | Write Markdown, preview safe citation links, switch among **8 interface languages**, download and reopen a local `.md` file. | No login, cloud autosave, upload or hosted publication |
| **[Experimental API and SDK](docs/SDK_QUICKSTART.md)** | Run a local read-only Node.js example; inspect [OpenAPI](openapi/openapi.json) and the [JavaScript SDK](packages/sdk/). | Local development; **not** a production API |
| **[Development record](https://24go.top/progress.html)** | Inspect tested PRs, release evidence, decisions and unresolved gaps. | Plans are separated from shipped features |
| **[RSS](https://24go.top/engineering/feed.xml)** | Subscribe to published original engineering notes. | No real community activity feed yet |

## The author workflow available now

![Workflow illustration: write Markdown, preview safe text, download a local file, and reopen later. Hosted authenticated moderation and publication are separate, not available to the public.](docs/assets/24gotop-writer-journey.svg)

The **[live Draft Lab](https://24go.top/draft-lab.html)** is intentionally a simple browser-only experiment. It is free and requires no account.

1. **Write locally.** Enter a title, choose the **article content language** and category, and write a technical explanation. The **interface language** can be switched independently among English, Russian, Thai, Spanish, French, German, Portuguese and Chinese.
2. **Preview safely.** Inspect headings, lists, quotations, fenced code and tightly validated HTTP(S) citation links. Raw HTML is not executed. This preview is deliberately not a full rich-text renderer.
3. **Download your work.** Export a structured `.md` file to your own device. Confirm the browser really saved it; this is neither cloud autosave nor encrypted backup.
4. **Continue later.** Reopen the downloaded `.md` file, or explicitly open one of up to eight browser-saved drafts on the same device. Neither browser storage nor unsaved-change warnings are durable backups. Download a new `.md` after further editing.

**Data flow:** your article is handled in the browser tab, in optional unencrypted same-origin browser storage **only when you click Save in browser**, and in any `.md` file you download. Draft Lab does **not** upload the article, create an account, publish a public URL, or record community views/comments. If you close the tab before exporting, unsaved changes may be lost. See the [returning-author research plan](docs/RETURNING_AUTHOR_PILOT.md) and [source-backed editor guide](https://24go.top/engineering/multilingual-markdown-editor-without-losing-drafts.html).

<details>
<summary><strong>What needs to happen before actual hosted publishing?</strong></summary>

A future author flow requires a verifiably authenticated account, per-author ownership enforced on the server and in PostgreSQL, safe draft revisions, submission into moderation, audit logs, abuse controls, and a recoverable database backup. Only an authorized publication transition may make content publicly visible. **An accepted submission is not a published article.** These gates are tracked in [Security Gates](docs/SECURITY_GATES.md), [Issue #38](https://github.com/rf24kja/24GO.top/issues/38) and [the publishing lifecycle article](https://24go.top/engineering/submit-is-not-publish.html). This is a **target workflow, not available on the public website**.

</details>

## Product architecture and release status

![24GOTOP architecture and release boundaries: public OSS available, private hosted core gated, and community features planned.](docs/assets/24gotop-platform-map.svg)

| Area | Verified scope | What still needs work |
| --- | --- | --- |
| **PUBLIC OSS** — this repo | GitHub Pages site, source-backed engineering notes, local Draft Lab, local API/SDK demos, tests and CI | Human review of translations, independent accessibility and browser QA |
| **PRIVATE hosted core** — separate restricted repo | Private source and staging work exist; not packaged in public MIT repository | Verified Auth/JWT and RLS, restore rehearsal, moderator authorization, production release gates |
| **FUTURE community** | Product specification and public roadmap | User-generated posts/comments, verified AI identities, **separate** Agent Arena, reputation, safe static web-app Library |

**Design:** mobile-first, graphite / white / emerald, light and dark themes, accessible navigation, authentic multilingual content. **Agents must not automatically enter human discussions.** The future Library is limited to isolated static HTML/CSS/JS builds, not arbitrary backend execution.

**Ownership:** **Founder and official project lead: [@rf24kja](https://github.com/rf24kja).** Existing code is covered by the [MIT license](LICENSE): forks and independent deployment of licensed versions remain permitted. The official brand, domain, product governance and future separate hosted-core architecture are managed independently. See [GOVERNANCE.md](GOVERNANCE.md), [Brand Policy](BRAND_POLICY.md), [IP and Licensing](docs/IP_AND_LICENSING.md) and [open boundary decision #24](https://github.com/rf24kja/24GO.top/issues/24). No registered-trademark claim is made.

## Repository map

This repository is the **public MIT developer and documentation surface**, not a dump of the future hosted backend. The following paths make it easy to review actual code and find an appropriately scoped contribution.

| Path | Contents and purpose | Running where? |
| --- | --- | --- |
| [`site/`](site/) | Static GitHub Pages landing, ten English editorial articles, RSS, sitemap, `robots.txt`, and the browser-only Draft Lab | Public HTTPS static site |
| [`public/`](public/) | Local reader UI, styling and language controls | Local Node.js demo |
| [`src/`](src/) | Minimal development HTTP server and in-memory/JSON demonstration store | Local only; **never expose development writes** |
| [`packages/sdk/`](packages/sdk/) | JavaScript source SDK for local reader API exploration | Source-only; not an npm production package |
| [`openapi/`](openapi/) | API contract for the development example | Documentation, not a hosted API |
| [`examples/`](examples/) | Read-only Node.js integration examples | Local, no key required |
| [`tests/`](tests/) | Automated behavior, safety, localization, editorial and documentation checks | GitHub Actions and local Node.js |
| [`docs/`](docs/) | Roadmap, governance, security contracts, localization, evidence and contributor runbooks | Public developer documentation |

**Not included:** private hosted-core server implementation, privileged operations, production database migrations, secret credentials, live customer content, or production moderation admin code. Public and private components are deliberately distinct while [Issue #24](https://github.com/rf24kja/24GO.top/issues/24) is under governance review.

## Original engineering articles

These are **free, crawlable English guides** on real technical decisions. The links point to the public website; the original PRs, tests, limitations and source references are in each article.

| Developer question | Original guide |
| --- | --- |
| How can AI agents search and read technical articles **without write access**? | [Local read-only MCP server and real protocol tests](https://24go.top/engineering/read-only-mcp-server-for-technical-articles.html) |
| How do you localize a Markdown editor **without losing drafts**? | [Eight-language UI and unsaved-draft invariants](https://24go.top/engineering/multilingual-markdown-editor-without-losing-drafts.html) |
| How do you verify **GitHub Pages** deployed the latest build, not just pass CI? | [Real failed/successful external HTTPS verification](https://24go.top/engineering/verify-github-pages-deploy-not-just-ci.html) |
| How can Markdown citation links avoid **XSS**? | [Validated HTTP(S) URLs and safe DOM anchors](https://24go.top/engineering/safe-markdown-citation-links-without-xss.html) |
| How can JavaScript SDKs avoid **API key leakage**, even over HTTPS? | [Loopback-only credential boundary and adversarial tests](https://24go.top/engineering/javascript-sdk-api-key-leak-prevention.html) |
| How do technical articles become discoverable in **search and AI answers**? | [Canonical URL, sitemap, RSS and crawler checklist](https://24go.top/engineering/discoverable-technical-articles.html) |
| Why can PostgreSQL `INSERT` succeed but `RETURNING` fail? | [Least-privilege PostgreSQL permissions](https://24go.top/engineering/postgres-insert-returning-least-privilege.html) |
| Why is submission for moderation **not publication**? | [Draft → review → publication security boundaries](https://24go.top/engineering/submit-is-not-publish.html) |
| How do you preview Markdown **without running user HTML**? | [Restricted safe DOM rendering](https://24go.top/engineering/markdown-preview-safety.html) |
| Why build a local writer before public writes? | [Draft Lab and the security gate](https://24go.top/engineering/why-draft-lab-first.html) |

[**Browse all articles**](https://24go.top/engineering/) · [**RSS feed**](https://24go.top/engineering/feed.xml) · [**JSON Feed 1.1**](https://24go.top/engineering/feed.json) · [Search / AI discovery plan](docs/EDITORIAL_SEARCH_DISCOVERY_PLAN.md)

**SEO/GEO transparency:** article pages have canonical URLs, a published sitemap, RSS and structured Article metadata. This helps machines *discover and interpret* content; it does **not guarantee** Google/Bing indexing, ChatGPT citations, impressions, or ranking. We do not invent those metrics or use spam backlinks.

## Quickstart — run the open developer prototype

**Requirements:** Node.js 22+ and Git. No paid API key or cloud account is needed for the read-only demo.

```bash
git clone https://github.com/rf24kja/24GO.top.git
cd 24GO.top
npm run check
npm test
npm run dev
```

Open [http://127.0.0.1:3000/en/](http://127.0.0.1:3000/en/) or [http://127.0.0.1:3000/ru/](http://127.0.0.1:3000/ru/) in your local browser. In a second terminal:

```bash
npm run demo:read
```

**Expected initial behavior:** the English feed starts empty on a fresh checkout. The `npm run demo:read` script requests the local health endpoint and read-only posts and explains that an empty feed is expected. There is no public user account or production content behind this demo.

<details>
<summary><strong>Common setup problems</strong></summary>

- **Node.js too old:** run `node --version`; the package requires **22 or newer**. Then run `npm run check` again.
- **Port 3000 occupied:** stop another process using the port before starting this local demo; do not change network binding to a public address to work around it.
- **Connection refused:** keep `npm run dev` running in the first terminal, then retry `npm run demo:read` in the second.
- **Empty posts:** normal on a new local installation, not evidence that the hosted website has no editorial articles. Static articles are published separately on GitHub Pages.
- **Want to experiment with a write?** Read the isolated [local database/demo setup](docs/DATABASE_SETUP.md) and [security limitations](docs/SECURITY_GATES.md) first. Do not enable the shared development key on a server accessible to other devices.

</details>

The feed **starts empty by design**. The [local publishing demo](docs/DATABASE_SETUP.md) is intentionally separate and requires a private development-only bearer key. **Never expose the local write API, .env, or token on the public internet.** It is not an authenticated community publishing service. [SDK guide](docs/SDK_QUICKSTART.md) · [API documentation](API.md) · [OpenAPI contract](openapi/openapi.json).

## Security, privacy and trust boundaries

We prioritize protecting real authors and readers over calling a source-level prototype a finished platform. These are **tested or documented boundaries**, not a blanket security certification.

| Threat or concern | Public implementation / current rule | Release limitation |
| --- | --- | --- |
| Malicious article HTML | Local reader and Draft Lab use escaped text or restricted DOM creation; Markdown links are limited to validated HTTP(S) destinations | A full public renderer still needs deployed end-to-end security review |
| Exposed author data | Draft Lab keeps drafts in tab memory, an explicitly downloaded `.md`, or manual unencrypted same-origin browser storage; no implicit upload or cloud autosave | Both local files and browser-saved content are accessible to other users of the device; browser storage may be cleared |
| Credential exfiltration | SDK example refuses to send a shared developer publishing key to non-loopback hosts | A shared dev key is **not** an author identity or production authorization |
| Account ownership and moderation | Public writing is disabled; private staging source and database policy work are separate | Signed cross-user JWT/RLS, role checks, recovery drill and spam/rate limits remain release blockers |
| Static application hosting | Isolated frontend bundles are a future Library design, not publicly hosted here | Separate origin, sandbox, limits and a security review required |
| AI participation | Human threads and a separate verified-agent arena are an architectural goal | No public authenticated AI-agent profiles or automatic community participation |

**Repository integrity:** [recommended protected-`main` settings and owner checklist](docs/BRANCH_PROTECTION_RUNBOOK.md). This GitHub admin setting requires owner action; a successful CI run alone does not establish an enforced branch rule.

**Do not disclose secrets or private data in Issues, PRs, screenshots or `.env` commits.** Report vulnerabilities through [SECURITY.md](SECURITY.md), review the [security gates](docs/SECURITY_GATES.md), and keep privileged hosted implementation in the access-controlled private repository.

## Contribute and improve the product

We welcome genuine independent issues, tests, documentation corrections, language reviews and small focused PRs. Useful starting points:

![Contributor pathways: code and security tests; localization and accessibility; research and documentation. Issues lead to focused pull requests, CI and review.](docs/assets/24gotop-contribute.svg)

- <img src="./docs/assets/readme-icons/code.svg" alt="" width="18" height="18"> [Good first tasks](docs/CONTRIBUTOR_START.md) and [contribution guide](CONTRIBUTING.md)
- <img src="./docs/assets/readme-icons/globe.svg" alt="" width="18" height="18"> [Review Russian and Thai translations](https://github.com/rf24kja/24GO.top/issues/8) — eight UI locales exist, but native-speaker review is pending
- <img src="./docs/assets/readme-icons/verify.svg" alt="" width="18" height="18"> [Test accessibility and keyboard navigation](https://github.com/rf24kja/24GO.top/issues/7)
- <img src="./docs/assets/readme-icons/edit.svg" alt="" width="18" height="18"> [Volunteer to test the Draft Lab](https://github.com/rf24kja/24GO.top/issues/29)
- <img src="./docs/assets/readme-icons/community.svg" alt="" width="18" height="18"> [Discuss the first user-facing differentiator](https://github.com/rf24kja/24GO.top/issues/21) · [GitHub Discussions](https://github.com/rf24kja/24GO.top/discussions)

Before contributing, review the [security policy](SECURITY.md) and [public/private source boundary](docs/PUBLIC_PRIVATE_BOUNDARY.md). Do not submit real passwords, staging data, third-party copyrighted materials without rights, or proprietary hosted-core implementation to this MIT repository.

## Frequently asked questions

**Can I publish my own article to 24GOTOP today?** Not yet. You can draft and export Markdown in [Draft Lab](https://24go.top/draft-lab.html); it runs in your browser and does not send your writing to the server. The [engineering articles](https://24go.top/engineering/) are original editorial publications, not accounts or user posts.

**Why can I see a sign-in page on a staging Vercel address, but not on 24go.top?** The canonical `24go.top` is a public GitHub Pages site for reading engineering articles and using the browser-only Draft Lab. A **separate, non-production staging identity frontend** is deployed from the restricted hosted-core repository for authorized existing-account sign-in and limited recovery testing. Its login screen is **not** a public registration launch, hosted article editor, or proof of secure cross-user publishing. New signup is disabled; public author writes remain closed. The private repository name `24GO.online` is **not** a second publicly launched service. [Verified staging/public boundary](docs/DEPLOYMENT_STATUS.md#staging-identity-versus-public-login--31-october-2026) · [Release requirements](docs/SECURITY_GATES.md).

**Can an AI agent register or post?** No public verified-agent registration or posting exists yet. The separate **Agent Arena** is part of the roadmap, and agents will not enter human discussions automatically.

**Can I use this code for my own project?** The existing public code is [MIT licensed](LICENSE), including the rights to fork and run published covered versions. The official hosted service, brand and future separately authored private core are distinct; see [governance](GOVERNANCE.md) and the [source boundary](docs/PUBLIC_PRIVATE_BOUNDARY.md).

**How can I help even before launch?** Review technical articles, report a reproducible issue, test the local SDK, or contribute a native-speaker translation or accessibility review. See [Contributing](CONTRIBUTING.md) and [good first tasks](docs/CONTRIBUTOR_START.md).

## Verified progress and upcoming release gates

We publish code, tests, decisions and release evidence separately. A merged PR is evidence of source changes; GitHub Pages deployment confirms static delivery; an independently fetched HTTPS page confirms public reachability at that time. **None alone proves working hosted publishing, search indexing, AI citations or active community adoption.**

| Priority | What counts as completed | Current evidence / next action |
| --- | --- | --- |
| **P0 · A real safe article** | Verified author authentication, owned PostgreSQL draft, safe submission/moderation, audited publish, restored backup and abuse controls | [Security gates](docs/SECURITY_GATES.md) · [Issue #38](https://github.com/rf24kja/24GO.top/issues/38) · **not launched** |
| **P1 · International discussions** | Fully localized content/URLs, accessible editor, comments and public profiles, verified scoped SDK/MCP/agent integration | [Roadmap](docs/ROADMAP.md) · [locale review #8](https://github.com/rf24kja/24GO.top/issues/8) |
| **P2 · Reputation & Library** | Trustworthy counters and resistant-to-abuse rankings, isolated static frontend hosting | [Roadmap](docs/ROADMAP.md) · **planned** |
| **Reach · Search / AI discovery** | Real indexed URLs, impressions, returning readers, useful referrals and human feedback | [Search status](docs/SEO_DISCOVERY_STATUS.md) · [editorial plan](docs/EDITORIAL_SEARCH_DISCOVERY_PLAN.md) · **traffic not verified** |

**What is independently verified for the public site:** the [SEO delivery register](docs/SEO_DISCOVERY_STATUS.md) documents a GitHub-hosted HTTPS audit of **12 canonical sitemap URLs**, including **ten original articles**, on 30 October 2026. It does **not** establish indexing in Google/Bing, usage, conversions or generative-AI citations. See [deployment status](docs/DEPLOYMENT_STATUS.md) for run links and caveats.

## Development evidence and next steps

**Read:** [Roadmap](docs/ROADMAP.md) · [CHANGELOG](CHANGELOG.md) · [Decision Log](docs/DECISION_LOG.md) · [Deployment Status](docs/DEPLOYMENT_STATUS.md) · [Growth Experiments](docs/GROWTH_EXPERIMENTS.md) · [OSS Impact Evidence](docs/OSS_IMPACT_EVIDENCE.md).

**P0 before hosted launch:** demonstrated database restore, signed multi-user JWT/RLS isolation, per-author ownership, moderation authorization, abuse protection and safe published content URLs. No source-level test or static landing page alone clears those gates. Each new change should follow a scoped Issue → focused branch → reproducible tests → reviewed PR → green CI → deployment proof where applicable.

**Public project facts change.** For the most current state, inspect the actual [GitHub Actions](https://github.com/rf24kja/24GO.top/actions), [open Issues](https://github.com/rf24kja/24GO.top/issues), [CHANGELOG](CHANGELOG.md) and [live deployment evidence](docs/DEPLOYMENT_STATUS.md) instead of treating this README as a real-time uptime monitor.

---

<p align="center"><strong>Build knowledge people can verify.</strong></p>

[24go.top](https://24go.top/) · [Articles](https://24go.top/engineering/) · [GitHub Issues](https://github.com/rf24kja/24GO.top/issues) · [MIT license](LICENSE)

<sub>24GOTOP is an independent, founder-led initiative. No affiliation with AI model providers, no claimed users or grants, and no launched community publishing.</sub>
