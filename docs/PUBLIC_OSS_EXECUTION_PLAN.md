# 24GOTOP public OSS delivery plan — temporary public-only focus

Updated: 2026-11-11 (Asia/Bangkok). Scope: **PUBLIC rf24kja/24GO.top and https://24go.top only.**

## Founder release/CI decision (2026-11-10)

**GitHub Actions are allowed in PUBLIC 24GO.top. GitHub Actions are prohibited in PRIVATE 24GO.online because private-repository usage is billable.** Do not run, enable, dispatch, depend on, or change private workflows. Do not move proprietary private code to the public repository to avoid charges.

Use public repository CI and its existing GitHub Pages deployment checks. Node.js tests, database fixtures (where applicable), and independent HTTPS verification remain separate quality gates. A green PR, a merged commit, a deployed Pages release and a verified canonical live HTTPS URL are four distinct evidence states.

## Rules

- Do not modify, mirror, quote or publish files from private `24GO.online`. Private authentication, moderation, operational PostgreSQL code, deployment secrets and production configuration remain off-limits.
- Prefer one vertical improvement per branch, run Node tests locally when possible, require a green **public** test check, review security and merge tested changes with squash.
- Publish only reviewed `site/` files using the **public** Pages workflow, keeping the exact-commit release receipt and the post-deploy external HTTPS checks. The independent full-inventory verifier is an additional gate: [PUBLIC_RELEASE_AUDIT.md](PUBLIC_RELEASE_AUDIT.md).
- Never claim GitHub Pages, CI or a PR is a hosted community launch. No fake metrics or public dev write keys.

## Prioritized deliverables

| Priority | Public vertical slice | Acceptance |
| --- | --- | --- |
| P0 OSS | Draft Lab → public proposal → human review → verified static publishing | Manuscript stays local until explicit consent; approved public article is reviewed, indexed in RSS/JSON/sitemap and verified on canonical HTTPS |
| P0 OSS | Editorial proposal board | Bounded, consent-gated read-only public GitHub issue metadata; no private drafts or remote write keys |
| P0 OSS | Reliable public release checks | Public CI passes and post-deploy audit verifies SHA/run receipt, critical assets, editorial assets and canonical sitemap routes |
| P1 | Developer onboarding and read-only SDK/MCP | Runnable no-secret examples with negative network/input tests |
| P1 | Eight-language UI and accessible mobile editor | Keyboard, 320–390px and native-speaker feedback recorded from real tests |
| P2 | Static Library proof of concept | Only safe sandboxed HTML/CSS/JS, no arbitrary backend or public uploads without a threat model |

## Non-goals while private hosted Core is paused

Public static Pages cannot implement verified accounts, hosted writer drafts, moderated PostgreSQL-backed comments, production agent credentials or secure uploads on its own. Those remain separate private release gates. Do not use private Actions even when development of the private Core eventually resumes.

## Current verified work and next sequence

1. **Verified public release:** PRs #187–#191 established independent source/CDN auditing, safe local review copies and 98 real Chromium layout tests. The 11 November Bangkok release in public PR #192 published the twelfth original engineering article and was verified on 49 canonical/fixed HTTPS routes, including exact CSS and metadata.
2. **Current public slice:** consolidate the approved RSS + article HTML + archive inputs into a one-command, local-only synchronization of all derived discovery outputs and the verified reader Save-for-later manifest. The public Node/Chromium suite must stay green.
3. **Next:** test the Draft Lab and GitHub proposal path with five consenting real contributors (Issue #29), then improve keyboard, screen-reader and localized mobile UX using observed findings, not invented completion statistics.
4. Continue public read-only SDK/MCP and SEO/discovery improvements. The protected hosted-account, moderation and database publication P0 remains separately blocked by the explicit private-repository pause.

## Related issues

- [#29](https://github.com/rf24kja/24GO.top/issues/29): independent Draft Lab usability pilot
- [#94](https://github.com/rf24kja/24GO.top/issues/94): branch protection
- [#186](https://github.com/rf24kja/24GO.top/issues/186): completed public-only release-audit hardening (Actions permitted in PUBLIC, prohibited in PRIVATE)
