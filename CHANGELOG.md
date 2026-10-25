# 24GOTOP — Public Change Log

This is the human-readable **history of verified changes**. Actual GitHub commits and merged Pull Requests are the authoritative audit trail. Planned capabilities are in [the roadmap](docs/ROADMAP.md), not represented as released features.

We follow a lightweight **Keep a Changelog** format until a first tagged release. These are development milestones, not npm release versions or proof that the community is in production.

## 2026-10-26 — On-device Markdown export

- **Next Draft Lab iteration:** add explicit local Markdown download without accounts or network requests; pure filename generator, unit tests, confirmation before discarding non-empty drafts, safer fallback when clipboard permission is unavailable. See the associated PR for code review, test results and rollback.
- **Data handling:** writing is not automatically persisted; downloading a file is a user-initiated local action, not server publication. Live browser/download checks remain necessary.

## 2026-10-26 — Draft Lab UX research

- **#28 — Copy-only static Draft Lab:** a responsive browser-only article editor concept with title, language, category, source URL, safe plain-text preview and clipboard copy. The visitor does not sign in, upload, save or publish anything. Source code [PR #28](https://github.com/rf24kja/24GO.top/pull/28), [research script](docs/DRAFT_LAB_RESEARCH.md) and GitHub Actions results linked in the PR.
- New unit tests verify validation limits, unsafe source URLs and literal draft serialization; static tests check privacy boundaries and accessible form markup. Browser/keyboard smoke tests and voluntary user research remain pending.
- **Deployment:** merging the static page is not proof that `https://24go.top/draft-lab.html` is reachable; GitHub Pages/HTTPS must be checked separately.
## 2026-10-26 — Open SDK contributor onboarding

- **#25 — No-key API read demo and SDK hardening:** add `npm run demo:read` for developers to verify the local feed without secrets or cloud accounts; add explicit SDK errors, bounded network timeouts, URL credential rejection, and a guard against transmitting development publishing keys over remote plaintext HTTP. Add six SDK regression tests, source-based quickstart and docs. [PR #25](https://github.com/rf24kja/24GO.top/pull/25).
- This is an MIT-licensed **public SDK example**, not a private production backend, hosted public API or npm distribution.
- **Verification:** GitHub Actions Node syntax check and full tests, linked in PR. Revert #25 to roll back without any migration.

- **Developer resource readiness:** add a public research/evidence ledger for Claude OSS, GitHub Copilot and AWS Activate with strict caveats and no implied application or award. [PR #26](https://github.com/rf24kja/24GO.top/pull/26). No benefits have been applied for or received through this PR.


- **#27 — Public developer onboarding:** improved static landing with accurate hosted-vs-local feature status, a copyable no-key SDK setup, direct contributor entry points and basic share metadata. This changes only the public static marketing page, not the hosted publishing backend. [PR #27](https://github.com/rf24kja/24GO.top/pull/27).

## 2026-10-25 — From idea to working development prototype

### Initial repository and documentation
- Published the open-source README, MIT license, contributing/security guidance and scoped initial Issues.
- **#5 — MVP foundation:** local Node.js reader/publishing API, multilingual website (8 UI languages), experimental JS SDK, RSS, local demo, tests and CI. [Merged PR #5](https://github.com/rf24kja/24GO.top/pull/5).
- **#6 — Security and contributor baseline:** restrictive security headers, regression test, Code of Conduct and community documentation. [Merged PR #6](https://github.com/rf24kja/24GO.top/pull/6).
- **#10 — OpenAPI:** machine-readable OpenAPI 3.1 development contract with CI checks. [Merged PR #10](https://github.com/rf24kja/24GO.top/pull/10).
- **#12 — GitHub Pages:** static-only prelaunch deployment workflow and tests. A workflow does **not** prove the public domain is functioning. [Merged PR #12](https://github.com/rf24kja/24GO.top/pull/12).
- **#13 — Database foundation:** PostgreSQL/Supabase-oriented SQL migration, least-privilege grants, RLS and isolated cross-user CI tests. The live Node API is **not** connected to Supabase. [Merged PR #13](https://github.com/rf24kja/24GO.top/pull/13).
- **#16 — Read-only feed:** opt-in anonymous Supabase read adapter using a publishable key; write operations intentionally disabled in that mode. Local JSON remains default. [Merged PR #16](https://github.com/rf24kja/24GO.top/pull/16).
- **#17 — Source alignment:** interim comparison of earlier Hermes Project Pack v8.1 vision to this smaller starter, Startup instruction addendum and a community announcement draft. Full canonical v8.1 archive has **not** been audited here. [Merged PR #17](https://github.com/rf24kja/24GO.top/pull/17).
- **#18 — Community feedback:** first honest public invitation in GitHub Issues asking developers what would make the product useful. [Issue #18](https://github.com/rf24kja/24GO.top/issues/18).

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

## Governance documentation (under review)

- Prepared founder-led governance, brand/attribution policy and IP/licensing strategy for discussion. Existing MIT grant remains unchanged; no trademark registration or copyright transfer is claimed.
- Any future changes to code ownership or private-core boundaries must be tracked in a separately approved decision/PR and documented without rewriting licensed history.
