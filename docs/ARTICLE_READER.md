# 24GOTOP engineering article reader — public static enhancement

**Stage:** released source in public MIT repository after PR merge only; deployed status must be verified independently through GitHub Pages exact-SHA receipt and HTTPS audit. This is for the existing ten human-reviewed original English engineering articles. It is not a hosted publishing system, agent identity, moderation, comments, or an account service.

## Reader capabilities

- Each article has **static descriptive section IDs** in its source HTML; fragment URLs work without JavaScript, browser storage, a backend, or a user account.
- A first-party, opt-in progressive JavaScript module `site/engineering/article-reader.mjs` builds an accessible **On this page** outline from those IDs and adds a small **§ Copy link to section** action for each section.
- **Copy Markdown citation**, **Copy text reference**, and **Copy BibTeX** use the article's already published schema.org Article JSON-LD, canonical HTTPS link, actual author name, and publication date. No invented author, DOI, personal identity or content is introduced.
- **Print article** invokes the browser's native print dialog; print CSS removes the toolbar and section controls while keeping the original article text.
- A transient **reading progress** indicator updates on scroll/resize; it does not store, transmit or infer user behavior. Its value is an approximate viewport-based progress indicator, not a verified reading-duration measurement.
- Clipboard writes occur **only after an explicit click**. If Clipboard API access fails, a readonly field displays the citation or link, selects it and explains manual copying.

## Security, accessibility, search and compatibility

Only the exact first-party JavaScript module is permitted as an executable script on the ten reviewed article pages, alongside their preexisting inert JSON-LD. The module does **no fetch, analytics, telemetry, tracking, localStorage, API-key access or document edits that would affect a hosted account**. It validates a canonical `https://24go.top/engineering/<slug>.html` link and the exact matching schema.org Article ID/headline/byline/date before mounting. It exits without a toolbar if the markup is missing or inconsistent.

The original article text, RSS and full-text search index remain source-traceable. Anchors are static, so content remains indexed and navigable if scripts fail. The outline is contained in a native `details` disclosure with accessible labels; focus indicators, 320px mobile layout, high-contrast preference and print styles are provided.

**Manual QA:** check phone widths 320/390px, 200% zoom, light/dark contrast, VoiceOver/NVDA/TalkBack labels, keyboard focus in details and heading buttons, hash navigation, denied Clipboard API, copied citations from one person-authored and one organization-authored article, and print preview. Source tests and the independent post-Pages HTTPS audit verify structural and delivery properties but do not substitute for real-device assistive-technology testing.

## Deploy, cost, rollback

No Supabase, DNS, VPS, authentication, remote AI API, paid service, secret or private backend code is modified. The existing GitHub Pages workflow publishes `site/` only, and the external audit must verify the new module and static section anchors against the exact release commit and run ID.

Rollback: revert the public PR and allow Pages to redeploy. The old articles remain readable; previously copied section links into the reverted revision might no longer jump to their section. No database migration or stored reader data is involved.
