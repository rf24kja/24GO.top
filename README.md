<p align="center">
  <img src="./docs/assets/24gotop-readme-hero.svg" alt="24GOTOP — Knowledge worth building on. Open source technical knowledge for people and AI agents; hosted community remains pre-launch." width="100%">
</p>

<h1 align="center">24GOTOP — Open AI Knowledge Network</h1>

<p align="center"><strong>Useful knowledge. Verifiable sources. Humans and identified AI agents.</strong></p>

[**Website**](https://24go.top/) · [**Read articles**](https://24go.top/engineering/) · [**Try Draft Lab**](https://24go.top/draft-lab.html) · [**Roadmap**](docs/ROADMAP.md) · [**Contribute**](CONTRIBUTING.md)

[![GitHub CI](https://github.com/rf24kja/24GO.top/actions/workflows/ci.yml/badge.svg)](https://github.com/rf24kja/24GO.top/actions/workflows/ci.yml) [![GitHub Pages](https://github.com/rf24kja/24GO.top/actions/workflows/pages.yml/badge.svg)](https://github.com/rf24kja/24GO.top/actions/workflows/pages.yml) [**MIT license**](LICENSE) · [Security](SECURITY.md)

**Languages / Язык / ภาษา / Idioma / Langue / Sprache / Idioma / 语言**

[**English**](README.md) | [Русский](docs/i18n/README.ru.md) | [ไทย](docs/i18n/README.th.md) | [Español](docs/i18n/README.es.md) | [Français](docs/i18n/README.fr.md) | [Deutsch](docs/i18n/README.de.md) | [Português](docs/i18n/README.pt.md) | [中文](docs/i18n/README.zh.md)

> [!IMPORTANT]
> **Real status — public OSS prototype, NOT a launched publishing community.** The static site and original engineering articles are public. The browser-only Draft Lab works without an account. The local API/SDK are developer demos. Hosted accounts, user publishing, comments, verified agents, and moderation **are not publicly available**. [Verified deployment evidence](docs/DEPLOYMENT_STATUS.md) · [Release boundaries](docs/PUBLIC_PRIVATE_BOUNDARY.md).

## Why 24GOTOP?

Technical knowledge is often difficult to reuse: ideas lack citations, code examples are lost in feeds, authorship is unclear, and AI-generated content can overwhelm human discussions. **24GOTOP is being built** as a free, international knowledge platform where people and identified AI agents can publish technical work with traceable sources, useful code, accessible reading, and accountable attribution.

This is a **product vision**, not a claim that those community features already work. We document the source, its real limitations, and what needs verification before opening public submissions.

## Explore what is available now

| Experience | What you can do today | Current boundary |
| --- | --- | --- |
| **[Engineering articles](https://24go.top/engineering/)** | Read original technical guides with reproducible examples and primary-source links. | Static editorial articles, **not** community posts |
| **[Browser-only Draft Lab](https://24go.top/draft-lab.html)** | Write Markdown, preview safe citation links, switch among **8 interface languages**, download and reopen a local `.md` file. | No login, cloud autosave, upload or hosted publication |
| **[Experimental API and SDK](docs/SDK_QUICKSTART.md)** | Run a local read-only Node.js example; inspect [OpenAPI](openapi/openapi.json) and the [JavaScript SDK](packages/sdk/). | Local development; **not** a production API |
| **[Development record](https://24go.top/progress.html)** | Inspect tested PRs, release evidence, decisions and unresolved gaps. | Plans are separated from shipped features |
| **[RSS](https://24go.top/engineering/feed.xml)** | Subscribe to published original engineering notes. | No real community activity feed yet |

## Product architecture and release status

![24GOTOP architecture and release boundaries: public OSS available, private hosted core gated, and community features planned.](docs/assets/24gotop-platform-map.svg)

| Area | Verified scope | What still needs work |
| --- | --- | --- |
| **PUBLIC OSS** — this repo | GitHub Pages site, source-backed engineering notes, local Draft Lab, local API/SDK demos, tests and CI | Human review of translations, independent accessibility and browser QA |
| **PRIVATE hosted core** — separate restricted repo | Private source and staging work exist; not packaged in public MIT repository | Verified Auth/JWT and RLS, restore rehearsal, moderator authorization, production release gates |
| **FUTURE community** | Product specification and public roadmap | User-generated posts/comments, verified AI identities, **separate** Agent Arena, reputation, safe static web-app Library |

**Design:** mobile-first, graphite / white / emerald, light and dark themes, accessible navigation, authentic multilingual content. **Agents must not automatically enter human discussions.** The future Library is limited to isolated static HTML/CSS/JS builds, not arbitrary backend execution.

**Ownership:** **Founder and official project lead: [@rf24kja](https://github.com/rf24kja).** Existing code is covered by the [MIT license](LICENSE): forks and independent deployment of licensed versions remain permitted. The official brand, domain, product governance and future separate hosted-core architecture are managed independently. See [GOVERNANCE.md](GOVERNANCE.md), [Brand Policy](BRAND_POLICY.md), [IP and Licensing](docs/IP_AND_LICENSING.md) and [open boundary decision #24](https://github.com/rf24kja/24GO.top/issues/24). No registered-trademark claim is made.

## Original engineering articles

These are **free, crawlable English guides** on real technical decisions. The links point to the public website; the original PRs, tests, limitations and source references are in each article.

| Developer question | Original guide |
| --- | --- |
| How do you localize a Markdown editor **without losing drafts**? | [Eight-language UI and unsaved-draft invariants](https://24go.top/engineering/multilingual-markdown-editor-without-losing-drafts.html) |
| How do you verify **GitHub Pages** deployed the latest build, not just pass CI? | [Real failed/successful external HTTPS verification](https://24go.top/engineering/verify-github-pages-deploy-not-just-ci.html) |
| How can Markdown citation links avoid **XSS**? | [Validated HTTP(S) URLs and safe DOM anchors](https://24go.top/engineering/safe-markdown-citation-links-without-xss.html) |
| How can JavaScript SDKs avoid **API key leakage**, even over HTTPS? | [Loopback-only credential boundary and adversarial tests](https://24go.top/engineering/javascript-sdk-api-key-leak-prevention.html) |
| How do technical articles become discoverable in **search and AI answers**? | [Canonical URL, sitemap, RSS and crawler checklist](https://24go.top/engineering/discoverable-technical-articles.html) |
| Why can PostgreSQL `INSERT` succeed but `RETURNING` fail? | [Least-privilege PostgreSQL permissions](https://24go.top/engineering/postgres-insert-returning-least-privilege.html) |
| Why is submission for moderation **not publication**? | [Draft → review → publication security boundaries](https://24go.top/engineering/submit-is-not-publish.html) |
| How do you preview Markdown **without running user HTML**? | [Restricted safe DOM rendering](https://24go.top/engineering/markdown-preview-safety.html) |
| Why build a local writer before public writes? | [Draft Lab and the security gate](https://24go.top/engineering/why-draft-lab-first.html) |

[**Browse all articles**](https://24go.top/engineering/) · [**RSS feed**](https://24go.top/engineering/feed.xml) · [Search / AI discovery plan](docs/EDITORIAL_SEARCH_DISCOVERY_PLAN.md)

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

The feed **starts empty by design**. The [local publishing demo](docs/DATABASE_SETUP.md) is intentionally separate and requires a private development-only bearer key. **Never expose the local write API, .env, or token on the public internet.** It is not an authenticated community publishing service. [SDK guide](docs/SDK_QUICKSTART.md) · [API documentation](API.md) · [OpenAPI contract](openapi/openapi.json).

## Contribute and improve the product

We welcome genuine independent issues, tests, documentation corrections, language reviews and small focused PRs. Useful starting points:

- [Good first tasks](docs/CONTRIBUTOR_START.md) and [contribution guide](CONTRIBUTING.md)
- [Review Russian and Thai translations](https://github.com/rf24kja/24GO.top/issues/8) — eight UI locales exist, but native-speaker review is pending
- [Test accessibility and keyboard navigation](https://github.com/rf24kja/24GO.top/issues/7)
- [Volunteer to test the Draft Lab](https://github.com/rf24kja/24GO.top/issues/29)
- [Discuss the first user-facing differentiator](https://github.com/rf24kja/24GO.top/issues/21) · [GitHub Discussions](https://github.com/rf24kja/24GO.top/discussions)

Before contributing, review the [security policy](SECURITY.md) and [public/private source boundary](docs/PUBLIC_PRIVATE_BOUNDARY.md). Do not submit real passwords, staging data, third-party copyrighted materials without rights, or proprietary hosted-core implementation to this MIT repository.

## Development evidence and next steps

**Read:** [Roadmap](docs/ROADMAP.md) · [CHANGELOG](CHANGELOG.md) · [Decision Log](docs/DECISION_LOG.md) · [Deployment Status](docs/DEPLOYMENT_STATUS.md) · [Growth Experiments](docs/GROWTH_EXPERIMENTS.md) · [OSS Impact Evidence](docs/OSS_IMPACT_EVIDENCE.md).

**P0 before hosted launch:** demonstrated database restore, signed multi-user JWT/RLS isolation, per-author ownership, moderation authorization, abuse protection and safe published content URLs. No source-level test or static landing page alone clears those gates.

---

<p align="center"><strong>Build knowledge people can verify.</strong></p>

[24go.top](https://24go.top/) · [Articles](https://24go.top/engineering/) · [GitHub Issues](https://github.com/rf24kja/24GO.top/issues) · [MIT license](LICENSE)

<sub>24GOTOP is an independent, founder-led initiative. No affiliation with AI model providers, no claimed users or grants, and no launched community publishing.</sub>
