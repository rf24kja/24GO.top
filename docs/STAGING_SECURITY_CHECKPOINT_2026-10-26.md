# Staging PostgreSQL security checkpoint — 2026-10-26

> **Scope:** a separate disposable Supabase staging project only. This is not a production release, an exposed publishing API, a third-party security audit, or a substitute for end-to-end authorization tests.

## Verified facts

A live management connection inspected the **staging** PostgreSQL 17 database. The environment was reported as `ACTIVE_HEALTHY`; Supabase Security Advisor returned **zero security lints at inspection time**. The existing migration history contains four private-core migration stages covering admin membership, membership locking, moderated status transitions and private article drafts. This report deliberately does not publish internal application SQL, identifiers for users, credentials or private operating procedures.

Ten **read-only, structural SQL assertions** passed:

1. All four app tables have RLS and FORCE RLS enabled.
2. Neither private schema permits `anon` USAGE.
3. The administrative schema denies `authenticated` USAGE.
4. The four app tables have no blanket table-level INSERT, UPDATE or DELETE privilege for `authenticated`.
5. Author-scoped draft SELECT, INSERT and UPDATE RLS policies exist.
6. The automatic RLS event trigger is enabled.
7. The draft revision enforcement trigger is enabled.
8. The relevant privileged functions are not directly executable by `authenticated`.
9. The moderation audit table denies direct `authenticated` INSERT.
10. Draft `author_id` cannot be directly updated through an authenticated column grant.

**Interpretation:** structural controls exist and the recorded assertions passed. This does **not** establish that every authorized operation works correctly: column-specific draft write grants coexist with restrictive table grants, and permission-check assertions are not real JWT-based browser/API tests.

## Remaining gates before any public writes

- Independently exercise two distinct real staging Auth identities: owner may create/read/revise only own drafts; cross-user reads/writes must fail. Test stale revision and immutable author fields.
- Exercise moderator/owner permissions with explicitly provisioned, revocable staging roles; prove revoked roles cannot moderate and that spoofed actor IDs fail at the trusted server boundary.
- Confirm concurrent moderation decisions create exactly one consistent status transition and appropriate audit event; verify full rollback on failures.
- Test malicious/malformed Markdown, stored XSS boundaries, spam/rate limits, input size and localization constraints.
- Establish migrations as reviewed private-core source-of-truth, backup/restore drill, secret separation, least-privilege staging API and a dedicated server-side Auth authorization layer.
- Re-run Supabase advisors and CI, obtain independent review, and keep the production deployment gate closed until these pass.

## Community review requested

Please review the **threat model and test cases**, not private schema implementation. Which cross-account privilege escalation, moderation race, audit integrity, draft ownership, or rollback case are we missing? Small, reproducible contributions to **public test harnesses, documentation, accessibility and SDKs** are welcome.

Existing MIT-licensed code remains MIT. Internal hosted moderation/admin implementation is intentionally not reproduced here while [licensing boundary Issue #24](https://github.com/rf24kja/24GO.top/issues/24) remains pending. Production readiness and launch status are unchanged.

**Rollback:** revert this documentation-only PR. No database, domain, service, DNS, keys or deployed endpoint is changed by this file.
