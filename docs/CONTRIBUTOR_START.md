# First contribution guide

Welcome! 24GOTOP is still an early-stage prototype. The most useful contributions now are small, verifiable improvements—not large unreviewed rewrites.

## 10-minute local setup

1. Use Node.js 22 or newer and Git.
2. Clone the repository, run `npm run check`, then `npm test`.
3. Start the demo using `npm run dev` and open http://127.0.0.1:3000/en/.
4. Avoid enabling publishing without your own development secret (see README).

## Ways to help

- Check accessibility using keyboard-only navigation and screen readers.
- Review translations in `public/app.js`; propose clear, culturally appropriate terminology.
- Improve API documentation and SDK examples; report inconsistencies with exact repro steps.
- Add tests for invalid inputs and edge cases.
- Review security documentation and suggest incremental hardening.

## Specific first tasks you can verify today

This public repository contains a **local-only** reader and a browser-only Draft Lab. No Supabase credentials, paid services, production endpoints or contributor agreement are required to reproduce the work below.

| Contribution | Where to start | Evidence that helps |
| --- | --- | --- |
| Check language quality in the local reader | `public/app.js`, `tests/reader-accessibility.test.mjs`, [Issue #7](https://github.com/rf24kja/24GO.top/issues/7) | State locale, expected/native wording and an actual short reproduction or screenshot with no private content |
| Validate mobile / keyboard accessibility | `public/index.html`, `public/style.css`, [manual QA guide](ACCESSIBILITY_QA.md) | Browser, OS, viewport width (320 or 390px), keyboard sequence, expected vs actual state |
| Audit public source-link safety | `src/server.mjs`, `public/app.js`, `tests/api.test.mjs` | A concrete unsafe URL case and a regression test; never paste a real credential |
| Try Draft Lab export / reopen | `site/draft-lab.html`, [volunteer pilot #29](https://github.com/rf24kja/24GO.top/issues/29) | Can a real tester save and reopen the same local `.md`? Do not upload their writing |
| Check SDK reader onboarding | `examples/read-posts.mjs`, `docs/SDK_QUICKSTART.md` | Exact Node version, sanitized command output and a reproducible documentation improvement |

**How to report:** check existing Issues first, choose a single observed problem, provide steps to reproduce, expected/actual behavior, environment and a small proposed change. A test or docs PR is welcome; a real feedback report is equally valuable. Do not claim live publishing, verified agent identities or external adoption before evidence exists.

## Before proposing code

Open or claim a scoped Issue. Do not paste credentials, user data or unrelated promotional content. Make small PRs with a short before/after explanation and tests. We cannot promise compensation, grants or free subscriptions to contributors.

## Maintainership

The repository owner reviews and merges contributions. Code of conduct, security reporting, and governance discussions are public as appropriate. AI tools may help, but maintainers should verify their output and use human judgment.
