# 24GOTOP public OSS delivery plan — temporary public-only focus

Updated: 2026-11-17 (Asia/Bangkok). Scope: **PUBLIC rf24kja/24GO.top and https://24go.top only.**

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
| P1 | Eight-language UI and accessible author/reader flows | Keyboard and screen-reader checks, 320–390px layouts, and native-speaker feedback recorded from real people |
| P2 | Static Library proof of concept | Only reviewed sandboxed HTML/CSS/JS; no arbitrary backend or public uploads without a separate threat model |

## Non-goals while hosted publishing is paused

Public static Pages cannot implement verified accounts, hosted writer drafts, authenticated publication, PostgreSQL-backed comments, production agent credentials or secure uploads on its own. The protected hosted publishing train remains **paused, not complete**. Do not infer hosted readiness from a public PR, CI pass or Pages deployment.

## Current verified public work

1. **Editorial and reader foundations:** PRs #187–#196 added source/CDN release auditing, local review safeguards, editorial synchronization, translated Draft Lab validation, keyboard-first archive search and an optional on-device reading list. PR #196's focus-preserving removal and live filtered-count announcement are already merged; this is no longer the current code task.
2. **Local AI-agent onboarding:** [PR #266](https://github.com/rf24kja/24GO.top/pull/266) merged on 17 November 2026 as [`896ca45c32a3ceaee7c2bb2cf653f82634446363`](https://github.com/rf24kja/24GO.top/commit/896ca45c32a3ceaee7c2bb2cf653f82634446363). It adds the public `/agents/` guide and a browser-only MCP configuration helper for the existing read-only article reader and human-reviewed editorial proposal workflow. The helper generates local configuration; it does not collect tokens, upload drafts, create hosted identities or publish articles automatically.
3. **Public CI:** [run #44046596576](https://github.com/rf24kja/24GO.top/actions/runs/44046596576) passed `npm run check`, `npm test` (**771/771 Node tests**), **612 Chromium viewport/layout checks**, and the existing Draft Lab, reader, Arena and Library browser flows.
4. **Pages delivery:** [run #44046596511](https://github.com/rf24kja/24GO.top/actions/runs/44046596511) deployed the exact merged SHA. Its delivery audit reported **83 canonical routes**, **8/8 essential assets** and **9/9 editorial assets** matching the public source.
5. **Independent live SEO/availability:** [run #44067685803](https://github.com/rf24kja/24GO.top/actions/runs/44067685803) passed on 17 November 2026. The public network check fetched `robots.txt`, `sitemap.xml`, RSS, JSON Feed 1.1, the `/agents/` page, localized entry points and the published engineering routes; canonical-host redirects also passed. This proves availability and crawlable assets at that check time, **not** search indexing, impressions, AI citations, readership or signups.

## Next evidence gates — do not simulate them

1. **Issue #29 — five-author Draft Lab pilot:** recruit five independent, consenting volunteers. Observe whether they can create, preview, copy/download and reopen a draft without coaching. Record only anonymized opt-in feedback. At least four of five must understand that the editor is browser-only: it does not upload, autosave or publish their work. Link the three strongest UX needs to real follow-up issues. No volunteer sessions have been counted yet.
2. **Issue #7 — manual accessibility:** complete keyboard-only walkthroughs and real VoiceOver, TalkBack or NVDA checks across desktop and mobile. Chromium automation is useful regression evidence, not a substitute for assistive-technology testing.
3. **Issue #8 — localization:** obtain fluent Thai and Russian review of the scoped interface strings. Do not claim native-speaker approval without an actual reviewer.
4. **Issue #94 — main-branch protection:** this is an owner-settings task, not a source-code task. The current GitHub branch response reports `main` as unprotected. The connected integration cannot change repository protection settings; the owner must follow [BRANCH_PROTECTION_RUNBOOK.md](BRANCH_PROTECTION_RUNBOOK.md), require the public `test` check, block force pushes/deletion, and attach sanitized verification before closing the issue.

The next highest-value progress is real volunteer, assistive-technology and language-review evidence—not another cosmetic PR or an article published only to increase count. Continue a new SDK/MCP or editorial feature only when it solves an independently demonstrated problem and can be tested without private services.

## Related public issues

- [#29](https://github.com/rf24kja/24GO.top/issues/29): independent Draft Lab usability pilot
- [#7](https://github.com/rf24kja/24GO.top/issues/7): manual keyboard and screen-reader accessibility
- [#8](https://github.com/rf24kja/24GO.top/issues/8): Thai and Russian localization review
- [#94](https://github.com/rf24kja/24GO.top/issues/94): owner-only main-branch protection
- [#186](https://github.com/rf24kja/24GO.top/issues/186): completed public-only release-audit hardening
