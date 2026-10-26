# 24GOTOP — Verified module readiness register

Updated: 2026-10-26. **Source and staging inventory, not a product launch or production certification.**

## Marking convention

- **SOURCE_READY**: implemented and present in public source; tested as stated in linked PRs, but not necessarily deployed or manually validated.
- **STAGING_SCHEMA_READY**: schema and structural controls verified in isolated test database; API/user flows NOT yet verified.
- **PROTOTYPE_ONLY**: available for local development or static experiments; not a hosted publishing capability.
- **BLOCKED**: material dependencies prevent safe product delivery.
- **PROPOSAL**: design direction only, no implementation claim.
- **PUBLICLY_VERIFIED**: requires separately recorded live deployment and user-level smoke tests; none assigned merely from code merge.

| Module | Status | Evidence | Remaining gate |
| --- | --- | --- | --- |
| OSS governance, README, CI, tests | SOURCE_READY | [README](../README.md), [Changelog](../CHANGELOG.md), repository Actions | Confirm each release-specific CI and contributor workflows |
| Local article feed / local publish API | PROTOTYPE_ONLY | [README](../README.md), [API](../API.md), [PR #5](https://github.com/rf24kja/24GO.top/pull/5) | Replace dev JSON/shared key with identity, persistence, moderation and safe server writes |
| Localized UI (eight languages) | SOURCE_READY | [README](../README.md) | Native-speaker review, real-device QA, multilingual content and SEO |
| OpenAPI and experimental JavaScript SDK | SOURCE_READY | [PR #10](https://github.com/rf24kja/24GO.top/pull/10), [SDK quickstart](SDK_QUICKSTART.md) | Versioned production API and independently tested public integration; not npm release |
| RSS and developer discovery | SOURCE_READY | [Changelog](../CHANGELOG.md) | Verify hosted feed and sitemap behavior independently |
| Draft Lab Markdown editor, local import/export and best-effort exit guard | SOURCE_READY after PR #42 merge | [PR #28](https://github.com/rf24kja/24GO.top/pull/28), [PR #35](https://github.com/rf24kja/24GO.top/pull/35), [PR #40](https://github.com/rf24kja/24GO.top/pull/40), [PR #42](https://github.com/rf24kja/24GO.top/pull/42) | Real-device/browser tests; browser may ignore exit warning; no cloud drafts |
| Admin membership | STAGING_SCHEMA_READY | [Security checkpoint PR #37](https://github.com/rf24kja/24GO.top/pull/37) | Real authenticated role provisioning/revocation and trusted server access |
| Moderation status transitions and audit trail | STAGING_SCHEMA_READY | [Security checkpoint PR #37](https://github.com/rf24kja/24GO.top/pull/37) | Concurrent-action/rollback tests, server identity checks, UX |
| Author-owned private drafts | STAGING_SCHEMA_READY | [Security checkpoint PR #37](https://github.com/rf24kja/24GO.top/pull/37) | Two-user JWT end-to-end ownership tests, storage integration, backup/restore |
| Production-grade authenticated publishing | BLOCKED | [Issue #38](https://github.com/rf24kja/24GO.top/issues/38), [Roadmap](ROADMAP.md) | Verified Auth, API, spam limits, safe rendering, backups and review |
| Public comments, profiles and reputation | PROPOSAL | [Roadmap](ROADMAP.md) | Security/product design, scope and implementation |
| Verified AI-agent identities and separate Agent Arena | PROPOSAL | [RFC #21](https://github.com/rf24kja/24GO.top/issues/21) | Agent identity, scoped credentials, abuse prevention |
| Static frontend Library | PROPOSAL | [RFC #21](https://github.com/rf24kja/24GO.top/issues/21) | Separate-origin static sandbox, resource limits and moderation |
| Production licensing boundary | BLOCKED | [Issue #24](https://github.com/rf24kja/24GO.top/issues/24) | Founder decision and legal/provenance review before public proprietary work |
| Public deployment verification | BLOCKED | [Deployment log](DEPLOYMENT_STATUS.md) | Independent HTTPS/apex/Pages/subpage/mobile checks |

## Milestone exit criteria (no percentage-based readiness claims)

**P0 author milestone:** verified user identity; create/revise/publish article in persistent PostgreSQL through trusted backend; row ownership and atomic transactions; moderation and audit; content sanitization and anti-spam; backup/restore drill; real-device usability and deployment evidence.

**P1 community milestone:** comments, verified profiles, localized posts/discussions, practical search, agent API/SDK/MCP with scoped authentication; separate human and agent interaction rules.

**P2 milestone:** reputation/anti-gaming and isolated static-app Library, each behind a separately documented threat model.

## Open contribution invitation

If you're an OSS contributor, help make one module truly **PUBLICLY_VERIFIED**: perform the [Draft Lab user pilot](https://github.com/rf24kja/24GO.top/issues/29), improve accessibility with real-device evidence, add public SDK contract tests or review the [staging threat model](https://github.com/rf24kja/24GO.top/issues/38). Share an actual reproduction, screenshot without secrets or focused PR; no invented user metrics.

## Change and rollback

This register is public project management documentation only. No backend SQL, secret, production admin code, API key, deployment config or database changes. Rollback by reverting the documentation PR. Existing MIT rights unchanged. New private hosted-core implementation must not be published while [Issue #24](https://github.com/rf24kja/24GO.top/issues/24) remains unresolved.
