# Draft Lab: first-publication UX experiment

**Status:** Static, experimental interface for user feedback. **Not a production editor.**

## What a visitor can actually do

- Open `https://24go.top/draft-lab.html` **if** GitHub Pages and the custom domain have been successfully deployed.
- Independently select the **editor interface** language (English, Russian, Thai, Spanish, French, German, Portuguese or Chinese) and the **article content** language. Changing the UI language never changes the title, article body, selected content language, source URL, downloaded Markdown format or imported-file baseline. These are prototype translations awaiting native-speaker and assistive-technology review.
- Enter a title, choose one of eight article-content languages and a content category.
- Write up to 12,000 characters, optionally attach an HTTP(S) source URL, and see a **restricted Markdown block preview** (headings, lists, quotes, fenced code, horizontal rules and paragraphs). Author HTML remains literal text. A narrow form of HTTP(S) citation link is rendered through fixed DOM-created anchors with escaped-text labels, a validated noncredentialed URL and privacy-safe navigation attributes. Other inline formatting and unsupported Markdown remain literal.
- Navigate a **live local section outline** when the Markdown body contains `#`, `##`, or `###` headings. It is derived from the same safe block parser as the preview; code-fence pseudo-headings are ignored. Navigation targets are generated fixed IDs rather than untrusted heading strings. The outline updates on edits and after changing UI language, without affecting author text, download content or reopened-file baseline.
- Copy the draft to the clipboard or download a UTF-8 Markdown `.md` file after client-side validation.
- Reopen a previously exported Draft Lab `.md` file to continue writing. Only our export format is accepted, with a 64 KiB file limit, and existing unsaved text requires a replacement confirmation.
- Clear a non-empty draft only after a confirmation prompt to reduce accidental loss.
- When navigating away, request the browser's standard confirmation if the current tab contains new or edited writing not identical to the last explicitly reopened file. An imported file with no edits does not trigger a warning. Some browsers may ignore the request; do not rely on it instead of exporting.

All content is held **only in memory in the current browser tab**, unless the visitor explicitly downloads a file or copies the text. The Markdown file remains on the visitor's own device, not on 24GOTOP servers. There is no authentication, server request, browser storage, automatic save, publication, shareable article URL or full Markdown rendering. The restricted block preview is an author-side experiment; the exported Markdown source is unchanged. Reopening/reloading the page loses any draft not saved by the visitor. The browser may show an exit warning for new or modified writing, but it cannot guarantee prevention of data loss.

## Why this is the right stage

The production identity and moderation architecture is not ready yet. This prototype lets potential human authors experience the simplest writing flow before we invest in expensive authenticated publication. The starter/public SDK remains under its existing MIT grant. Proprietary hosted-backend plans are unaffected.

## Real research script (5 voluntary participants)

1. Ask a voluntary tester to write a short technical explanation for a friend without instruction.
2. Ask them to locate the language, category and source URL fields.
3. Ask them to download their draft as Markdown, close the tab and later reopen it with **Open saved .md** (also try the copy button). Confirm they understand it has not been published or automatically saved. Record whether replacing an existing draft shows a warning.
4. Ask: Which part was confusing? What would make this better than an ordinary blog or GitHub Gist? Would you return after a month?
5. Record ONLY anonymized opt-in feedback in Issue #21 or GitHub Discussions. No session recording or tracking by default.

## Success / failure criteria (targets, not achieved results)

- Five genuinely independent people complete the draft-and-copy task.
- At least four understand that this is a local-only experiment, not a publishing backend.
- Capture the top three requested improvements with exact actionable acceptance criteria.
- Rework interface if two or more testers encounter the same blocking problem.

## Engineering verification

- Node `--check` validation for the Draft Lab JS.
- CI tests assert no network calls, browser storage, or unsafe HTML interpolation in the static client. The preview module has tests for code fences, accessible heading hierarchy, lists and literal treatment of HTML/script-like payloads.
- Live accessibility checks (keyboard, screen reader, mobile 320px) and HTTPS page smoke-test remain **manual pending tasks**, not automatically certified by unit tests.

## Risks and rollback

- **Data loss on refresh:** explicit notice and a best-effort `beforeunload` confirmation only for new/modified writing compared with an explicitly reopened local file. Browser/platform may suppress prompts or show generic wording; exporting to a local `.md` remains necessary. Copy and download requests are not treated as verified persistent saves.
- **Clipboard permission denied:** show an error; Markdown download remains available independently of clipboard permissions.
- **Accidental erase:** confirm Clear only for a non-empty text/source draft; Cancel leaves the draft untouched.
- **Downloads:** browser download prompts and storage permissions vary by platform; validate with real testers. A download request is not proof the file was saved.
- **Import:** the file picker only accepts our own structured export format, rejects invalid or oversized data, and asks before replacing current text. Browser file access permissions differ across devices. See [Returning Author Pilot](RETURNING_AUTHOR_PILOT.md).
- **No backend:** never ask users to register or submit API keys.
- Revert the Draft Lab PR to remove it. Existing Node publishing API remains unchanged.

## Next step

Use real feedback to scope accessible formatting (including code blocks), content source attribution, and the future authenticated Draft → Review → Publish lifecycle. The security gates in Issue #2 remain mandatory.
