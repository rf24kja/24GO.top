# 24GOTOP — Discussions launch & moderation

**Status:** Discussions are enabled by the repository owner. The current integration can work with Issues and PRs but does **not** offer a direct operation to create a GitHub Discussion. Do not confuse a prepared Markdown draft or an Issue with a published Discussion.

## Suggested categories

| Category | Use | Typical first topic |
| --- | --- | --- |
| Announcements | Shipped code, real verified milestones, major maintainer decisions | Welcome and current source-code maturity |
| Ideas | Product discovery and open design options | What makes technical publishing valuable? |
| Q&A | Troubleshooting and beginner setup questions | How to run Node.js prototype locally |
| Show and tell | Reproducible demos and experimental integrations | Source-only JS SDK read example |
| General | General community conversation | Introductions and contributor interests |

Keep the default GitHub categories unless discussion activity proves a need for more.

## Two existing Issues should be converted, not duplicated

1. [#18 — Welcome to 24GOTOP](https://github.com/rf24kja/24GO.top/issues/18) → GitHub **Discussions / Announcements** (or General, if the configured Announcements category is unsuitable). Update the links to use the renamed repo before conversion.
2. [#21 — Product RFC](https://github.com/rf24kja/24GO.top/issues/21) → **Discussions / Ideas**. Preserve its three-option comparison and evidence-based feedback request.

**Owner workflow:** open the Issue → right sidebar **Convert to discussion** → choose category → confirm. GitHub preserves discussion context and avoids duplicate topics. After conversion, verify original Issue has left the open engineering queue. Don't close issues prematurely or delete comments.

## Announcement quality checklist

- Accurate implementation status and direct links to actual merged PRs.
- Clear explanation why a developer or reader should care.
- One actionable invitation: a specific good-first issue or feedback question.
- State that the hosted community is not live and that developer SDK is experimental.
- Keep announcements concise; do not flood Discussions for visibility.

## Cadence and responsible moderation

Post an engineering update when there is a real verified milestone, not on a fixed spam schedule. Prefer a meaningful weekly summary only when work happened. Replies should address actual questions and disclose AI assistance where relevant. Do not imitate independent community members or promise rewards/grants.

Security reports go through [SECURITY.md](https://github.com/rf24kja/24GO.top/blob/main/SECURITY.md), not public Discussions.

## Future follow-up

Once published, link actual Discussion URLs in the main README and in `docs/wiki/Home.md` instead of guessing numbered IDs. Track external contributor feedback in `docs/GROWTH_EXPERIMENTS.md` only when independently observable.
