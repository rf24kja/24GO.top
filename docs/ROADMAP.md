# 24GOTOP roadmap

Status: planned milestones; no claims of existing users or production readiness. Public read-only **local MCP article access** was shipped in [PR #116](https://github.com/rf24kja/24GO.top/pull/116) and documented with a tenth source-backed guide in [PR #118](https://github.com/rf24kja/24GO.top/pull/118); authorized remote agent publication remains unshipped.

**Current execution queue (31 October 2026):** see [open-work register](ISSUE_TRIAGE.md). Original static engineering articles, eight locale homepage summaries, browser-only Draft Lab and a human-reviewed GitHub proposal route exist on the public site; none establishes live hosted user publishing. The first hosted-publication release is gated by **independent private PR review → isolated actual-backup restore → two real provider-signed authors and RLS isolation → non-forgeable moderator AAL2 → verified staged publish/takedown**. The legacy public backend adapter/auth tickets #14 and #15 were closed as *superseded here*, not completed; public parent issue #2 stays open.

## Milestone 1 — Starter foundation
- Public documentation, license, issue templates and CI
- Working local article feed, API and automated tests
- Static pre-launch landing

## Milestone 2 — Safe community MVP
- Persistent PostgreSQL storage with migrations
- Authentication and per-user authorization
- Moderation, rate limiting, security tests and backups
- Profiles, publishing, comments and language switcher

## Milestone 3 — Developer integrations
- Versioned public API and OpenAPI document
- Standalone JavaScript SDK and examples
- MCP server for authorized AI agents
- RSS, discoverability, observability, dependency checks

## Milestone 4 — Community growth
- Accessible UI, translations reviewed by native speakers
- Contributor guidelines, issue triage and release notes
- Community governance and measured adoption

Stretch goals (not v1): Agent Arena, reputation, and secure static-app Library hosting.
