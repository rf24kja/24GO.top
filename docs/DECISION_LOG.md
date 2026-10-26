# 24GOTOP — Product & Architecture Decision Log

Decisions are durable product memory; code/CI shows what has actually been implemented. Each decision records **context, choice, alternatives, risks, review trigger**. Status distinguishes confirmed project direction from still-unconfirmed proposals.

## DEC-001 — Identity, mission and canonical domain
**Status: APPROVED PRODUCT DIRECTION.** 24GOTOP (domain `24go.top`) is an international, free-core knowledge network where humans and clearly identified AI agents share AI/technical news, guides, tools and developments. Building software is separate from launching a public service. Decisions do not imply real usage.

**Trade-off:** broad ambition demands a deliberately narrower safe initial release. **Review when:** target users fail to find a sufficiently distinctive core value.

## DEC-002 — Open-source foundation first
**Status: APPROVED PRODUCT DIRECTION; partly implemented.** Open SDK, API contracts, integrations, documentation and reviewable PR workflow make the ecosystem usable by independent contributors. A public repository does not necessarily mean every future hosted component must be open source.

**Trade-off:** reduced friction to contribute; added maintenance/security burden. **Review when:** project begins to ship hosted backend or licensing terms evolve.

## DEC-003 — Safe production publication is a release gate
**Status: APPROVED; NOT YET SATISFIED.** Never expose the shared-key JSON development publisher publicly. Implement verified accounts, PostgreSQL, authorization, scoped agent credentials, spam protection, moderation, backups and audit trails before public writes.

**Trade-off:** slower beta but protects participants and infrastructure. **Review when:** security test evidence and production runbook exist.

## DEC-004 — Agent Arena and content integrity
**Status: APPROVED PRODUCT DIRECTION; NOT IMPLEMENTED.** AI agents must have disclosed identity, human ownership and delegated permissions. Keep autonomous conversations separate from ordinary user discussion unless explicitly authorized. Rank genuine usefulness, not spammy activity.

**Trade-off:** more complex interaction model; better consent, clarity and trust. **Review when:** actual first-party agent usability tests exist.

## DEC-005 — Static-only app Library
**Status: APPROVED PRODUCT DIRECTION; NOT IMPLEMENTED.** Future Library accepts HTML/CSS/JS builds from ZIP/GitHub only. Arbitrary backend hosting is out of scope for v1; isolated domains, sandbox, quotas, abuse scanning and ownership validation are release blockers.

**Trade-off:** restrictive first release but smaller attack surface. **Review when:** sandbox threat model and operations budget are independently reviewed.

## DEC-006 — Hermes v8.1 as design input, real GitHub as implementation evidence
**Status: APPROVED WORKFLOW; FULL AUDIT PENDING.** The earlier Hermes Project Pack v8.1 is the intended architectural baseline. We must review its actual source files before calling the current repo compliant. Never change existing VPS services without approval. Hermes/Claude orchestration is planned, not deployed.

**Trade-off:** reconciliation work precedes ambitious new features; avoids redoing or silently contradicting prior product decisions. **Review when:** the archive is actually available and audited.

## DEC-007 — Repository rename to 24GO.top
**Status: COMPLETED — OWNER RENAMED REPOSITORY; PAGES RECHECK PENDING.** GitHub repository is now `rf24kja/24GO.top` for consistency with the registered domain and product identity, without creating a new repository or losing history. The GitHub connector currently cannot rename a repository.

**Trade-off:** short recognisable URL; existing GitHub Pages project URLs and hardcoded references must be revalidated or updated. Existing GitHub repository links generally redirect, but project Pages URLs do not automatically redirect. **Follow-up:** GitHub integration access to the new repository name is confirmed. Recheck GitHub Pages workflow, custom domain and HTTPS; hosted Pages URLs do not automatically redirect.

## DEC-008 — Measure useful adoption rather than vanity activity
**Status: PRODUCT EXPERIMENT PROPOSAL (NOT validated).** First test whether engineers and agent developers can read and publish something valuable, then measure successful setup, first useful contribution and retained contributors. Avoid paid traffic or artificial GitHub stars as success signals.

**Trade-off:** slower apparent growth, stronger signal of product-market fit. **Review when:** a public MVP and real opt-in analytics are available.

## Adding decisions
Create DEC-009 and onward only for decisions that materially affect product architecture, costs, user safety, ecosystem incentives or roadmap. For each, link the PR/Issue and include a reversal plan.

## DEC-009 — Founder ownership, branding and software licensing boundary
**Status: GOVERNANCE CONFIRMED; LICENSE ARCHITECTURE UNDER REVIEW.** The owner/founder [@rf24kja](https://github.com/rf24kja) retains management of the official 24GOTOP project, domain, service, infrastructure and roadmap, welcomes community contributions and wants to protect the future proprietary core. This must **not** be presented as exclusive copyright ownership of every contribution or as a retroactive restriction of existing MIT-licensed source.

**Alternatives:** (A) public open developer ecosystem plus separately private production core, preferred for further review; (B) new source-available restricted modules (not OSI open source); (C) fully OSS product with separate branding and founder-led governance. See [IP and Licensing Strategy](IP_AND_LICENSING.md).

**Next decision:** decide whether/which code moves to a new private clean-history repo, evaluate legal rights and downstream OSS program trade-offs, prepare contributor rights policy if needed. **Review when:** founder approves an explicit licensing structure after IP review. No production or license migration authorized by this entry alone.

## DEC-010 — Explore author UX before deploying public writes
**Status: PUBLIC UX EXPERIMENT ONLY; PRODUCT DECISION REQUIRES REAL FEEDBACK.** Provide a static Draft Lab that lets voluntary visitors type, preview and copy a plain-text technical draft without user accounts, persistence, external calls or publication. Preserve explicit notices of temporary browser-only behavior. See [PR #28](https://github.com/rf24kja/24GO.top/pull/28), [experiment](DRAFT_LAB_RESEARCH.md), and [publishing RFC #21](https://github.com/rf24kja/24GO.top/issues/21).

**Alternatives:** publish the prototype against shared local development credentials (unsafe), or block UX research until full Auth (slower feedback). **Trade-off:** the copy-only concept can test friction but cannot validate actual retention or network publication. **Review when:** five real voluntary testers have tried the UX and serious accessibility blockers are identified. **Rollback:** revert PR #28; production backend remains unaffected.

## DEC-011 — Draft export without premature server storage
**Status: SAFE PUBLIC UX INCREMENT; NO HOSTED STORAGE.** Add explicit Markdown file download and confirmation before clearing non-empty browser drafts. This addresses observable risk of losing text on refresh or when clipboard permissions are denied, without introducing accounts, storage, analytics or a server write API.

**Alternatives:** silent browser autosave (requires consent/retention/security policy), cloud drafts (blocked by Auth/security gates), copying alone (unreliable under clipboard restrictions). **Trade-off:** local file handling is more deliberate but portable and auditable. **Review when:** real testers report save/recovery friction or browser download accessibility issues. **Rollback:** revert the focused Draft Lab export PR; no server or database migration.

## DEC-012 — Public engineering content must be backed by source evidence
**Status: LIMITED EDITORIAL EXPERIMENT / PRE-LAUNCH.** Publish original, technically useful project notes with precise links to real PRs, runnable local examples, limitations and security boundaries. Keep publication through static GitHub Pages, entirely separate from the unlaunched public article write API. Expose a human-readable Engineering Notes page and RSS; attract external review honestly without inventing users or promising grants.

**Alternatives:** generic growth announcements (low verifiable value) or turning on public content writing prematurely (unsafe). **Trade-off:** manual quality editorial cadence scales slowly but supports meaningful community trust. **Review when:** real readers give technical feedback; stop if content becomes low-value promotion. **Rollback:** revert the source-backed content PR; no database, DNS, or production publishing changes.

## DEC-013 — Keep accessibility feedback and load correctness in the reader MVP
**Status: PARTIAL SOURCE IMPLEMENTATION; MANUAL VERIFICATION PENDING.** Use native links, buttons, named regions, status announcements and visible keyboard focus across narrow screen widths. Prevent stale asynchronous feed results from replacing the currently selected category; never treat simulated-DOM tests as a screen-reader certification.

**Alternatives:** leave mobile navigation hidden to simplify the layout (unacceptable for contributor discovery), or wait for complete product redesign (slows real usability fixes). **Trade-off:** slightly more UI logic and layout complexity, but fewer accessibility and state-consistency traps. **Review when:** independent 320px, keyboard, screen-reader and translated-label QA from [Issue #7](https://github.com/rf24kja/24GO.top/issues/7) is recorded. **Rollback:** revert the focused reader accessibility PR; no production service change.

## DEC-014 — Reopening drafts without cloud storage
**Status: PUBLIC UX EXPERIMENT IMPLEMENTED IN SOURCE; REAL RETURN USE UNVERIFIED.** Allow a person to return to the static Draft Lab and reopen their **own prior exported Markdown document**, restoring validated title, language, category, source and article body locally. No persistent browser storage, backend writes, login, analytics or user uploads are introduced. [PR #35](https://github.com/rf24kja/24GO.top/pull/35) · [Returning Author Pilot](RETURNING_AUTHOR_PILOT.md).

**Alternatives:** only download and continue writing in another editor (poor continuity); automatically save in browser (additional retention/privacy concerns); hosted drafts (blocked until secure user identity, moderation and private-core decision). **Trade-off:** users must manage files explicitly and browser file-picker behavior varies by device. Strictly support our current export format instead of pretending to ingest arbitrary Markdown. **Review when:** five genuine opt-in authors try a second-session import on real devices and report blockers. **Rollback:** revert PR #35, with no database migration or change to existing MIT licenses.

## DEC-015 — Best-effort protection for unsaved browser drafts
**Status: SOURCE IMPLEMENTED IN PR #42; REAL BROWSER TESTING PENDING.** Add a conservative `beforeunload` guard when the in-tab article is new or diverges from a user-reopened local Markdown file. Reopening a file creates the in-memory baseline; an explicit Clear removes it. Clipboard copy and download *requests* do not count as confirmed saves. Do not retain content in localStorage, sessionStorage, telemetry or a backend.

**Alternatives:** browser autosave (introduces retention expectations and privacy review), no warning (avoidable content loss), treating download click as definitely saved (false guarantee). **Trade-off:** browsers may suppress generic exit dialogs and new drafts can prompt even after a download request, but the design avoids falsely claiming persistence. **Review when:** real mobile and desktop users test navigation/refresh and confirm file recovery. **Rollback:** revert the focused UI PR; no database, DNS, production or privacy policy migration.
