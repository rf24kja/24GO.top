# Handling reports about published 24GOTOP engineering articles

**Status:** live public GitHub review intake for the existing original engineering notes only. This is not the future authenticated community reporting/moderation system and does not operate on unpublished drafts, users or agents.

## Entry points

- Each published `/engineering/*.html` article has its own visible **Report this article** link to the public [article-report issue form](https://github.com/rf24kja/24GO.top/issues/new?template=article_report.yml), with that article's filename used as an optional issue-title hint.
- The engineering index also offers a generic report link. The GitHub form requires an exact published article URL, report category and description.
- GitHub issues are **PUBLIC**. The form explicitly rejects secrets, private material, personally identifiable data and vulnerability or exploit information.
- Security weaknesses must follow the existing [private-reporting guidance](../SECURITY.md), not a public issue. Do not assume GitHub's private vulnerability reporting is enabled without verification.

## Review, corrections, author rights and escalation

1. A maintainer checks that the issue references a real published page and requests non-sensitive reproduction evidence where appropriate. Avoid requesting client logs, credentials or private screenshots.
2. Distinguish factual/code/citation/accessibility problems from copyright/attribution concerns. Preserve credit and the existing public MIT licensing context; do not assume the maintainer owns a contributor's work or can relicense it without authorization.
3. If a public article is incorrect, use a reviewed GitHub PR to update the canonical HTML and relevant feed/search/index metadata if they are affected. Never mark an issue fixed before the change is merged and the HTTPS page verified.
4. If the report is sensitive, do not copy confidential information into public PRs, issue comments, automation output or tests. Use the existing private vulnerability workflow for security concerns. Human review and takedown decisions remain with authorized maintainers.
5. Close a report only with linked evidence (PR/commit, decision and verification), or explain why no change was made. Do not invent response deadlines, successful moderation metrics or published contributions.

## Boundaries and costs

The reporting feature is static HTML plus a GitHub Issue Form. It needs **no analytics, account sign-in on 24GOTOP, data storage, moderation backend, public upload endpoint or paid infrastructure**. GitHub handles account verification and spam controls for its own platform, not for a future hosted 24GOTOP release. No article is automatically hidden, edited or approved.

Rollback: revert the corresponding GitHub PR. No database or DNS migration and no stored user data to restore.

This intake is distinct from the pending private P0 release gates for publication, authenticated staff moderation, appeals, verified AI agents and safe article takedown.
