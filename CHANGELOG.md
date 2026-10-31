# 24GOTOP — Public Change Log

## 2026-10-31 — Repair SEO HTTPS audit deployment race

- Remove parallel push-triggered live SEO audits. A new release-specific HTML assertion observed the *previous* CDN version before Pages finished (#41208632019 FAIL), while post-Pages audit (#41208664348) correctly passed. Require completed successful Pages on main before externally checking live SEO content, retaining manual and daily read-only audits. Regression test ensures premature push triggers are not restored. No SEO assertions relaxed, no DNS, private Core or backend change.


## 2026-10-31 — Reviewed related reading paths for every engineering article

- Add two source-verified, topic-aware static internal article links plus archive navigation to all ten published engineering notes. Generate from canonical JSON Feed (validated against RSS/Article JSON-LD) and human-reviewed archive topics, with no remote recommendation API. CI refuses stale/foreign/duplicate links, escapes link titles, and preserves the independently validated full-text search corpus. Accessible responsive styling, source tests and external HTTPS checks for the released links. No user tracking, new article fabrication or private hosted publishing changes.


## 2026-10-31 — Prevent stale saved-draft loss across browser tabs

- Detect external browser-storage changes to the currently open manual draft and immediately invalidate a stale saved baseline without changing editor text. Restore the native unsaved-work navigation guard, warn through the existing translated live status and detach the outdated slot so the next explicit save creates a separate copy instead of overwriting another tab. Preserve unaffected drafts and imported Markdown baselines. Add end-to-end simulated cross-tab conflict, deletion, clear, unrelated-event and explicit recovery tests, plus a published-asset HTTPS smoke assertion. No autosave, network upload, hosted write permission or private Core changes.

## 2026-10-31 — Independent live archive search release verification

- Extend existing read-only GitHub-hosted HTTPS audit to fetch published engineering/search.js and require the shipped all-word search implementation and matching accessible archive help text. A successful Pages workflow without the new JS no longer passes this release-specific probe. No changes to static article content, Auth, telemetry or private Core.

## 2026-10-31 — Multi-word engineering article discovery

- Upgrade the public, privacy-preserving archive search to find **all words in any order**, across visible titles/summaries and the verified local static article index. Topic filters, bookmarkable URLs, keyboard behavior and no-JavaScript crawlable HTML are preserved. Add tests for mixed card/full-text matching, word-order independence and offline fallback. No remote search API, telemetry, author writes or private Core changes.

## 2026-10-31 — Deterministic sitemap generator for canonical discovery

- Generate the static XML sitemap from existing reciprocal homepage hreflang URLs, three reviewed public routes and source-validated RSS/Article JSON-LD URLs. Fail CI on stale sitemap, forged or duplicate links, broken canonical locale routes and noindex pages. No fictitious crawl dates, backend access or search ranking assertions.

## 2026-10-31 — Live verification for canonical site-name markup

- Extend the public GitHub-hosted read-only HTTPS SEO audit to assert actual deployed root WebSite JSON-LD name, origin and stable ID. Add static regression protecting the probe. This closes the difference between source-only SEO tests and independently delivered markup. No site content, DNS, private Core or credentials changed.

## 2026-10-31 — Truthful WebSite identity for SEO/GEO

- Add minimal canonical root `WebSite` JSON-LD with grounded project brand and actual locale URLs, verified by source tests. No fake user metrics or launch features, private backend, paid tools or indexing claims.

## 2026-10-31 — Public article corrections and attribution reports

- Add a dedicated public GitHub issue form for precise, human-reviewed reports about existing engineering notes and a visible report link on each of ten published technical articles. Distinguish public content corrections from confidential security disclosures, document maintainer triage, and preserve no-backend/no-automatic-takedown safety. No private Supabase/hosted permissions changed.


## Unreleased — 31 October 2026: public editorial proposal activity

- Add a consent-gated, read-only public proposal board to `/contribute.html`. It renders real issue-form proposals from the project's public GitHub repository, marks open/closed honestly (not published), avoids automatic network calls, and never sends draft content or credentials. Manual proposal flow and private hosted publication gates remain unchanged.


## Unreleased — 31 October 2026: manually saved local draft library

- Add an opt-in device-local, manual draft library directly inside the multilingual Draft Lab: save, reopen and delete up to eight articles without login, storage sync or upload. Warn about unencrypted same-origin browser storage, possible data loss and shared devices. Existing .md export remains the recommended backup. Detect stale saved versions to avoid silent cross-tab overwrites. No private hosted-core or live publishing permission changes.


## Unreleased — 31 October 2026: direct editorial proposal from Draft Lab

- Add a human-initiated GitHub article-proposal action directly to the working eight-language Draft Lab. It validates a headline, requests explicit consent before opening a public GitHub issue form, and transfers only the article title (not body, source links, local draft file or credentials). Existing author-owned file export and browser privacy remain intact. This is a useful live proposal path, **not** hosted publishing.


## Unreleased — 31 October 2026: reconcile verified deployment evidence

- Update public deployment/SEO records to current exact-head main CI, Pages, live Draft Lab/SVG and 21-URL canonical audit evidence. Distinguish historical 9-article/12-URL checkpoints from current ten-article/21-URL release.
- Refresh local MCP documentation to the tenth published guide and clarify local checkout staleness; keep hosted author/agent write API gated.


## Unreleased — 31 October 2026: discoverable local MCP entry

- Link the already merged local read-only MCP service directly from the public homepage developer quickstart, with exact launch command, manual host setup and no-public-write disclosure.
- Re-run GitHub Pages release and post-deployment HTTPS verification after updating the live artwork verifier in PR #119.


## Unreleased — 31 October 2026: live HTTPS asset verifier repair

- Fix stale GitHub Pages post-deployment smoke expectations from pre-redesign SVGs, which made [live release verification](https://github.com/rf24kja/24GO.top/actions/runs/41173788865) fail despite successful Pages delivery.
- Verify current English visual claims, each of the seven native-language SVG URLs and text labels, and the tenth source-backed MCP article across live canonical HTML, RSS, JSON Feed, sitemap and full-text index.
- Keep tests as read-only public HTTPS checks; no production write, credentials, custom domain, private database or infrastructure change.


## Unreleased — 31 October 2026: published MCP engineering article

- Publish a tenth original source-backed technical guide explaining the merged read-only local article MCP server (#116), its exact tool boundaries, protocol-process tests, and unresolved publication/review gates.
- Wire canonical HTML, RSS, JSON Feed 1.1, sitemap, full-text index, public archive and AI discovery listing without enabling hosted writes.
- Preserve pre-launch status and keep the private P0 release train untouched.


## Unreleased — 31 October 2026

- Redesigned the knowledge-network and product-map SVGs with equal-sized cards, predictable internal padding and no clipped labels; fixed mobile crop and bottom-row caption overlay.
- Added separate translated SVGs for EN/RU/TH/ES/FR/DE/PT/ZH on the static homepage and GitHub README pages; the published/read-only/local/planned status boundaries remain explicit.
- Updated root and translated README documentation for merged local read-only MCP PR #116. No authenticated publishing, remote MCP service, production backend or secrets were added.
- Added regression coverage for locale-specific imagery and responsive layout.


## 2026-10-31 — Insert and preview real Markdown tables in Draft Lab

- Added an actual **Table** formatting action and editable two-column Markdown table template, preserving source content and respecting the 12,000-character limit. Block-aware insertion separates the table from adjacent prose rather than corrupting the article.
- Added a bounded Markdown pipe-table parser with up to 8 columns and 50 body rows, optional left/center/right alignment, escaped pipe handling and safe literal rendering of unknown syntax. Preview builds a keyboard-scrollable `table`/`thead`/`tbody`/`th`/`td` hierarchy; author HTML stays text and HTTP(S) citations pass the existing URL sanitizer.
- Updated all eight editor interface languages, responsive narrow-screen/light/dark table styling, parser/security/user-interface regressions and canonical HTTPS delivery smoke. Draft Lab remains a **local, no-autosave/no-upload prototype**, not hosted publishing. Real-device keyboard, native translation and screen-reader QA still need human verification.

## 2026-10-31 — Search inside published engineering articles, not only their titles

- Added a 56 KB static, source-generated full-text index from the nine real published article HTML bodies and canonical JSON Feed. Each index entry is bound to the visible article card; adding or changing an article requires the index to be regenerated before CI can pass.
- Public archive search now finds words from within the actual article content while retaining topic filters, bounded shareable query URLs, accessible counts, and original crawlable HTML when JavaScript is unavailable.
- The only new browser request reads the same-origin public `./search-index.json` once with `credentials: omit` and `referrerPolicy: no-referrer`; the index request sends no search query Referer or cookies. **The original page URL and shareable `?q=` links do still contain the user's search terms and may appear in normal browser/hosting logs.** There is no remote search API, private-draft upload or analytics. If the file is unavailable/invalid, searching titles and summaries continues normally.
- Added deterministic canonical content tests, injected-value and offline regressions, plus external HTTPS verification of the real public index. A green HTTP check is not manual browser/device UX verification. No hosted community registration or author publishing was enabled.

## 2026-10-31 — Correct the article archive heading hierarchy

- Technical article cards and the contributor panel now use `h3` below the `Recent articles` section's `h2`, improving navigation by heading level without altering article links or styling.
- Added a source regression for all nine archive cards. Manual keyboard, mobile screen reader and zoom verification remain open under Issue #7; tests alone are not an accessibility certification.
- No change to authenticated publishing, private hosted Core, Supabase, DNS or permissions.

## 2026-10-31 — Evidence-based public backlog triage

- Closed obsolete public-hosted-implementation Issues [#14](https://github.com/rf24kja/24GO.top/issues/14) and [#15](https://github.com/rf24kja/24GO.top/issues/15) as **not planned in this public MIT repository / superseded by private hosted-Core implementation**. These closures do not mean PostgreSQL-authored publishing or real Auth are complete. Public parent [#2](https://github.com/rf24kja/24GO.top/issues/2) remains open.
- Added [open-work register](docs/ISSUE_TRIAGE.md) mapping remaining public Issues to their independent completion evidence, owner-only settings and single private P0 release train. Explicitly retained open acceptance gates for branch protection, signed JWT A/B, backup restore, staff identity, accessibility, translations and real author testing.
- Updated public roadmap/README to make the unlaunched hosted-service boundary and concrete owner actions visible. Docs/issue hygiene only; no backend, public signup, Supabase, Vercel, DNS, secret, license or production change.

## 2026-10-31 — Fix misleading Markdown previews for indented source code

- Resolved a writer-facing mismatch: the on-device Markdown exporter preserved all article whitespace, but the live preview still trimmed the **whole article** before parsing. The preview now receives the untrimmed body; empty-only drafts still show the localized placeholder.
- The restricted preview and the linked local outline now recognize four-space/tab-indented Markdown code blocks and display them in non-executable PRE/CODE nodes. Blank lines inside an indented code block are retained where the next nonblank line is also indented. Author raw HTML remains text, not active markup.
- Added pure parser/render security regressions and integration coverage for edit → preview → export → reopen fidelity. The feature does not implement full CommonMark, browser autosave, a public post, backend storage or user accounts. Manual browser/mobile QA remains necessary.

## 2026-10-31 — Real original-article proposal intake through human-reviewed GitHub

- Added a **visible public contributor journey** at `/contribute.html`: write locally, propose a short original technical article through a GitHub issue, and optionally submit a reviewed PR. This is an interim open-source editorial path while hosted account-based publication remains blocked.
- Added a dedicated GitHub Issue Form `article_proposal.yml` with structured headline, language, topic, public summary, safe evidence, explicit public-visibility and contribution-rights acknowledgements. Full manuscripts are **not** automatically uploaded or entered in a public issue.
- Documented mandatory editorial review, authorship/copyright boundaries, real article HTML/source/RSS/JSON Feed parity, and post-deploy HTTPS confirmation in `docs/EDITORIAL_CONTRIBUTIONS.md`.
- Linked the path from the real homepage, browser-only Draft Lab, engineering archive, README and contributor policy. Updated canonical sitemap and added source/safety/mobile tests plus independent read-only live HTTPS checks.
- No user account, backend upload, database write, private Core, auto-publishing, API, analytics, Supabase, Vercel, DNS or billing changes. The proposed workflow does **not** remove the P0 reviewer / backup-restore / real JWT gates for future hosted publishing.

## 2026-10-31 — Bookmarkable article discovery with safe topic links

- Upgraded the **live public engineering archive** search: keyword + allowed topic filters now appear as shareable `?q=...&topic=...` links. Opening a link restores the filtered results; keyboard navigation/back-forward restores the view without network search, storage or analytics.
- Added an explicit **Copy filtered link** button, accessible success/failure notice, bounded 80-character plain-text keywords and strict existing-topic allowlist. Clipboard denial falls back to the visible browser URL. Unknown query parameters are removed only when users change filters.
- Original articles remain fully rendered and crawlable without JavaScript. Existing canonical URLs, sitemap, RSS, no-public-write and privacy boundaries are unchanged. Added browser-DOM regression tests and external HTTPS smoke for the shareable public archive.
- No hosted search, registration, Supabase, private Core, production account data, authentication, tracking or paid infrastructure. Manual keyboard/screen-reader and mobile browser QA still required.

## 2026-10-31 — Eight shareable homepage language routes (public static preview)

- Added real, static, crawlable localized public homepages under `/ru/`, `/th/`, `/es/`, `/fr/`, `/de/`, `/pt/` and `/zh/`, together with the existing English root. Every language has its own canonical URL, reciprocal `hreflang`, a visible eight-language switcher, the existing emerald visuals, functional article/Draft Lab links, explicit pre-launch status, and readable responsive sections.
- Added an allowlisted `?ui=<locale>` interface-only option to the browser Draft Lab so entering from a localized home does not force an English interface. **Article language, draft text, local-only export and import remain independent**.
- Updated the public sitemap and SEO checks to index 19 real canonical pages, added tests for locale links, no staging signup, mobile keyboard and all eight language choices, and strengthened post-deploy HTTPS checks to fetch every localized URL.
- Language versions are a **localized homepage overview**, not a translation of all engineering articles, all developer docs, hosted Core, live discussions or a claim of native-speaker review. Independent language quality, real-device accessibility and search-engine indexing remain unverified.
- No public signup, hosted writing, Auth/RLS change, browser storage, analytics, private code, DNS or additional service cost.

## 2026-10-31 — Visible homepage graphics published, not only README

- Added a prominent original emerald/graphite orbital product illustration directly to the **real public homepage**, including on narrow/mobile screens. Kept honest PUBLIC / BROWSER / LOCAL / PLANNED distinctions, working CTAs and visible keyboard focus.
- Published the already-reviewed premium README overview SVG as a **separate actual GitHub Pages asset** under `site/visuals/`, and displayed it in a full-width responsive product overview below the homepage hero. The Pages workflow uploads only `site/`, so assets in `docs/assets/` alone never appeared on the site.
- Replaced three decorative single-character symbols with original self-contained vector pictograms, while retaining readable card titles and links. Added tests for SVG safety, responsive mobile styles, source-to-deployment asset paths, and no staged sign-in CTA.
- Strengthened the post-deploy canonical HTTPS smoke to download **both graphics from https://24go.top/visuals/** and require unique visual identifiers, not merely check for a green deployment job.
- No public registration, authenticated publishing, private hosted Core, Supabase, Vercel, DNS, third-party image CDN or new billing. Real-browser screenshot and screen-reader QA remain separate checks.

## 2026-10-31 — Draft Lab preserves whitespace in exported article bodies

- Replaced body-wide trimming during local Markdown export with exact body text preservation, including leading indentation and trailing blank lines.
- Added multilingual export/reopen tests, strict UTF-8 file-read coverage and old export compatibility.
- Browser-only: no network, autosave, database, public publishing or new privileges. Browser line-ending behavior and native download handling remain unchanged.

## 2026-10-31 — Distinct on-device draft names for multilingual authors

- Prevented Russian, Thai, Chinese and other non-Latin article titles from collapsing into a single generic local Markdown filename for each language. Suggested `.md` filenames now contain a readable bounded ASCII slug, language and stable 64-bit title fingerprint; slash, markup and long headings remain safe in filenames.
- The title fingerprint is solely a non-cryptographic local filename disambiguator; it is **not** article integrity, a revision identifier or proof of saving. A browser may still handle repeat downloads of the same article title differently, so authors must confirm each file is actually saved.
- The exported Markdown format, old `.md` import, article text, session memory, backend boundaries and separate locale selectors are unchanged. Added tests for all eight languages, Unicode normalization, mixed scripts and legacy exports.

## 2026-10-31 — Prevent accidental file-drop navigation in Draft Lab

- Block native file dragover/drop navigation **outside** the explicitly marked Draft Lab .md import zone. A misplaced local file no longer instructs the browser to replace the editor page; existing in-memory drafts remain untouched. Show the already localized import-area hint.
- Keep file drops **inside** the marked zone routed to the existing strict UTF-8 parser, 64 KiB limit, latest-import race gate and replacement confirmation. Preserve normal text/link drag-and-drop editing.
- Added local DOM integration regression coverage for outside-zone file drops, normal text drags and valid import-zone drops. This does **not** add autosave, browser storage, uploads, public publishing or any backend permission. Actual browser/mobile QA remains necessary.

## 2026-10-31 — Explain staging-only authentication and public product boundary

- Documented why the separate Vercel/Supabase **existing-account staging identity** page has a login while the canonical `24go.top` static public site does not. Clarified the private `24GO.online` repository name is not a public product domain, and distinguished **READY deployment** from a verified, secure public publishing release.
- Added the answer to README FAQ and refreshed the deployment evidence register using verified Vercel project metadata and private staging **source only**; no secrets, user records or token-bearing links.
- The public `/progress.html` development page now explains why there is no public sign-in CTA and links to the status register; it does not send users to the staging login.
- Retained the rule against routing general visitors to staging authentication or enabling public signup, writes and moderator publishing before independently reviewed Auth/JWT RLS, restore and AAL2 gates. Documentation-only change; no Vercel, DNS, Supabase, production, CI or staging config mutations.

## 2026-10-31 — Premium README hero and reader keyboard focus

- Updated the local SVG README hero in the graphite/emerald design system with readable `OPEN SOURCE · MIT`, cinematic styling, and honest `LIVE`/`LOCAL`/`PRE-LAUNCH` capability labels; no external resources or scripts.
- Added concise public articles / browser-only Draft Lab / local SDK entry points to README while retaining verified status, ownership and existing MIT license.
- Made local demo main and feed fragment targets programmatically focusable with `tabindex="-1"`, preserving native Tab order; extended source tests and keyboard/screen-reader manual QA guide.
- Fixed local reader brand navigation so it keeps the current EN/RU/TH/ES/FR/DE/PT/ZH URL rather than forcing `/en/`; automated regression checks include unknown-locale fallback.
- No private Core, production account/write access, Supabase, infrastructure, secrets, DNS or hosting changes. Manual browser QA and independent P0 security review remain open.

## 2026-10-30 — Local Markdown drop and corruption-safe multilingual import

- Added a visible, responsive drag-and-drop area for exactly one **previously exported** Draft Lab `.md` file; the native file picker remains available for keyboard and mobile users. The drop target does not transmit, store or execute file contents.
- Both entry points share the existing confirmed-replacement and in-memory file-race guard. Import now reads raw file bytes and decodes **strict UTF-8** instead of lossy `File.text()`; malformed bytes, misleading file lengths, non-ArrayBuffer reads and dangerous file paths are refused before any editor changes. Valid UTF-8 BOM and all eight original article languages still round-trip.
- Localized guidance for eight languages, high-contrast light/dark styling and regression tests for drop, invalid/multiple files, pending imports, encoding, unsaved changes and keyboard fallback. No accounts, cookies, tracking, storage, backend or public article publishing.


## 2026-10-30 — Verified corporate contact visible on the public site

- Added the founder-approved `ceo@24go.top` as a standard `mailto:` link in the homepage footer's community/contact navigation.
- Confirmed an actual message addressed to `ceo@24go.top` reached the designated Gmail destination through Namecheap email forwarding on 2026-10-30; this verifies **inbound forwarding only**, not outbound Gmail "send as" configuration.
- Kept the private forwarding mailbox address out of public HTML; no email tracking, contact form, new JavaScript, DNS, analytics or production backend changes.


## 2026-10-30 — Searchable engineering article topics (public UX)

- Added keyboard-accessible, responsive topic filters to the existing 9-article engineering archive: Security, Writing UX, Infrastructure, Publishing and Discovery. Filter chips combine with local keyword search; Clear filters resets both and restores keyboard focus. Live article counts and pressed states are announced without external requests or trackers.
- Every original article remains in static, crawlable HTML when JavaScript is off; topic filtering is a progressive enhancement, not fake indexing or user publication. Existing canonical URLs, RSS and JSON Feed are unchanged.
- Added synthetic browser tests for combined search, topic change, Reset, Escape and error/no-JavaScript fallback, plus page-structure assertions. No user data, cookies, storage, signup, API credentials, paid services or private hosted code touched.

## 2026-10-30 — Keep validation visible across language switches

- Fixed an accessibility edge case after the keyboard export release: switching the Draft Lab UI locale, changing another field, or changing a select could clear the live validation message while leaving an invalid field marked. Active errors now persist with the correct localized explanation until the offending control is corrected.
- Added a simulated browser regression test, with no article mutation, storage, HTTP requests, identity/auth changes or deployment configuration changes.

## 2026-10-30 — Accessible field validation and explicit Markdown export shortcut

- Added Ctrl+S (Windows/Linux) / Command+S (Mac) for the browser-only Draft Lab. It dispatches the existing validated **local .md download** action, not autosave or server publishing; a visible explanation is translated across all eight interface languages.
- Replaced fragile English-error-message parsing with field-identity validation. On invalid export or copy, focus the exact failing title/body/language/category/source control, mark it `aria-invalid`, associate the status explanation through `aria-describedby`, and clear the marker upon editing or approved draft replacement.
- Added simulated keyboard, error-focus and boundary tests. No additional dependencies, storage, tracking, new public write API, credentials, DNS or private hosted code.

## 2026-10-30 — Draft Lab: preserve user writing during asynchronous .md import (source PR)

- Prevented older slow file reads and a second file picker selection from overwriting newer in-tab edits. Import applies only when it is the latest request **and** the article fields were not edited, formatted or cleared while the file was opening.
- Added an honest, translated interrupted-import notice in all eight supported UI languages. Changing the interface language alone does not invalidate the import or alter article language; no browser storage, server upload or API requests were introduced.
- Added pure race-gate and simulated-browser regression tests for typing, formatting, Clear, reordered promises, failing older reads, and unchanged reopened-file baselines. This improves offline author UX; it does not enable public posting, login or SEO indexing.


## 2026-10-30 — Material Design SVG navigation and protected-main runbook (README-only PR)

- Added seven small source-controlled emerald Google Material Design icons (Apache-2.0, copyright/attribution and original source paths preserved) and replaced inconsistent decorative UI emoji with accessible text-labelled icon navigation in all eight README languages. No font package or CDN was installed.
- Added regression tests for safe SVGs, local path resolution and accessible navigation, plus precise GitHub owner-only branch protection steps and expected CI status. No GitHub branch settings were changed by this source-only PR.


## 2026-10-30 — Standards-based JSON Feed for technical content discovery (source PR)

- Added optional JSON Feed 1.1 with nine authentic English engineering articles, canonical HTML links, original authors, published dates and short summaries; fixed one pre-existing mismatch between RSS headline and Article JSON-LD.
- Added deterministic source generator/check, adversarial parity tests, homepage/archive feed discovery and post-Pages independent HTTPS probe. This does not mean search engines indexed the pages, AI assistants cited them, or the hosted community launched.


## 2026-10-30 — Live, accessible Markdown article section outline

- Added a browser-only heading outline beside the Draft Lab article preview. `#`, `##` and `###` headings become keyboard-accessible in-page links. Heading IDs are generated locally, not derived from user text; headings inside code fences stay code, not navigation.
- Outline updates as the author types or switches any of the eight UI languages. Navigation uses fixed DOM elements with author labels inserted only via `textContent`, and it remains hidden when no supported headings exist. No article content, saved-file baseline or download data is modified; there are no network requests, automatic saves or hosted publication.
- Added pure renderer and simulated-browser regression tests, eight localized accessibility strings, responsive CSS, usage documentation and a post-Pages real HTTPS asset check. Native-language and real mobile/screen-reader QA remain pending.

## 2026-10-30 — Refined GitHub README visuals, infographic storytelling and language flags

- Replaced the public GitHub README graphite/emerald hero artwork with a more readable source-controlled banner focused on the **actually available** editorial articles, browser-only Draft Lab and local OSS SDK examples; retained the pre-launch disclosure.
- Redesigned the public/private/planned architecture SVG for clearer status lanes. Added two new lightweight source-controlled, accessible SVG infographics: an evidence-first editorial publication workflow (real problem → reproducible implementation → tests/sources → discoverable guide) and a reviewed OSS contribution path (code/security, localization/accessibility, technical docs and Issues → PR → CI → review).
- Placed all five diagrams naturally across the main English README and seven existing localized summaries (RU, TH, ES, FR, DE, PT, ZH), and added accessible globe/flag hints to all language switchers. Introduced subtle action icons for the primary links and contributor calls to action, without remote assets or scripts.
- Expanded automated tests for image security/accessibility, live-vs-planned accuracy, source-controlled image positions, links and all eight language selectors. This is **documentation presentation only**, not a launch of user publishing, AI agents, moderation or any new hosted feature.

## 2026-10-30 — Deeper eight-language README and safe author-workflow diagram

- Expanded the English GitHub README with a concise navigation index, detailed browser-local writer lifecycle, realistic release constraints, repository source map, security/privacy trust boundaries, evidence-backed roadmap gates, troubleshooting and contributor pathways.
- Added a third lightweight self-contained, accessible graphite/emerald SVG diagram distinguishing the shipped local Markdown workflow from **unlaunched** authenticated moderation and hosted publication; linked it from all seven translated README pages with locally translated workflow/privacy explanations.
- Updated the README internationalization maintenance guide and tests to check all eight README entry points, media accessibility/security, navigation, relative links, truthful product status, article evidence and the new workflow.
- **Docs-only:** No hosted auth, database schema, production deployment, company/legal claims, generated adoption figures or change to existing MIT licensing.

## 2026-10-30 — Strengthen GitHub README usability and maintenance checks

- Added role-based quick navigation and explicit release FAQ to the existing eight-language README showcase, so first-time visitors can quickly reach real articles, safe local writing, SDK onboarding and contributor tasks.
- Introduced automated checks across all eight README entry points for relative links, multilingual navigation, source-backed article references, honest product status and lightweight accessible self-contained SVG diagrams. No runtime feature or hosted publishing behavior changed.

## 2026-10-30 — Post-Pages independent SEO audit and truthful release evidence

- **Follow-up evidence:** [independent live SEO run #40986751453](https://github.com/rf24kja/24GO.top/actions/runs/40986751453) passed all 12 deployed sitemap URLs, including nine engineering articles, robots, RSS, canonical and redirects. This is delivery evidence only; indexing and human traffic remain unmeasured.

- Changed the read-only external SEO workflow to run after a **successful completed** GitHub Pages deployment, not concurrently with it. It retains daily/manual and source-change checks, canonical HTTPS/TLS/robots/RSS/sitemap coverage, and no write token or secrets.
- Added workflow regression tests for event ordering and read-only permissions. Reconciled the editorial evidence log to nine source articles, nine RSS items and 12 sitemap URLs while explicitly marking the three new article URLs' independent live verification pending until a new audit succeeds.
- Rechecked official Claude OSS, GitHub Copilot maintainer/cloud experience and AWS Activate/Pioneer eligibility; no application, grant, credits or external adoption is claimed. No site content, DNS, Supabase, backend or paid services changed.

## 2026-10-30 — International GitHub README and original architecture graphics

- Rebuilt the root GitHub README as an accessible, practical project landing: honest pre-launch disclosures, featured original engineering guides, public vs private vs future product map, verified developer quickstart, contribution paths, security/IP rights and links to the actual website, RSS, changelog and delivery evidence.
- Created two self-contained, optimized graphite/emerald SVG illustrations (brand hero and three-lane architecture infographic), with descriptive titles/alt text and no remote dependencies, scripts, animations or external assets.
- Added independently navigable README translations for RU, TH, ES, FR, DE, PT and ZH, alongside canonical English; each includes a substantial project overview, working links, local setup and release disclaimers. Translation quality needs real native-speaker review, tracked separately.
- Added structural tests for eight-language navigation, all local links, SVG safety, real product status and developer commands; documented a maintainable translation workflow in `docs/README_LOCALIZATION_GUIDE.md`. This is GitHub documentation only; no hosted community launch, new domain, Supabase write, secret or paid service.

## 2026-10-30 — Three original, source-backed engineering articles for SEO and AI discovery

- Added three original English technical guides: independent interface/document localization in Markdown editors (public PR #81), GitHub Pages live verification and deployment race (PRs #79/#82), and safe DOM citation hyperlinks (PR #78). Each includes a reproducible lesson, source and test links, explicit limits, self-canonical, OG metadata and visible publication date with supported `Article` JSON-LD.
- Updated crawlable engineering archive, homepage editorial links, RSS and canonical sitemap, plus an optional human-readable discovery index. Corrected an older security article to acknowledge newer safe-link support. Added consistency tests to prevent mismatched source attribution, canonical URLs and syndication.
- Introduced an evidence-based [editorial search plan](docs/EDITORIAL_SEARCH_DISCOVERY_PLAN.md). No claim of index coverage, search ranking, referral traffic, citations in AI products, or launched hosted publishing. No paid SEO tooling or changes to Supabase/production permissions.

## 2026-10-30 — Eight-language public Draft Lab interface (browser-only)

- Added an explicit interface-language switch for EN, RU, TH, ES, FR, DE, PT and ZH independently of the selected article language. Translated the Draft Lab's main navigation, content, buttons, placeholders, form labels, safety/privacy warnings, editor status, validation and confirmation messages, and category descriptions.
- The language switch updates only fixed text nodes, HTML language and accessible attributes; it never changes the actual article text, source link, content locale, category, imported-file baseline or Markdown export format. There are no network requests, cookies, browser storage, tracking, authentication or publishing permissions.
- Added eight-locale dictionary and DOM-safety regression tests, writer-session data-loss checks and responsive language selection. Translations need native-speaker and screen-reader review before being considered production-quality; the entire hosted community remains pre-launch.

## 2026-10-30 — Draft Lab safe citation links, public static release

- Added a keyboard-accessible Link action in the browser-only Draft Lab that wraps selected text in Markdown `[label](https://example.org)` and selects the destination for editing, without submitting or storing any draft.
- Extended the intentionally restricted Markdown preview to render only bounded, noncredentialed HTTP(S) citation anchors through safe DOM APIs, using `rel="noopener noreferrer ugc"`, `target="_blank"` and `referrerpolicy="no-referrer"`. Unsupported or unsafe syntax stays literal; code fences, untrusted HTML, and scripts remain inert.
- Added tests for URL validation, malicious labels/schemes, toolbar keyboard-selection behavior, offline draft persistence boundaries, and public disclosure. Existing MIT code and static-only Pages workflow remain unchanged; no hosted publishing is enabled.

## 2026-10-29 — Markdown editing tools for technical authors

- Added keyboard-accessible heading, list, quote and fenced-code insertion to the existing browser-only Draft Lab, with selection-aware edits, editable placeholders and existing live preview.
- Pure formatting checks enforce the 12,000-character limit, refuse malformed selection positions and single-line heading violations, and use code fences longer than any selected backtick run. New tests cover safe formatting, import/editor UI and loss-warning invariants.
- No backend, accounts, uploads, persistent browser storage, analytics, DNS, private code or publication claims. Source-only prototype enhancement; rollback via PR revert.


## 2026-10-29 — Consistent design across all static public pages

- Aligned all 10 public-site HTML pages (main landing, development timeline, Draft Lab, engineering catalogue and six original notes) under restrained graphite/emerald 48px grid design with consistent shared navigation, keyboard skip links, and light/dark tokens. The public landing retains its own existing design; interior pages share a static interior stylesheet.
- Removed the old one-off progress styling and normalised design on archive/article reading pages. Keyboard navigation, 320px layout, light/dark mode, strong contrast, reduced-motion handling and accessible preview/code blocks are explicitly checked. Editor fields, export/import behavior and prelaunch disclosures remain intact.
- Static-only CSS/HTML and source assertions; no cursor motion in the writing workspace, dependencies, external requests, persistent storage, account claims or private hosted-Core code. No DNS, Supabase, VPS or billing changes.


## 2026-10-29 — Discoverable engineering archive with local article filtering

- Added progressive, no-network search by title/summary across six static source-backed engineering notes. Search UI appears only when JavaScript initializes, keeping the entire catalogue readable/crawlable with JS disabled. Results count uses an ARIA live region and Escape clears the query.
- Applied restrained static architectural lines to the engineering reading experience, aligned card borders and sticky navigation with the home design, and added system light/dark tokens with explicit readable code blocks. No cursor animation on article pages, analytics, third-party dependencies or private content exposed.
- Tests cover matching, zero results, reset, keyboard, no-JS fallback, six canonical articles and limited color/motion rules. No additional pages or sitemap changes.


## 2026-10-29 — Reduce pointer glow to a quiet architectural accent

- Reduced the homepage cursor aura radius from 520px to 360px and dark-theme central intensity from 0.13 to 0.038, with light-theme intensity from 0.08 to 0.022; left the 48px static grid, text, CTAs, reduced-motion and high-contrast overrides intact.
- Added regression assertions for both system color schemes so the stronger glow is not inadvertently reintroduced. No JavaScript, backend, DNS or user data changed.


## 2026-10-29 — Accessible architectural-grid landing redesign

- Redesigned **static** canonical home page with graphite/white/emerald design tokens, cursor-reactive subtle CSS architectural grid, prominent editor/engineering CTAs, improved reading hierarchy, consistent cards, sticky translucent header and informative footer.
- Added native system light/dark themes, reduced-motion and coarse-pointer fallbacks, keyboard skip/focus, responsive 320px navigation, source-backed articles and honest prelaunch disclosures.
- Effects use one passive pointer listener, requestAnimationFrame and optional IntersectionObserver; no external libraries, analytics, cookies, persistence, network requests or fake account/launch promises. No backend, Supabase, DNS or hosted publishing changes.
- Preserved canonical homepage, RSS, roadmap, SDK and contributor links; source CI + Pages deploy required before claiming rollout.


## 2026-10-29 — HTTPS apex and permanent redirects independently verified

- The owner changed GitHub Pages custom domain to `24go.top` and enabled `Enforce HTTPS`; [official settings audit attempt 2](https://github.com/rf24kja/24GO.top/actions/runs/40882729744) passed with an approved certificate for both apex and www.
- [PR #70](https://github.com/rf24kja/24GO.top/pull/70) expanded external SEO verification to first-hop permanent redirects and preservation of article paths/query parameters. [Post-merge full external audit #40886701790](https://github.com/rf24kja/24GO.top/actions/runs/40886701790) and [Node CI #40886702093](https://github.com/rf24kja/24GO.top/actions/runs/40886702093) passed. Nine sitemap pages, RSS and robots served correct canonical HTTPS content; checked HTTP/www redirects are 301.
- [Issue #59](https://github.com/rf24kja/24GO.top/issues/59) closed as completed, with GitHub Actions evidence. No paid SSL or registrar DNS changes. Google/Bing indexing and AI-search citation metrics remain unverified.


## 2026-10-29 — Independent crawlability evidence and full sitemap monitoring

- [PR #60](https://github.com/rf24kja/24GO.top/pull/60) added a secret-free daily/on-demand GitHub-hosted external SEO audit; [PR #61](https://github.com/rf24kja/24GO.top/pull/61) made it inspect every route even after a wrong redirect; [PR #63](https://github.com/rf24kja/24GO.top/pull/63) upgraded it to verify every sitemap-listed article and self-canonical tag.
- [Real external runner #40881090465](https://github.com/rf24kja/24GO.top/actions/runs/40881090465) fetched all 9 sitemap pages and robots/RSS over HTTPS and confirmed the new SDK security article is served. The audit intentionally fails because **apex redirects to www**, and **HTTP requests still terminate on HTTP www**, contrary to canonical/HTTPS requirements. Source CI is green; Search Console/Bing indexation and AI search results remain unverified.
- Recorded the precise evidence in deployment/SEO status documents and open Issue #59. The founder-approved canonical domain remains `https://24go.top` and must not be changed ad hoc to mask the misconfiguration. No DNS/Pages/production changes.


## 2026-10-29 — Original JavaScript SDK credential-leak prevention case study

- New evergreen English engineering guide illustrates a real public PR #56 security boundary, specific test input, safe recipient validation and honest prototype limitations. Published as static HTML and linked in the home page, engineering index, RSS, sitemap and optional llms.txt; no private code or credentials.
- Unit tests updated to cover six actual engineering notes, nine sitemap URLs and full internal navigation consistency. No mock rankings, fake authors or synthetic backlinks.
- Independent external GitHub runner verified that `https://24go.top/` redirects to HTTPS `www.24go.top`, contradicting approved apex canonicals; Issue #59 remains open pending separately authorized DNS/Pages settings review. No DNS change in this PR.


## 2026-10-29 — Source-only search and AI discovery foundation

- Prepared root-level `robots.txt` and eight canonical URLs in `sitemap.xml` for the founder-approved `https://24go.top` origin. Explicitly excluded Draft Lab because it remains `noindex,follow`.
- Normalized editorial canonical hints and RSS URLs to the approved apex, published a new original, referenced technical article on crawlable knowledge, and updated engineering/home navigation and an optional `llms.txt` reader index. No invented translations or rankings.
- Added source-level tests for canonical URL consistency, public-file existence, sitemap validity shape, RSS coverage and prototype exclusion.
- **Not proven:** external DNS, HTTPS, www-to-apex redirect, GitHub Pages delivery, Google/Bing index status, AI crawler access, Search Console ownership and user adoption. Those require independent post-deploy checks and Search Console/Bing evidence. No DNS/settings/production change made.


## 2026-10-29 — SDK development-key recipient isolation (PUBLIC OSS)

- [PR #56](https://github.com/rf24kja/24GO.top/pull/56), merged as `00f83bbe79b7e728049f8554a003f5f7392230a4`, fixes a real public SDK credential-leak path: `TopClient.publishPost()` no longer sends the shared local development bearer token to **any remote HTTP or HTTPS hostname**, including misleading localhost-like domains. This aligns the SDK with the earlier local-only HTTP write gate from PR #52.
- Read-only SDK requests to remote HTTPS endpoints still work and do not transmit development keys. Unit tests cover remote HTTPS, LAN, malformed lookalike hosts, and proper loopback behavior; OpenAPI now includes real local socket/Host/Origin constraints and the 403 error, with updated quickstart. PR and post-merge `main` checks both passed.
- This is a development-token safeguard in the public MIT client, **not** verified Auth, a launched remote API, npm package or active user publication. No hosted Core, Supabase, DNS, VPS, secrets or production state was changed. Rollback: Git revert (restores unsafe key transmission and is not advised).

This is the human-readable **history of verified changes**. Actual GitHub commits and merged Pull Requests are the authoritative audit trail. Planned capabilities are in [the roadmap](docs/ROADMAP.md), not represented as released features.

We follow a lightweight **Keep a Changelog** format until a first tagged release. These are development milestones, not npm release versions or proof that the community is in production.

## 2026-10-29 — Official OSS/startup program availability recheck

- Rechecked official Claude for OSS, Copilot OSS and AWS Activate terms without applying. Corrected the Claude Startups watchlist to reflect the provider's **currently full cohort and closed applications**, and added AWS Pioneer as a separate unverified eligibility candidate. Public repository impact remains **1 star, 0 forks** (GitHub API); no credits, grants, subscriptions or GPU capacity received. Documentation-only; no license, billing or infrastructure change. Rollback: revert this docs PR.

## 2026-10-29 — Local publishing containment and honest prototype author labels

- [PR #52](https://github.com/rf24kja/24GO.top/pull/52), merged as `785732551e7b905ddf83881cfac2048f02ff4aaf`: restrict shared-key local JSON `POST /api/posts` to an actual loopback client/socket pair and local `Host`/matching browser `Origin`, even when the demo server is accidentally bound to `0.0.0.0`. A normal loopback JavaScript SDK/CLI call still works; external LAN/Docker-bridge writes are deliberately refused. The initial Host spoof integration test used `fetch` (which rewrote the Host header); fixed to use Node HTTP for a real forged Host. PR and merged-main CI passed.
- [PR #53](https://github.com/rf24kja/24GO.top/pull/53), merged as `4efc262cb902e6fd0d61bfe233d5eeb172d6c2bf`: eight-language article-card category labels, and an explicit **unverified** label for both person and AI-agent types because the PUBLIC local demo's `authorType` comes from user input. Malformed categories, identity types and publication times fail closed. Tests cover all eight locales. The first PR run encountered an unrelated flaky Draft Lab VM timeout under parallel CI; the bounded test budget was increased and the final PR and main runs succeeded.
- Both changes are **PUBLIC MIT local-prototype code only**. They neither verify a real user/agent identity nor grant public publishing rights. The PRIVATE hosted Core remains separate, and staging schema/backup/migration work is outside this PR's scope. No production service, DNS, VPS or Supabase was changed. Rollback: revert the respective focused PR.

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
