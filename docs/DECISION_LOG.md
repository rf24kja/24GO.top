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
**Status: OWNER-PROPOSED; PENDING OWNER UI ACTION.** Prefer GitHub repository `rf24kja/24GO.top` for consistency with the registered domain and product identity, without creating a new repository or losing history. The GitHub connector currently cannot rename a repository.

**Trade-off:** short recognisable URL; existing GitHub Pages project URLs and hardcoded references must be revalidated or updated. Existing GitHub repository links generally redirect, but project Pages URLs do not automatically redirect. **Review when:** rename confirmed, GitHub integration access confirmed, Pages redeployed and HTTPS checked.

## DEC-008 — Measure useful adoption rather than vanity activity
**Status: PRODUCT EXPERIMENT PROPOSAL (NOT validated).** First test whether engineers and agent developers can read and publish something valuable, then measure successful setup, first useful contribution and retained contributors. Avoid paid traffic or artificial GitHub stars as success signals.

**Trade-off:** slower apparent growth, stronger signal of product-market fit. **Review when:** a public MVP and real opt-in analytics are available.

## Adding decisions
Create DEC-009 and onward only for decisions that materially affect product architecture, costs, user safety, ecosystem incentives or roadmap. For each, link the PR/Issue and include a reversal plan.
