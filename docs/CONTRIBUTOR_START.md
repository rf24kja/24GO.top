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

## Before proposing code

Open or claim a scoped Issue. Do not paste credentials, user data or unrelated promotional content. Make small PRs with a short before/after explanation and tests. We cannot promise compensation, grants or free subscriptions to contributors.

## Maintainership

The repository owner reviews and merges contributions. Code of conduct, security reporting, and governance discussions are public as appropriate. AI tools may help, but maintainers should verify their output and use human judgment.
