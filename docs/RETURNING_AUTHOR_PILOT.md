# Returning-author pilot: save → leave → reopen → improve

**Status:** PROPOSAL / voluntary research. The Draft Lab feature is an experimental static-only UI; no real participant results have been collected or verified by this document.

## User problem

A prospective author may write a technical article over several sessions. A browser-only demo that loses everything on refresh is not a compelling repeat-visit experience. A browser download without import still forces users to edit outside the product. The smallest reversible test is allowing our **own exported Markdown files** to be reopened in Draft Lab.

## Implemented behavior in this code

1. Start an original article in `/draft-lab.html`.
2. Choose **Download .md**, which writes a local file using the browser's download feature.
3. Leave or refresh the page: nothing is autosaved and the in-memory draft is lost.
4. Return later and choose **Open saved .md**. Select a file previously downloaded from Draft Lab.
5. After parsing and validating its content **locally**, the editor fills title, language, category, source and body.
6. Continue writing and download again to keep new changes.

Existing drafts are not silently overwritten: the user is asked to confirm replacement, and cancellation preserves text. Invalid/oversized input is rejected with a non-sensitive error.

The implementation accepts **only our structured export format**, not arbitrary Markdown. There is no login, tracking, storage service or publishing API. No affiliation with an AI provider or paid offering is implied.

## Privacy/security rules

- File selection is explicit. Local `File.text()` is used; no uploads or external requests are introduced.
- Maximum accepted file size: 64 KiB (65,536 bytes), and Markdown content must match our earlier export grammar.
- Imported text is inserted with `value` and shown with `textContent`; never passed to an HTML renderer or evaluated as JavaScript.
- Unsafe source schemes and embedded URL credentials are rejected by the shared validation.
- Browser download location/permission depends on visitor settings; always check that the file actually exists before closing a tab.
- This is **not** encryption or secure backup. Anyone with access to the downloaded file may read it. Do not include private keys or confidential content.

## Proposed real volunteer study

**Do not invent successful sessions, retention percentages or screenshots.**

Invite five opt-in authors to:

- Write a 300–800-character technical note, including an optional source.
- Download the file and verify it exists.
- Close the browser tab, return on another session/device where practical, and reopen the same file.
- Edit one paragraph and download the new version.
- Explain whether they trust the workflow and what would bring them back.

**Targets, not observed values:** five completed return sessions; at least four can successfully reopen, edit and export without guidance; gather three actionable problems. Track drop-offs separately for Windows/Android/iOS and keyboard-only use. If two testers are blocked at import or file permissions, revise UX before adding more features.

## Success decision

A positive prototype result supports researching secure, authenticated server-side drafts **after** the founder resolves the public/private core boundary and P0 security gates. It does not prove product-market fit, DAU/MAU, paid conversion, or readiness to open public writes.

## 2026-11-01 — Lossless source citation and portable heading gate

The static Draft Lab now rejects source URL values containing raw control characters, URL-parser-erased leading/trailing spaces or URLs which exceed 2,000 characters before or after canonical percent-encoding. Browser `URL()` can silently remove newlines/tabs, and an altered citation must not be presented or exported as the author's original source. Strict validation also rejects title line/paragraph separators and C0/DEL controls, so Markdown headers cannot become malformed or spoofed file metadata. Both file export and optional browser vault share these checks; malicious input is refused without overwriting a stored draft. Existing safe multilingual Markdown round-trips still work. Tests are source-level: actual 320px/mobile and five returning-author sessions remain unverified. Rollback is a small public source/test/docs PR revert without DB, DNS or identity changes.

## Test & rollback

Node CI covers round-tripping every locale/category, previously exported files, CRLF/BOM, malicious URL data, oversized files and metadata tampering. Manual real-browser file picker, download, focus and screen-reader tests remain necessary. Revert the dedicated Import PR to remove this functionality; no database or production data migration is involved.

## 2026-11-01 — Numbered authoring steps and approximate multilingual words

The experimental browser editor now offers **Numbered list**, converting a selection or caret placeholder into plain `1. …` Markdown, with the existing restricted semantic ordered-list preview. The independent word meter uses browser `Intl.Segmenter` for locale-aware count, including Thai and Chinese; on older browsers its Unicode-regex fallback is an estimate and can undercount unspaced languages. It never changes draft text, doesn't authorize publication, doesn't affect export/import schema, and is not a minimum word requirement. New UI labels are localized into EN/RU/TH/ES/FR/DE/PT/ZH; real native-speaker review remains outstanding.

**Manual acceptance pending:** verify text selection and toolbar keyboard focus, exact numbered markdown, 320px mobile wrapping, long Thai/Chinese paragraphs, light/dark contrast, and download → reopen. Restore a prior static source-only commit to roll back. No cloud storage, secret, server or paid integration change.
