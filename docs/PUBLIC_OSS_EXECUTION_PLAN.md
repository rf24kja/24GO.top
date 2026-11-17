# 24GOTOP public OSS delivery plan — temporary public-only focus

Updated: 2026-11-17 (Asia/Bangkok), during the local BYOK agent-authoring MCP slice. Scope: **PUBLIC rf24kja/24GO.top and https://24go.top only.**

## Founder release and CI boundary

- Work only in this public repository and its public GitHub Pages content.
- Public GitHub Actions and the existing free Pages workflow are allowed when a useful public OSS change requires them.
- Do not inspect, edit, run workflows for, deploy, or migrate PRIVATE `24GO.online` or any other private project. Do not move private code, configuration, identities, data or secrets into this repository.
- Do not touch production DNS, Supabase, Vercel or paid services.
- A green PR, a merged commit, a Pages deployment and an independent live HTTPS verification are separate evidence states.
- GitHub Pages is static. It does not provide verified accounts, hosted author drafts, authenticated publication, moderated comments or production agent credentials.

## Rules

- Keep the manuscript local until an author explicitly chooses to share a bounded proposal. A GitHub proposal is not a published article.
- Human review remains mandatory before an article PR is merged and published to Pages.
- Prefer one focused vertical slice per branch. Run the public Node and browser checks, inspect the diff, and squash only after the public PR checks are green.
- Publish only reviewed `site/` files through the existing public Pages workflow. Preserve exact-commit release receipts and post-deploy source/HTTPS checks. See [PUBLIC_RELEASE_AUDIT.md](PUBLIC_RELEASE_AUDIT.md).
- Keep examples read-only and secret-free by default. Never place a public write key, personal access token, private key, private draft or hosted-core implementation in browser code.
- Do not publish repetitive articles, fabricate feedback or adoption, or describe static prototypes as a launched community.

## Prioritized public deliverables

| Priority | Public vertical slice | Acceptance |
| --- | --- | --- |
| P0 OSS | Draft Lab → bounded GitHub proposal → human review → article PR → Pages | Full manuscript stays local until explicit consent; a human reviews source rights and claims; only the merged article enters canonical HTML, RSS/JSON Feed and sitemap |
| P0 OSS | Reliable public release checks | Public CI passes; Pages receipt identifies the exact commit/run; independent HTTPS audit verifies canonical routes and exact source assets |
| P1 | Read-only SDK/MCP and local agent onboarding | No-key reader examples; local configuration generation; bounded inputs; negative tests; editorial writes remain separately operator-approved and human-reviewed |
| P1 | Local signed-agent article publication MCP | Preview-only by default; exact package digest and explicit operator opt-in are required for one public DRAFT PR; human review and merge remain mandatory; no hosted identity, auto-merge or deployment |
| P1 | Local BYOK agent authoring MCP | One explicitly consented model call per process; private signed manuscript and publication digest; no public write until separate exact-digest-approved publication MCP and human review |
| P1 | Eight-language UI and accessible author/reader flows | Keyboard and screen-reader checks, 320–390px layouts, and native-speaker feedback recorded from real people |
| P2 | Static Library proof of concept | Only reviewed sandboxed HTML/CSS/JS; no arbitrary backend or public uploads without a separate threat model |

## Non-goals while hosted publishing is paused

Public static Pages cannot implement verified accounts, hosted writer drafts, authenticated publication, PostgreSQL-backed comments, production agent credentials or secure uploads on its own. The protected hosted publishing train remains **paused, not complete**. Do not infer hosted readiness from a public PR, CI pass or Pages deployment.

## Current verified public work

1. **Editorial and reader foundations:** PRs #187–#196 added source/CDN release auditing, local review safeguards, editorial synchronization, translated Draft Lab validation, keyboard-first archive search and an optional on-device reading list. PR #196's focus-preserving removal and live filtered-count announcement are already merged; this is no longer the current code task.
2. **Local AI-agent onboarding:** [PR #266](https://github.com/rf24kja/24GO.top/pull/266) merged on 17 November 2026 as [`896ca45c32a3ceaee7c2bb2cf653f82634446363`](https://github.com/rf24kja/24GO.top/commit/896ca45c32a3ceaee7c2bb2cf653f82634446363). It adds the public `/agents/` guide and a browser-only MCP configuration helper for the existing read-only article reader and human-reviewed editorial proposal workflow. The helper generates local configuration; it does not collect tokens, upload drafts, create hosted identities or publish articles automatically.
3. **Local signed-agent article publication MCP:** [PR #268](https://github.com/rf24kja/24GO.top/pull/268) merged on 17 November 2026 as [`205119ba3028f98a54f7918f60be2fb7eb4bc75e`](https://github.com/rf24kja/24GO.top/commit/205119ba3028f98a54f7918f60be2fb7eb4bc75e). The local `npm run mcp:publication` workflow verifies a manuscript against an independently pinned Ed25519 public key and expected local owner/agent IDs, requires a separate reviewed summary and explicit UTC publication time, and builds the canonical article plus feed, archive, search, reader-allowlist, related-reading and sitemap changes. Preview is offline. A process-level opt-in, exact package SHA-256 approval and repository-scoped GitHub token permit one DRAFT PR only. The complete manuscript becomes public in that PR; the tool never merges, deploys, writes a hosted database or creates a hosted agent identity. **This is not an authenticated hosted publishing API.**
4. **Publication source-snapshot integrity:** [PR #270](https://github.com/rf24kja/24GO.top/pull/270) merged on 17 November 2026 as [`b46380df298e901865b53c7898feefe49fc5d8c7`](https://github.com/rf24kja/24GO.top/commit/b46380df298e901865b53c7898feefe49fc5d8c7). The publication MCP now pins a clean local `main` SHA before reading any static sources, rechecks after package generation and before a write, exposes the source SHA in preview metadata, and rejects checkout drift. It prevents stale feeds/archive/sitemap from being paired with a newer remote base.
5. **PR validation:** [run #44124438095](https://github.com/rf24kja/24GO.top/actions/runs/44124438095) passed `npm run check`, **781/781 Node tests**, 612 Chromium mobile/tablet/desktop layouts and the Draft Lab, reader, Arena and Library browser flows.
6. **Post-merge CI:** [run #44124755864](https://github.com/rf24kja/24GO.top/actions/runs/44124755864) passed on the merged commit with **781/781 Node tests**, 612 Chromium layouts and the public browser E2E suites.
7. **Pages delivery:** [run #44124755865](https://github.com/rf24kja/24GO.top/actions/runs/44124755865) deployed exact SHA `205119ba3028f98a54f7918f60be2fb7eb4bc75e`. Its release audit verified **8/8 essential assets** and **9/9 editorial assets** byte-for-byte.
8. **Independent live SEO/availability:** [run #44124856887](https://github.com/rf24kja/24GO.top/actions/runs/44124856887) passed after that deployment. The public network check fetched `robots.txt`, `sitemap.xml`, RSS, JSON Feed 1.1, `/agents.json`, `/agents/`, localized entry points and published engineering routes; canonical-host redirects also passed. This proves delivery and crawlable assets at that check time, **not** search indexing, impressions, AI citations, readership or signups.
9. **Source-snapshot post-merge CI:** [run #44126499733](https://github.com/rf24kja/24GO.top/actions/runs/44126499733) passed after PR #270 with `npm run check`, **783/783 Node tests**, 612 Chromium layouts and the Draft Lab, reader, Arena and Library browser flows. PR #270 changed the local publication tool and documentation, not public static assets; the previously verified Pages content remains unchanged.

**Important unverified boundary:** PR #268's GitHub write path is covered by mocked GitHub API tests, not a real token-based submission. No sample article was created or published by this release; the live RSS/feed/sitemap contain no article generated by the new MCP. Before first live use, validate with a non-confidential sample, inspect the exact preview and all public files, and explicitly approve the digest and repository-scoped token. Never test with private client material.

## Next evidence gates — do not simulate them

1. **First authoring MCP smoke:** connect `npm run mcp:authoring` to a non-confidential sample brief and a model endpoint the owner has approved. Confirm one request, a private signed output bundle, correct publication digest and no GitHub/public write. No provider credentials or sample content are available to this public-only task, so this evidence is not yet claimed.
2. **First operator validation of publication MCP:** run preview-only with a non-confidential signed sample. If a real public DRAFT PR is later required, the owner must inspect the complete package and authorize the exact digest and least-privilege token. A mocked API test is not evidence of a live GitHub write.
3. **Issue #29 — five-author Draft Lab pilot:** recruit five independent, consenting volunteers. Observe whether they can create, preview, copy/download and reopen a draft without coaching. Record only anonymized opt-in feedback. At least four of five must understand that the editor is browser-only: it does not upload, autosave or publish their work. Link the three strongest UX needs to real follow-up issues. No volunteer sessions have been counted yet.
4. **Issue #7 — manual accessibility:** complete keyboard-only walkthroughs and real VoiceOver, TalkBack or NVDA checks across desktop and mobile. Chromium automation is useful regression evidence, not a substitute for assistive-technology testing.
5. **Issue #8 — localization:** obtain fluent Thai and Russian review of the scoped interface strings. Do not claim native-speaker approval without an actual reviewer.
6. **Issue #94 — main-branch protection:** this is an owner-settings task, not a source-code task. The current GitHub branch response still reports `main` as unprotected. The connected integration cannot change repository protection settings; the owner must follow [BRANCH_PROTECTION_RUNBOOK.md](BRANCH_PROTECTION_RUNBOOK.md), require the public `test` check, block force pushes/deletion, and attach sanitized verification before closing the issue.

The next highest-value progress is real operator validation and human evidence—not another cosmetic PR or an article published only to increase count. Continue a new SDK/MCP or editorial feature only when it solves an independently demonstrated problem and can be tested without private services.

## Related public issues

- [#29](https://github.com/rf24kja/24GO.top/issues/29): independent Draft Lab usability pilot
- [#7](https://github.com/rf24kja/24GO.top/issues/7): manual keyboard and screen-reader accessibility
- [#8](https://github.com/rf24kja/24GO.top/issues/8): Thai and Russian localization review
- [#94](https://github.com/rf24kja/24GO.top/issues/94): owner-only main-branch protection
- [#186](https://github.com/rf24kja/24GO.top/issues/186): completed public-only release-audit hardening
