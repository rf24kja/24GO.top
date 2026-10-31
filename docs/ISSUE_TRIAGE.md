# 24GOTOP — open-work register and closure rules

**Evidence snapshot:** 31 October 2026 (Asia/Bangkok). This register reconciles source-backed work and public issue state; it is **not** a claim that hosted community publishing, verified agent login, or real user comments have launched.

**As checked:** 11 PUBLIC issues remain open after closing superseded public implementation issues [#14](https://github.com/rf24kja/24GO.top/issues/14) and [#15](https://github.com/rf24kja/24GO.top/issues/15) with GitHub's `not_planned` reason. Their original work **was not completed**; new hosted-specific implementation belongs to the access-controlled private Core, and [public parent #2](https://github.com/rf24kja/24GO.top/issues/2) stays open for honest visibility. An additional 8 PRIVATE issues and **5** private PRs remain open as of this snapshot: four existing P0 review-train PRs (#131–#134) and the separate pending staff-pagination PR #136. All remain unmerged.

## The *one* first-release blocker chain (P0)

The private hosted Core maintains a single access-controlled P0 release-train issue. Do not create another parallel private implementation PR or self-approve an author-owned PR. The **verified current constraints** are:

1. Four existing private security/quality PRs have green Node/disposable PG17 checks, but **zero independent submitted reviews**. The first PR has no requested reviewer; source-test success does not substitute for independent review.
2. The isolated staging PostgreSQL foundation has row-level security, but public authenticated write authorization has **not** passed a signed two-author test. Do not grant broad table insert/update to make a demo work.
3. An isolated, verified actual-backup restore with role/ACL/RLS reconciliation is still required; a disposable schema regression is **not** a restore of the real archive.
4. A verified, non-forgeable AAL2 staff identity, atomic moderation decision, audit and takedown need real evidence before public publication.
5. Open invite-only publishing only after all previous gates pass, with exact deployment, monitoring, privacy and rollback evidence. Never make the shared local JSON/dev-key publisher publicly reachable.

**Owner-only dependency A:** authorize/request a *different human's* GitHub review of the first private P0 PR. Access to the repository, a verbal permission and the PR author's own review do **not** count as a submitted independent review. **Owner-only dependency B:** arrange a separately approved, isolated real backup restore and provider-signed A/B test without exposing tokens to GitHub. **Owner-only dependency C:** configure branch protections after confirming repository plan/permissions.

## Public issue ownership and a testable completion criterion

| Open issue | Why it stays open | Concrete closure proof / next action |
| --- | --- | --- |
| [#2 Persistent authorized publication](https://github.com/rf24kja/24GO.top/issues/2) | No real hosted first-post release | Independent private P0 security, restore, signed-user ownership, reviewer AAL2 and first real published article proven; don't count local JSON demo |
| [#24 Licensing and source boundary](https://github.com/rf24kja/24GO.top/issues/24) | Architecture approved, provenance and repo-control hardening incomplete | Rights/dependency provenance review, separation checks and owner security settings evidence |
| [#94 Protected main](https://github.com/rf24kja/24GO.top/issues/94) | Rulesets listing empty; branch protection endpoint inaccessible to integration | Owner configures `main` protections; required CI, no force pushes and test PR verified before closure |
| [#38 Cross-user security](https://github.com/rf24kja/24GO.top/issues/38) | Structural SQL/CI ≠ real cross-user Auth and moderation proof | Distinct signed real test A/B with nonempty synthetic fixtures, audit and denied foreign writes |
| [#7 Accessibility](https://github.com/rf24kja/24GO.top/issues/7) | Source tests cannot certify assistive technology | Manual keyboard/320–390px and screen-reader QA with documented outcomes and fixes |
| [#8 Russian/Thai localization](https://github.com/rf24kja/24GO.top/issues/8) | Static translated homepage and editor strings not reviewed by fluent speakers | Native-speaking RU/TH review, screenshots for mobile wraps and verified wording |
| [#4 Contributor onboarding](https://github.com/rf24kja/24GO.top/issues/4) | Docs exist; international on-device onboarding remains unproven | Run OS-specific setup checks, accessible contribution entry and genuine feedback |
| [#29 Five-author pilot](https://github.com/rf24kja/24GO.top/issues/29) | No measured independent volunteer sessions | Five consented author trials, reported errors and updated usability results |
| [#21 First differentiator RFC](https://github.com/rf24kja/24GO.top/issues/21) | Publishing-first direction approved, real pilot outcome missing | Real author/reader feedback and safe first-post evidence before decision retrospective |
| [#18 Welcome / community thread](https://github.com/rf24kja/24GO.top/issues/18) | A community announcement, not engineering work; conversion still pending | Owner uses GitHub **Convert to discussion** to preserve history. Do not close first and lose the requested conversion |
| [#46 Comments RFC](https://github.com/rf24kja/24GO.top/issues/46) | Post identity and moderation safety not released | Threat-modeled multilingual threaded comments and human/agent boundary review only after secure publication |

## Non-P0 private work — not closed to make the board look green

- **Auth password safety:** leaked-password protection warning must be evaluated against actual plan eligibility; do not silently change the Auth provider or claim that a password warning equals an intrusion.
- **Foreign-key indexing:** INFO-only performance advice requires an evidence-based migration, not index churn on an empty staging project.
- **Admin endpoint, MFA and staff identity:** require actual provider Auth, permissions, MFA/AAL2 and security checks before an admin hostname or reviewer action is publicly exposed.
- **Private post lifecycle and staging RLS:** implementation PRs and disposable CI are not the same as an approved, signed end-to-end release.
- **Staff pagination PR #136:** source and disposable PG17 regressions exist, but it is a fifth open private PR, not an independently approved, deployed moderation interface. Do not merge it ahead of the P0 review train just to reduce the PR counter.

## Definition of **done** for any future issue closure

1. Check the **current** main SHA, open PRs, conflicting changes, roadmap and scope of public MIT versus private hosted Core.
2. Provide a commit/merged PR, exact-head green CI and relevant manual or external acceptance results. URL reachability is not proof of browser interactions or user adoption.
3. Close as `completed` only if all acceptance criteria are met. Close as `not_planned` only for a documented superseded/duplicated **scope**, with a successor and explicit notice that original work is unfinished.
4. Do not close owner-setting, signed-user, real restore, human translation or human usability issues using simulated/structural tests.
5. For private implementation, preserve the canonical single P0 queue. Do not publish proprietary code or secrets in public MIT source or issue comments.
6. Update CHANGELOG, decision log, source docs, dependent issues and any externally displayed release wording after actual verified changes.

## Owner action checklist (no credentials required in chat)

- [ ] Appoint a qualified independent GitHub reviewer for the first private PR; ask for a substantive **Review**, not merely access.
- [ ] Protect public `main` at GitHub **Settings → Branches / Rulesets**, requiring PR and passing `test`, blocking force pushes and deletion. Verify with a harmless PR.
- [ ] Approve a disposable restore plan for the owner-held backup and real two-user Auth proof through private secure channels.
- [ ] Recruit opt-in volunteers and RU/TH reviewers; no fabricated metrics or anonymous session screenshots.

**Policy:** Closing an issue is not a product release. The public [Development page](https://24go.top/progress.html) and [README](../README.md) describe what visitors can actually use today.
