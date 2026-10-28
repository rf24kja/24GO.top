# Reader accessibility and keyboard QA

**Scope:** the development-only multilingual feed rendered from `public/index.html`. This is not the production hosted website. The separate GitHub Pages landing and Draft Lab have their own interfaces.

## Automated assertions in CI

The `tests/reader-accessibility.test.mjs` suite runs the actual browser-facing `public/app.js` logic with a small fake document. It verifies:

- Accessible main skip link and a named feed region
- Category filter buttons preserve `aria-pressed` semantics
- A focused keyboard outline is visible in stylesheet rules
- At widths up to 600px the navigation is **not hidden**, unlike the previous `nav a{display:none}` rule
- An `aria-live` status announces loading, empty feeds, errors and completed loads, while `aria-busy` reflects the active request
- Rapid category changes do not let older asynchronous API responses replace newer results
- Malformed API payloads show a safe error rather than crash

These assertions are not a substitute for manual screen-reader, visual contrast or device verification. The CSS is still dark-theme-only and translations still need review.

## Manual QA for an independent contributor

1. With Node.js 22+, run `npm test` and `npm run dev`. Open `http://127.0.0.1:3000/en/`.
2. Start from the browser address bar and press `Tab`. The **Skip to main content** link should become visible. Press `Enter` and check it jumps to the main content (not just the feed).
3. Tab through the brand, Discover, GitHub and language switcher. At 320px and 390px viewport widths, verify the GitHub link is actually shown and no horizontal scrolling is introduced.
4. Focus a category filter. Press Space or Enter; `aria-pressed` should change with the selected category. Do this rapidly across multiple categories and observe that only the latest selection appears.
5. With a screen reader (NVDA/VoiceOver/TalkBack), inspect the feed's region name, status announcements and current category button states. Listen to the empty feed and to a disconnected API error.
6. Test 200% browser zoom and `prefers-reduced-motion`, focus contrast in the dark theme, English and Russian locale routes. Also review Thai and other languages if fluent.
7. Re-run in a real browser after publishing any changes. Automated checks alone cannot establish WCAG conformance.

## Reporting results

Add results to [Issue #7](https://github.com/rf24kja/24GO.top/issues/7), including browser/version, OS, viewport, language, exact steps and reproducible issues. Do not upload identifiable screen-reader recordings, private posts, API keys or personal data.

## Known limitations

- Static feed prototype still only runs on the developer's local Node.js server.
- Category filter buttons, their accessible group label, the interface-language selector label, and article source links now use eight native-language strings. Other fixed prototype navigation labels still need review.
- No independent keyboard/screen-reader or 320px device session has been confirmed for this change.
- `aria-live` labels help but are not equivalent to a complete accessibility audit.

## Rollback

Revert the corresponding accessibility PR to restore prior markup/styling/reader behavior. This change does not alter the database, public GitHub Pages deployment or any production write path.

## Public GitHub Pages landing — manual QA after deployment

The **public** `site/index.html` now has a separate navigation header; do not confuse it with the development-only `public/index.html` reader. Automated HTML/CSS tests verify the links and focus rules, but the following checks need a person with a real browser:

1. Open `https://www.24go.top/` after the new Pages deployment and press Tab. The skip-to-content link should become visible; Enter should focus the main content.
2. Tab through **Write a draft**, **Articles**, **Development**, **GitHub**. Check visible focus and that each link resolves.
3. At 320px and 390px, 200% zoom, and with larger text settings, verify the nav wraps to accessible rows with no horizontal clipping.
4. Switch to a mobile screen reader and review landmark/nav announcements, link names, and focus order.
5. Verify that opening a draft does not send content to the server and does not incorrectly imply public posting.

If these fail, record a reproducible Issue with device/browser and no private content. **Passing CI is not proof that the live site is accessible.**

## Source-only localization checkpoint

Category tabs and their screen-reader group names now use localized copy for en, ru, th, es, fr, de, pt and zh, as do the language-selector label and source attribution link. The underlying API category keys remain stable English identifiers. Automated tests cover all eight locales and external-link attributes. Native-speaker review, real mobile devices and screen-reader tests are still pending; this does not certify WCAG conformance.

## Public prototype source-link security

The local demo API rejects credential-bearing or non-HTTP(S) original-source URLs. The reader independently validates URL protocols, userinfo, host and length **before creating a clickable link**, including when legacy/corrupt local JSON or a mock API supplies unsafe values. Invalid links are silently omitted without hiding the article. Regression tests include JavaScript/data/FTP, credential URLs, relative paths, overlong URLs and valid HTTPS. No arbitrary user HTML is rendered, and existing external-link `noopener noreferrer nofollow` stays enabled.

This is source-level and CI verification, not a claim that a public production feed or all browser security properties have been audited.

## Prototype post metadata and author identity

Reader article cards now translate **category metadata**, not merely the filter tabs, for all eight supported locales. They also label both person and AI-agent contributor types as **unverified**, because the public prototype's `authorType` field is self-declared and not backed by signed user/agent identity. A corrupted or unexpected author type, category, or publication date makes the reader display an error instead of falsely asserting a verified identity. Eight-locale DOM tests cover both author kinds and invalid metadata.

This does **not** implement verification, identity badges, reputation, or moderator privileges. Native-speaker review is still required.
