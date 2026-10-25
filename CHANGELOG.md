# 24GOTOP — Public Change Log

This is the human-readable **history of verified changes**. Actual GitHub commits and merged Pull Requests are the authoritative audit trail. Planned capabilities are in [the roadmap](docs/ROADMAP.md), not represented as released features.

We follow a lightweight **Keep a Changelog** format until a first tagged release. These are development milestones, not npm release versions or proof that the community is in production.

## 2026-10-25 — From idea to working development prototype

### Initial repository and documentation
- Published the open-source README, MIT license, contributing/security guidance and scoped initial Issues.
- **#5 — MVP foundation:** local Node.js reader/publishing API, multilingual website (8 UI languages), experimental JS SDK, RSS, local demo, tests and CI. [Merged PR #5](https://github.com/rf24kja/24gotop-starter/pull/5).
- **#6 — Security and contributor baseline:** restrictive security headers, regression test, Code of Conduct and community documentation. [Merged PR #6](https://github.com/rf24kja/24gotop-starter/pull/6).
- **#10 — OpenAPI:** machine-readable OpenAPI 3.1 development contract with CI checks. [Merged PR #10](https://github.com/rf24kja/24gotop-starter/pull/10).
- **#12 — GitHub Pages:** static-only prelaunch deployment workflow and tests. A workflow does **not** prove the public domain is functioning. [Merged PR #12](https://github.com/rf24kja/24gotop-starter/pull/12).
- **#13 — Database foundation:** PostgreSQL/Supabase-oriented SQL migration, least-privilege grants, RLS and isolated cross-user CI tests. The live Node API is **not** connected to Supabase. [Merged PR #13](https://github.com/rf24kja/24gotop-starter/pull/13).
- **#16 — Read-only feed:** opt-in anonymous Supabase read adapter using a publishable key; write operations intentionally disabled in that mode. Local JSON remains default. [Merged PR #16](https://github.com/rf24kja/24gotop-starter/pull/16).
- **#17 — Source alignment:** interim comparison of earlier Hermes Project Pack v8.1 vision to this smaller starter, Startup instruction addendum and a community announcement draft. Full canonical v8.1 archive has **not** been audited here. [Merged PR #17](https://github.com/rf24kja/24gotop-starter/pull/17).
- **#18 — Community feedback:** first honest public invitation in GitHub Issues asking developers what would make the product useful. [Issue #18](https://github.com/rf24kja/24gotop-starter/issues/18).

### Limitations and unresolved work
- Verified end-user Auth, moderation, community comments, production PostgreSQL writes, MCP, Agent Arena, ratings and secure Library hosting are **not complete**.
- There is no verified public growth/retention data; no claims about active members, funding, downloads or grants.
- Live domain HTTPS/Pages deployment and custom-domain routing must be checked independently.

## Recording future changes

For each meaningful PR, add one short entry with:
- date and PR link;
- what changed and why users/contributors benefit;
- actual test/CI evidence;
- incompatibilities, known gaps and rollback;
- next linked Issue, if applicable.

Avoid claiming that a feature is deployed when it has only been merged to GitHub. For public deployments record the verified deployment URL and smoke-test evidence separately.
