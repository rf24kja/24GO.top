# Draft Lab: first-publication UX experiment

**Status:** Static, experimental interface for user feedback. **Not a production editor.**

## What a visitor can actually do

- Open `https://24go.top/draft-lab.html` **if** GitHub Pages and the custom domain have been successfully deployed.
- Enter a title, choose one of the eight existing interface languages and a content category.
- Write up to 12,000 characters, optionally attach a HTTP(S) source URL, and see a plain-text preview.
- Copy the draft to the clipboard or download a UTF-8 Markdown `.md` file after client-side validation.
- Reopen a previously exported Draft Lab `.md` file to continue writing. Only our export format is accepted, with a 64 KiB file limit, and existing unsaved text requires a replacement confirmation.
- Clear a non-empty draft only after a confirmation prompt to reduce accidental loss.

All content is held **only in memory in the current browser tab**, unless the visitor explicitly downloads a file or copies the text. The Markdown file remains on the visitor's own device, not on 24GOTOP servers. There is no authentication, server request, browser storage, automatic save, publication, shareable article URL or rich Markdown rendering. Reopening/reloading the page loses any draft not saved by the visitor.

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
- CI tests assert no network calls, browser storage, or unsafe HTML interpolation in the static client.
- Live accessibility checks (keyboard, screen reader, mobile 320px) and HTTPS page smoke-test remain **manual pending tasks**, not automatically certified by unit tests.

## Risks and rollback

- **Data loss on refresh:** explicit notice; export to local `.md` or copy before leaving. No automatic persistence or upload promised.
- **Clipboard permission denied:** show an error; Markdown download remains available independently of clipboard permissions.
- **Accidental erase:** confirm Clear only for a non-empty text/source draft; Cancel leaves the draft untouched.
- **Downloads:** browser download prompts and storage permissions vary by platform; validate with real testers. A download request is not proof the file was saved.
- **Import:** the file picker only accepts our own structured export format, rejects invalid or oversized data, and asks before replacing current text. Browser file access permissions differ across devices. See [Returning Author Pilot](RETURNING_AUTHOR_PILOT.md).
- **No backend:** never ask users to register or submit API keys.
- Revert the Draft Lab PR to remove it. Existing Node publishing API remains unchanged.

## Next step

Use real feedback to scope accessible formatting (including code blocks), content source attribution, and the future authenticated Draft → Review → Publish lifecycle. The security gates in Issue #2 remain mandatory.
