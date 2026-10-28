# 24GOTOP — Public Change Log

This is the human-readable **history of verified changes**. Actual GitHub commits and merged Pull Requests are the authoritative audit trail. Planned capabilities are in [the roadmap](docs/ROADMAP.md), not represented as released features.

We follow a lightweight **Keep a Changelog** format until a first tagged release. These are development milestones, not npm release versions or proof that the community is in production.

## 2026-10-29 — Local reader translation and source-link safety (public MIT prototype)

- [PR #49](https://github.com/rf24kja/24GO.top/pull/49) — localized the five category buttons, accessible category-group label, interface language label and external source link for all eight supported reader locales. Stable API category keys are unchanged. Eight-locale DOM checks, pull-request CI and merged-main CI passed.
- [PR #50](https://github.com/rf24kja/24GO.top/pull/50) — added defense-in-depth for the local reader's clickable original-source URL: invalid, non-HTTP(S), credential-bearing, relative and oversized URLs are not linked even if present in an untrusted API response or old local JSON. Local development POST validation also rejects credential-bearing URLs. The body remains inert text. Source/HTTP regression tests, pull-request CI and merged-main CI passed.
- Follow-up [accessibility Issue #7](https://github.com/rf24kja/24GO.top/issues/7) invites actual 320/390px, keyboard, NVDA/VoiceOver/TalkBack and native-language feedback. No volunteer QA, WCAG certification, production hosting or live user articles are claimed. No private hosted-core or database logic was copied to the public MIT repository. **Rollback:** Git revert of #49 / #50.

## 2026-10-28 — Evidence-based OSS impact and official developer benefit review

- Recorded a dated, independently checkable public repository baseline (1 star, 0 forks; external dependents/contributors and download impact not established). These are **not** active users, proof of service launch, or program eligibility.
- Rechecked official Claude for OSS, GitHub Copilot maintainer and AWS Activate program conditions. No applications, grants, cloud resources, private backend disclosure or production website changes.
- Documentation-only, source-backed update; no license or API behavior change. Rollback: revert this public documentation PR.

## 2026-10-26 — Least-privilege PostgreSQL INSERT/RETURNING engineering note

- New original [PostgreSQL privilege engineering note](site/engineering/postgres-insert-returning-least-privilege.html) demonstrates a real disposable-CI lesson: an INSERT-only role must not receive broader SELECT permissions simply because a test tried INSERT RETURNING. Explains per-column privilege probes, separation of synthetic DBA fixtures from runtime identity, and the limitations before public publishing; references official PostgreSQL 17 documentation.
- Added the article to the static Engineering Notes index and RSS and extended source tests. No private SQL, credentials, hosted moderation, actual published user articles, or site deployment was introduced.
- **Verification:** public CI required, live Pages/article URL verified separately. **Rollback:** revert this editorial PR.

## 2026-10-26 — Original engineering note on review versus publication

- New original [engineering article](site/engineering/submit-is-not-publish.html) explains immutable author submissions, idempotent review intake, moderator identity and the necessary atomic publication boundary. It distinguishes disposable private PostgreSQL source tests from real hosted behavior and links to public [security Issue #38](https://github.com/rf24kja/24GO.top/issues/38) and [voluntary UX pilot #29](https://github.com/rf24kja/24GO.top/issues/29).
- Listed the article in the static Engineering Notes index and RSS feed. No hosted publishing endpoints, user comments, accounts, private source, keys, infrastructure or user data were added.
- **Verification:** source checks/CI required for this PR; GitHub Pages publication and actual public article URL must be checked separately. **Rollback:** revert the editorial PR only.

## 2026-10-26 — Founder approval of public/private architecture boundary

- **Issue #24:** founder approved the forward-looking split of PUBLIC OSS SDK/MCP/API/docs and a separately controlled PRIVATE future hosted core. [Decision DEC-016](docs/DECISION_LOG.md) and [public boundary](docs/PUBLIC_PRIVATE_BOUNDARY.md).
- **Verification boundary:** this docs change does not create a private repository, connect the server, grant credentials, change MIT rights, or constitute legal/security approval. A private repo bootstrap and staging integration remain outstanding.
- **Rollback:** revert the docs PR if the architecture direction changes; existing MIT license and grants remain as they were.

## 2026-10-26 — Browser-only draft loss protection

- **PR #42:** request the browser's standard leaving-page confirmation only when the user has new writing or has changed an explicitly reopened local Markdown file. Exact imported-file content does not warn; Clear resets the baseline.
- Add a visible non-persistent draft safety note, pure comparison helper and simulated-browser regression tests for missing/edited/imported/cancelled/cleared draft flows. Do not treat a clipboard copy or download request as proof of a file safely stored.
- **Scope:** this is a best-effort browser guard, not autosave or durable storage. Browser prompts can be suppressed, especially without a recent user gesture. No cookies, network, credentials or production backend.
- **Verification:** PR CI checks plus separately pending real-device navigation and file recovery tests in Issue #29. **Rollback:** revert PR #42; no database or infrastructure changes.

## 2026-10-26 — Original engineering note on safe Markdown preview

- **PR #41:** add an original, source-backed engineering article describing the restricted Markdown preview threat model, implementation in PR #40, regression tests and limits. Index it in the static Engineering Notes section and RSS.
- **Scope:** technical documentation only; no proof of live article URL, registered users, traffic or publishing backend.
- **Verification:** GitHub Actions source tests on PR #41; live RSS/Pages HTTPS and browser accessibility checks still need independent confirmation. **Rollback:** revert the editorial PR without changing the private database or API.

## 2026-10-26 — DOM-safe limited Markdown preview in Draft Lab

- **PR #40:** render author-entered headings, paragraphs, ordered/unordered lists, quotes, rules and fenced code as structured HTML elements using fixed tag names and `textContent` only. Raw HTML, Markdown links and inline markup deliberately remain literal text.
- Keep the copy/download/reopen format and browser-only privacy boundary unchanged; no backend, account, network upload or autosave.
- Add parser and malicious-markup regression tests, responsive code formatting, research notes and contributor-facing readiness status.
- **Verification:** PR #40 GitHub Actions source tests and syntax checks; real 320px, keyboard and screen-reader use remain unverified until volunteer test results. **Rollback:** revert PR #40; no database or deployment changes.

## 2026-10-26 — Cancellable public JavaScript SDK requests

- Support caller-provided `AbortSignal` for SDK health, list, read and local-only publish methods, while retaining independent timeouts and redirect blocking. Caller cancellation does not send pre-aborted requests; errors distinguish `ABORTED` and `TIMEOUT` without exposing abort reasons.
- Add regression tests for cancellation, pre-aborted publisher calls, timeout behavior and invalid signals. This is **public developer SDK source only**, not private production backend or an npm release.
- **Verification:** GitHub Actions CI on the associated PR; local browser interoperability still requires manual review. **Rollback:** revert the SDK PR, with no schema, secrets, DNS or production changes.

## 2026-10-26 — Reopening saved article drafts

- **PR #35:** Draft Lab now accepts its own previously exported Markdown files, letting an author download → leave → reopen → edit → download again without a registration, upload, autosave or production write API. [PR #35](https://github.com/rf24kja/24GO.top/pull/35).
- Validate the original file structure, locale/category, safe source URL and a 64 KiB size cap; confirm before replacing unsaved text. Test compatibility with all eight locales, multilingual content, CRLF/BOM, malformed metadata and HTML-like body text.
- **Evidence:** GitHub Actions CI attached to PR #35. Real-browser import and independent returning-author testing remain **unverified**, tracked in [Returning Author Pilot](docs/RETURNING_AUTHOR_PILOT.md).
- **Rollback:** revert PR #35; no database migration, secret, DNS or hosted backend changes.

## 2026-10-26 — Navigable public website

- Give the GitHub Pages landing a real responsive header with visible links to Draft Lab, engineering articles, the development history and GitHub; keyboard skip link, focus outline and mobile wrapping.
- Add regression checks for navigation destinations and source-level keyboard/motion CSS. User device verification remains pending; no claim of certified accessibility or live deployment.
- Evidence: [PR #34](https://github.com/rf24kja/24GO.top/pull/34). Rollback by reverting the static landing change; production API/DB unaffected.

## 2026-10-26 — Reader accessibility and feed correctness

- Preserve mobile Discover/GitHub navigation instead of hiding links under 600px; strengthen keyboard focus indicators and reduced-motion handling.
- Give the local prototype a named feed region, separate screen-reader status messages and accurate `aria-busy` states. Ignore stale API results after switching categories and handle malformed upstream responses safely.
- Add simulated-DOM behavioral regression tests for overlapping requests, errors and empty feeds, plus a manual keyboard/screen-reader test protocol. **Independent assistive-technology and real-device QA remains open** in [Issue #7](https://github.com/rf24kja/24GO.top/issues/7).
- Evidence: [PR #33](https://github.com/rf24kja/24GO.top/pull/33), including the GitHub Actions test run. Rollback: revert static UI changes; no production database or backend migration.

## 2026-10-26 — First source-backed technical article

- Introduce a static Engineering Notes section and RSS feed, starting with **Why we built a Draft Lab before opening public writes**, explaining verifiable PR evidence, safeguards, and remaining public-write security gates. The article is original project documentation, not a real user publication.
- Link editorial content from the homepage and public development timeline; add automated internal-link/content/RSS tests. Deployment of the new article needs a separate GitHub Pages and HTTPS check after merge.
- Record founder's confirmation that `https://www.24go.top/` opened successfully on 26 October 2026 without claiming independent apex-domain or all-subpage checks. See [Deployment Status](docs/DEPLOYMENT_STATUS.md).
- **Evidence:** [PR #32](https://github.com/rf24kja/24GO.top/pull/32), including code review and CI. Rollback: revert that static-content PR; no product backend or DNS affected.

## 2026-10-26 — CI security and maintenance

- **PR #31:** replace deprecated GitHub Actions runtime versions with maintained checkout/setup-node v7 across tests, PostgreSQL checks and static Pages. Disable checkout credential persistence; keep Node.js 22 application tests and existing least-privilege workflow permissions. [PR #31](https://github.com/rf24kja/24GO.top/pull/31).
- **Verification:** GitHub Actions CI and PostgreSQL checks must pass before merging. GitHub Pages deployment requires separate post-merge confirmation.

## 2026-10-26 — On-device Markdown export

- **Next Draft Lab iteration:** add explicit local Markdown download without accounts or network requests; pure filename generator, unit tests, confirmation before discarding non-empty drafts, safer fallback when clipboard permission is unavailable. [Merged-source review PR #30](https://github.com/rf24kja/24GO.top/pull/30) includes the code, CI record and rollback.
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
