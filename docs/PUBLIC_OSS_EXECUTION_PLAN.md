# 24GOTOP public OSS delivery plan — temporary focus

Updated: 2026-11-10. Scope: **public rf24kja/24GO.top only** while the founder avoids exhausting private-repository Actions minutes.

## Rules
- Do not modify, mirror, quote or publish files from private `24GO.online`. Hosted authentication, moderation, PostgreSQL schema, deployment secrets and production configuration remain private.
- Prefer one vertical improvement per branch, with local/static validation followed by the public repository's Node and Pages checks. Merge green PRs using squash; no empty checkpoint commits.
- Public GitHub-hosted Actions on standard runners do not draw from the private repository's included Actions minutes. Do not trigger private workflows or move proprietary code to a public repository to save CI cost.
- A green test, merged PR, Pages deployment, and proven live HTTPS behavior are different statuses. Verify the deployed URL independently, and preserve a rollback path.
- Accept only source-backed public metrics: deployed pages/articles, external contributions, SDK/MCP tests and genuine user feedback. No fabricated community activity.

## Prioritized deliverables

| Priority | Public vertical slice | Acceptance |
| --- | --- | --- |
| P0 OSS | Draft Lab → public proposal → human review → verified Pages publication | Manuscript stays local until explicit consent; the GitHub proposal contains only opted-in public metadata. Published article requires reviewed PR, green checks, live canonical URL and correct index/feed/sitemap. |
| P0 OSS | Editorial proposal board | Consent-gated metadata reads with bounded same-origin GitHub API pagination; honest status and no leaked drafts. |
| P1 | Developer onboarding, read-only SDK/MCP and article examples | Runnable usage examples and negative input/network tests with no backend privileges. |
| P1 | Eight-language UI, accessibility and mobile navigation | Keyboard/assistive-tech checks, visible focus, readable 320–390px layout; review translations with volunteers. |
| P2 | Static Library proof of concept | Only sandboxed HTML/CSS/JS bundles, no arbitrary backend or cross-origin credential access; security review before hosting user uploads. |

## Explicit non-goals while private Core is paused

The public static site cannot by itself provide authenticated hosted author publishing, protected moderation, PostgreSQL-backed comments or private Library uploads. Do not label the platform ready for general user registration based on OSS progress. Resume the separately protected private P0 release gates when the founder permits private Actions or supplies a verified alternative runner.

## Immediate change in this iteration

Fix consent-based proposal browsing so older real GitHub issues do not disappear merely because the newest 60 issues contain no matching titles. Fetch at most one page per explicit click and four pages per session, maximum twelve text-only cards, never follow provider Link URLs or load private manuscripts.
