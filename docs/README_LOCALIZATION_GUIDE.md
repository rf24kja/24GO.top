# Maintaining the international 24GOTOP GitHub README

**Purpose:** Keep GitHub discovery, onboarding and contributor expectations consistent across eight languages without misleading potential users.

## File map

| Language | Repo README |
| --- | --- |
| English (source of truth) | [README.md](../README.md) |
| Русский | [README.ru.md](i18n/README.ru.md) |
| ไทย | [README.th.md](i18n/README.th.md) |
| Español | [README.es.md](i18n/README.es.md) |
| Français | [README.fr.md](i18n/README.fr.md) |
| Deutsch | [README.de.md](i18n/README.de.md) |
| Português | [README.pt.md](i18n/README.pt.md) |
| 中文 (Simplified) | [README.zh.md](i18n/README.zh.md) |

Each file includes real translated narrative, currently available static resources, original English articles, reproducible local commands, the security/release boundary, the founder and legitimate MIT-license rights. **Translations are first-pass and require independent human language review.** Open [Issue #8](https://github.com/rf24kja/24GO.top/issues/8) for corrections; do not imply that native speakers or screen-reader users have approved them.

## Original, accessible vector images

- [Hero / brand banner](assets/24gotop-readme-hero.svg): self-contained SVG, graphite and emerald, independent of live external image hosts. Describes pre-launch status.
- [Product map](assets/24gotop-platform-map.svg): an accessible text-alternative diagram with clear **available**, **private and gated**, and **planned** boundaries. The image is not a security proof or product launch evidence.
- [Author journey](assets/24gotop-writer-journey.svg): four available browser-only steps (write, preview, download, reopen) deliberately separated from future authenticated moderation and hosting; it must never imply the local file is published automatically.
- SVGs have fixed viewBoxes, title/description elements and no JavaScript, external images, foreign objects, arbitrary fonts or animations. Markdown captions and status tables remain readable when images are disabled or GitHub doesn't display the SVG.

## README information architecture and source-of-truth checks

The main README is the authoritative English overview. It should help three audiences in their first minute: **readers** (technical articles and RSS), **authors** (what browser-only Draft Lab can and cannot do), and **developers** (no-key local API, SDK, source, tests and safe contributions). Keep the first screen concise; place deep detail in navigable sections and linked documentation.

When new content or features are added, update the root overview, current-vs-future capability table, all necessary image text alternatives, the appropriate localized short summaries, source-backed article links and relevant tests. The new author-journey diagram is not a substitute for textual steps and warnings.

The optional README FAQ should never give private hosted-core deployment instructions, promise user registration or claim tested AI agents. A documented **P0 gate** is not a shipped product capability. The public developer server uses a deliberately local-only shared development key in its optional write demo; no hosted write path may be derived from it.

Structural checks in `tests/readme-presentation.test.mjs` cover all eight locale pages, repository-relative links, diagram accessibility and safety, actual article URLs, public/private boundaries, and the real workflow. Tests cannot substitute for native-language proof-reading or human evaluation of GitHub's rendered SVG contrast.

## Contribution rules

1. Update factual product status **from current main/CI/deployment evidence**, never from old promises. Sync English README and each affected language version in the same PR or explicitly file a translation follow-up.
2. Keep all original technical guides discoverable through the English README; link localized project descriptions to the canonical article URLs rather than making low-quality search duplicates.
3. A language selector in the Draft Lab is **not proof of a translated public article corpus**. Public editorial articles are English; the README translations are GitHub documentation, not locale-specific hosted article pages.
4. Preserve the local quickstart without exposing development write keys, any `.env`, private hosted-core implementation or secrets. Distinguish local API/SDK demos from production API, and public GitHub Pages static HTML from the hosted community.
5. Preserve MIT rights and the founder's official brand governance. Do not imply a registered trademark, exclusive ownership of previously released MIT code, imaginary user statistics, grants, or model-provider partnerships.
6. Avoid live third-party images, badge services that disclose visitors to trackers, scripts, bloated screenshots that become stale, or redirection tricks. Favor optimized self-contained vector source and descriptive text.
7. Validate all internal image/document links, locale navigation, preview alt descriptions and test the README on mobile and in light/dark GitHub themes when possible. `npm test` runs structural tests; it **does not** replace native-language, real-browser or accessible screen-reader review.

## Live site and SEO / AI discovery boundary

The GitHub README helps visitors understand and evaluate the repo, and links to [canonical HTML technical articles](https://24go.top/engineering/). It does not itself prove indexing or create translated hosted article URLs. [Search and AI discovery plan](EDITORIAL_SEARCH_DISCOVERY_PLAN.md) tracks independent public HTTPS delivery, Search Console, Bing indexing, and actual AI citations separately. Do not invent rankings or synthetic community engagement.
