# 24GOTOP public OSS delivery plan — temporary focus

Updated: 2026-11-10. Scope: **PUBLIC rf24kja/24GO.top only**. Founder directive: **NO GitHub Actions** in the public or private workflow.

## Rules
- Do not modify, mirror, quote or publish files from private `24GO.online`. Hosted authentication, moderation, PostgreSQL schema, deployment secrets and production configuration remain private.
- Prefer one vertical improvement per branch. Use local Node/static tests and independent HTTPS verification, **not GitHub Actions**. Until repository-level Actions are confirmed disabled, avoid creating PRs or pushing main commits that can trigger legacy workflows. See [no-Actions release procedure](NO_ACTIONS_RELEASE.md).
- Do not trigger, depend on, or propose GitHub Actions. Six legacy workflow YAML files remain in main and have not yet been retired; disabling them at repository level, replacing the deployment path, and migrating workflow-specific tests are tracked in [Issue #186](https://github.com/rf24kja/24GO.top/issues/186). Do not move proprietary code to public source.
- A green test, merged PR, Pages deployment, and proven live HTTPS behavior are different statuses. Verify the deployed URL independently, and preserve a rollback path.
- Accept only source-backed public metrics: deployed pages/articles, external contributions, SDK/MCP tests and genuine user feedback. No fabricated community activity.

## Prioritized deliverables

| Priority | Public vertical slice | Acceptance |
| --- | --- | --- |
| P0 OSS | Draft Lab → public proposal → human review → independently verified static publication | Manuscript stays local until explicit consent; the GitHub proposal contains only opted-in public metadata. Published article requires reviewed source, independent local checks, live canonical URL and correct index/feed/sitemap. |
| P0 OSS | Editorial proposal board | Consent-gated metadata reads with bounded same-origin GitHub API pagination; honest status and no leaked drafts. |
| P1 | Developer onboarding, read-only SDK/MCP and article examples | Runnable usage examples and negative input/network tests with no backend privileges. |
| P1 | Eight-language UI, accessibility and mobile navigation | Keyboard/assistive-tech checks, visible focus, readable 320–390px layout; review translations with volunteers. |
| P2 | Static Library proof of concept | Only sandboxed HTML/CSS/JS bundles, no arbitrary backend or cross-origin credential access; security review before hosting user uploads. |

## Explicit non-goals while private Core is paused

The public static site cannot by itself provide authenticated hosted author publishing, protected moderation, PostgreSQL-backed comments or private Library uploads. Do not label the platform ready for general user registration based on OSS progress. Resume the separately protected private P0 release gates when the founder permits private Actions or supplies a verified alternative runner.

## Current public-only delivery sequence

1. **Completed:** consent-based proposal pagination (PR #177), exact byte-based Pages verification improvements (PRs #178/#183), latest Unicode-headline fix (PR #185). Those commits do not by themselves prove the newest live deployment.
2. **Current source-only slice (branch; not yet merged):** a vendor-independent, read-only static audit scans every canonical sitemap URL plus fixed Draft Lab/editorial assets and compares local source with public HTTPS. Six local fixture tests pass; actual live verification is pending.
3. **Next:** disable GitHub Actions in repository settings, prepare a non-Actions static preview deployment, replace Pages-only release receipts, and retire old workflows/tests without breaking the existing public website. [Migration issue #186](https://github.com/rf24kja/24GO.top/issues/186).
4. **Then:** ship one additional real editorial contribution through reviewed static source, verify article metadata/indexes and actual public canonical HTTPS, followed by public SDK/MCP, accessibility and localization.
