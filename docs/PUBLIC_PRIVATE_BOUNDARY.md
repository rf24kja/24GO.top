# 24GOTOP — Public OSS / Private Hosted Core Boundary

**Decision date:** 2026-10-26. **Status:** founder-approved architecture, implementation and legal review in progress. See [Issue #24](https://github.com/rf24kja/24GO.top/issues/24) and [Decision Log](DECISION_LOG.md).

## Decision and ownership

24GOTOP has approved **PUBLIC OSS developer ecosystem + separate PRIVATE official hosted core** as its forward-looking architecture. The official project, domain, brand decisions, releases and hosted infrastructure remain founder-led. This decision does **not** remove MIT rights from any already published covered code, prohibit legal forks, claim a registered trademark, or transfer third-party contributor copyright.

**Public** `rf24kja/24GO.top`: MIT-covered starter code already published; openly maintained SDKs, API/OpenAPI specifications, developer examples, MCP integrations, documentation, contributor-facing security contracts, accessibility and static prelaunch UX prototypes.

**Private future repository (not yet provisioned):** newly authored, separable hosted backend, operator/admin workflows, production-specific moderation logic, private migrations and infrastructure implementation. A private repository alone is not proof of exclusive IP rights; provenance and third-party dependencies must be reviewed.

## Strict data and source boundary

| Never publish in the public MIT repository | Safe public collaboration scope |
| --- | --- |
| Internal hosted-core server implementation and private operating migrations | Independently useful public SDK / OpenAPI / MCP contracts |
| Privileged admin and moderation backend, owner/staff operational workflows | Non-secret test requirements and threat models |
| Tokens, secret keys, `.env`, service-role credentials, DB passwords and user records | Redacted staging readiness summaries and security-advisor findings |
| Production deployment credentials, production configs and private infrastructure details | Public examples that require no production credentials |
| Unapproved externally owned or incompatible licensed code copied to a private module | Reviewed MIT-compatible dependencies and contributor-attributed examples |

A project URL or project reference is **not an API credential**, but avoid unnecessary operational disclosure. No secrets belong in either repository, including private git history; use managed secrets for actual deployments.

## Secure staging integration gates

1. Provision a **new**, founder-owned private GitHub repository with restricted collaborator and GitHub App access. Do not repurpose unrelated private repositories or create a public repo by mistake.
2. Bootstrap it using clean, independently authored files; document provenance/licensing and dependencies. Do not simply copy the public starter or its complete Git history and label it proprietary.
3. Backend must verify a Supabase Auth access token on the server and forward **the end user's verified token** when accessing RLS-protected draft rows. Never use a browser-delivered service-role key or trust a client-provided `author_id`.
4. Private draft Data API access, if selected, may expose only the separately audited `app_content` schema; **never expose `app_private`**. Check Data API configuration, grants, per-row policies and PostgREST behavior before enabling any endpoint.
5. Bind the initial backend to loopback and stage-only Supabase. Keep mutations explicitly disabled until verified dual-account tests and a backup/restore procedure are in place. No public write cutover.
6. Test author A vs B, stale revision failures, malicious Markdown, role revocation, moderation audit atomicity, and abuse limits. Record real results in [Issue #38](https://github.com/rf24kja/24GO.top/issues/38).
7. Verify CI and independent security review before merge/deployment; maintain rollback and incident procedures.

## Reality check — 2026-10-26

- Isolated staging PostgreSQL has four application tables with RLS and FORCE RLS enabled. At inspection, Security Advisor returned zero lints.
- The staging Auth database had **zero user accounts at inspection**, so cross-account JWT end-to-end tests have **not** run.
- The public local Node demo is **not** an authenticated production publishing backend.
- The separate private hosted-core repository is **not yet created or integrated**, and this documentation PR must not be presented as proof that it exists.
- The presence of five staging migrations is not a verified backup/restore or a promise of production readiness.

## Safeguards and rollback

This document records a decision and release requirements only. It does not change GitHub repository visibility, the MIT LICENSE, staging schema, API key settings, production DNS or public write permissions. Roll back its wording through a reviewed docs PR. Any future backend cutover needs an independent staged verification and rollback plan.

**Open actions:** GitHub private repository creation, access hardening, private-source review, real staging integration tests, restore drill and external release review. [Issue #24](https://github.com/rf24kja/24GO.top/issues/24) stays open until completed with evidence.
