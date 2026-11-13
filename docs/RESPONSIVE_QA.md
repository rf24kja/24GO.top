# Public responsive QA matrix (real Chromium, not every physical device)

Scope: **PUBLIC `24GO.top` static pages only.** Private hosted Core, credentials, authenticated publishing and user drafts are not exercised. The canonical configuration lives in [`scripts/responsive-viewports.mjs`](../scripts/responsive-viewports.mjs); this document is not an alternative hardcoded source of truth.

## Automated release gate

```bash
npm run check
npm test
CHROME_BIN=/path/to/chromium npm run mobile:check
CHROME_BIN=/path/to/chromium npm run draft:a11y
```

The PUBLIC [CI workflow](../.github/workflows/ci.yml) requires all four steps. `mobile:check` renders **14 public HTML routes** with local CSS in actual headless Chromium across **18 representative CSS viewport profiles (252 total)**, including:

- Portrait touch phones 280, 320, 360, 375, 390, 430 and 480 CSS px.
- Short-height touch phone rotations at 568×320, 667×375, 844×390 and 926×428.
- Touch tablets at 600×960, 768×1024, 820×1180 and 1024×768.
- **Desktop mode (`mobile:false`)** at 1280×800, 1440×900 and 1920×1080.
- Representative DPR 1/2/3, touch emulation, light/dark color-scheme and reduced motion.

The gate rejects document horizontal overflow, invisible/missing primary navigation, primary phone navigation links shorter than 44 CSS px or outside the viewport, and sticky multi-row headers occupying a short landscape viewport. Every failure names the viewport and route. It does **not** silently hide overflowing content. A separate Chromium E2E tests the functioning Draft Lab editor, search, keyboard focus and saved reading lists with JavaScript. `npm test` also enforces profile coverage, CSS reset inheritance and the supported 280px minimum.

## Issues uncovered by the larger matrix

- The German homepage at 280 CSS px forced its single-column grid wider because the content's minimum size exceeded the available width. Use a `minmax(0,1fr)` track, `min-width:0` and wrap translated card labels.
- The standalone Reading Paths page at 280 CSS px omitted the shared engineering CSS reset. Browser-default body margin combined with the site's minimum width to cause horizontal overflow. The page now loads `notes.css` **before** shared interior and path-specific styles.
- Landscape phones have limited vertical space: the multi-row homepage/interior headers remain in normal flow for viewports at most 950×450 rather than staying sticky and covering the article/editor.

Reproducible evidence: [PR #207](https://github.com/rf24kja/24GO.top/pull/207) and [public CI run 43336719560](https://github.com/rf24kja/24GO.top/actions/runs/43336719560). This is an automated Chromium result; verify the final **merged** SHA in a separate PUBLIC Pages/deployment check.

## Manual / external device acceptance still open

Automated Chromium emulation cannot guarantee pixel-perfect behavior on every device. Before claiming full cross-platform support, record actual results (device, OS/browser version, width/orientation, screenshot, tested URL and date) for iOS Safari with dynamic browser bars and zoom; Android Chrome with the on-screen keyboard; desktop Firefox and Safari; 200% text zoom and high contrast; screen-reader navigation (VoiceOver/TalkBack) and keyboard-only operation; long translated strings; and tablet portrait/landscape rotations. Do not invent participant feedback, claim manual testing from CI or close [Issue #7](https://github.com/rf24kja/24GO.top/issues/7) without real evidence.

Rollback: revert the PUBLIC CSS/script/test/HTML commits, rerun Node and Chromium gates, and verify the exact Pages deployment receipt against the expected commit; no database migration, DNS, secrets or user data are involved.
