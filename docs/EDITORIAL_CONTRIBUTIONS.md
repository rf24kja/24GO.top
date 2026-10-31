# Technical article proposals and editorial publication

**Status: public OSS editorial workflow, not hosted user publishing.** This document describes how a real contributor can propose original technical writing **before** 24GOTOP has public accounts or author-owned database publication. A GitHub issue is a *proposal*, not an article or a guaranteed publishing queue.

## 1. Keep a private manuscript safely

- Draft locally using [24go.top Draft Lab](https://24go.top/draft-lab.html) (local tab memory only, not autosaved). Download and retain your `.md` before leaving.
- Keep confidential, proprietary or personally identifying material on your device; never paste credentials or unpublished client information into a GitHub issue, code diff, sample logs or screenshots.
- To report a problem with the editor, use [the opt-in usability issue](https://github.com/rf24kja/24GO.top/issues/29) without uploading a private article.

## 2. Submit an **issue proposal**, not the full manuscript

Open [the technical article proposal form](https://github.com/rf24kja/24GO.top/issues/new?template=article_proposal.yml). GitHub sign-in is required; this is **not** a 24GOTOP account. Only share a public headline, selected language, a 3–6 sentence reader-facing summary and redacted, safe technical evidence. GitHub issue content is public and can be indexed.

The owner may ask questions, request reproducibility evidence or decline the proposal. No response time, acceptance or payment is guaranteed. Proposing does not authorize automatic publishing, direct database writes, or a hosted API.

## 3. Optional article PR after discussion

For an approved idea, fork the PUBLIC MIT repository and open a focused PR. Real articles live as static HTML in `site/engineering/`, not as Draft Lab `.md` files in an unpublished-article database. The exported Draft Lab file can be used as your personal writing source, but it is **not** automatically compatible with the editorial HTML, metadata, RSS or JSON Feed build.

A complete PR should contain:

1. Original article HTML with one verified self-canonical URL, visible original language, useful answer, specific technical example, constraints and source attribution. No fabricated authors, statistics, AI citations, benchmarks or external testimonial.
2. Safe rendering: article HTML is treated as untrusted human-authored input during review; no executable scripts, arbitrary third-party iframes, secrets or unchecked customer data.
3. Accurate page title, meta/OG description and `Article` JSON-LD matching the visible byline/date. Do not invent a publication date; use the actual accepted publication event.
4. Explicit index link, sitemap location and synchronized `site/engineering/feed.xml` and `site/engineering/feed.json`. Run `npm run feed:write` only after metadata and source content have been reviewed, then `npm run feed:check`.
5. Tests relevant to the new page and `npm run check` plus `npm test` (Node 22+); no assumption that a green pull-request check means the public site is deployed.
6. A distinct, genuinely translated page with correct canonical/hreflang **only** when a translated full article exists. Language-specific homepages by themselves do not justify translation links for an English-only article.

See [the evidence-led editorial plan](EDITORIAL_SEARCH_DISCOVERY_PLAN.md), [general contribution policy](../CONTRIBUTING.md), [governance](../GOVERNANCE.md) and [IP/licensing notes](IP_AND_LICENSING.md).

## 4. Human review and the published state

The project owner or authorized maintainer checks rights, security, originality, reproducibility, source attribution and release claims. Merging is discretionary; comments and PR review are not proof of publication. If accepted, a reviewed PR can be merged, the GitHub Pages workflow deployed, and a read-only external HTTPS check can verify the exact article URL, linked archive and feeds.

**Only after that** may a static article be called published on 24go.top. This GitHub-mediated flow is *not* the future hosted community’s verified-identity, moderation, anti-spam, author-ownership or PostgreSQL publication path. There are no automatic AI-agent replies, public API writes, managed private drafts or automatic comment publishing.

## Copyright, privacy, and safety

Contributors keep their underlying authorship rights except as provided by applicable law or an explicit agreement. Public code/docs submissions are offered under the public repository's existing MIT-license contribution context (subject to actual rights). Do not submit other people's copyrighted prose, image assets or source code without permission. Accepting a contribution grants no ownership or control of the official product, brand or domains. The founder's future commercial hosted Core remains a separate licensing and governance decision. Reports of vulnerabilities should follow [SECURITY.md](../SECURITY.md), not a public issue containing exploit secrets.

## Rollback and proof

A rejected proposal needs no site rollback. An incorrect public article requires a separately reviewed revert or correction PR, rebuilt feeds/sitemap, Pages deployment and external verification. No private Core, production Supabase, DNS or author API change is part of this workflow.

## Live, opt-in proposal discovery (2026-10-31)

The public `/contribute.html` page now includes a manual **Load public
proposals** control. Only a user click fetches the latest public GitHub
issues from the repository (read-only, unsigned API request). The renderer
shows only real issues titled with the editorial form's fixed
`Article proposal: ` prefix, excludes pull requests and displays the
GitHub issue title, public number, creation date and open/closed state.
Closed means **closed**, not necessarily accepted or published; the actual
published archive is the authoritative release evidence.

This interim contribution board uses only public GitHub issue metadata:
no draft body, personal account information, browser storage, credential,
analytics, write API, private repository or hosted publishing. It discloses
that GitHub receives a network request/IP on click. DOM content is
rendered with `textContent`, and navigable links are constructed from
validated positive issue numbers rather than provider-supplied URLs.
On GitHub rate limiting/unavailability it leaves the page usable and
offers the ordinary GitHub navigation link.

The API covers a bounded latest-issue window, not a comprehensive
search or a guarantee that every historical proposal is displayed. No
real submitted issue was fabricated to populate the board. Public
Pages and HTTPS release verification are required after merging.
