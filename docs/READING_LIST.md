# Public article reading list — static prelaunch

The engineering archive on `/engineering/` now lets readers mark reviewed public articles **Save for later**. The optional browser feature does not require sign-in, a server session, payment, tracking, publication authority, or an AI model.

## What is stored

Only canonical filenames of currently visible **published editorial** articles, in a bounded versioned array (`24gotop-public-reading-list-v1`). No draft contents, identities, tokens, user queries, search history or private data are deliberately written by this feature. Entries are not encrypted, so someone using the same browser profile could inspect the list. Browser cleanup can erase them.

The script refuses unknown, duplicate or noncanonical article identifiers. On malformed saved data it fails closed, shows an error, and lets the reader explicitly clear the damaged list; it does not silently overwrite it.

## Reader experience

- Each reviewed article card gains a keyboard-accessible, pressed-state-aware **Save for later** or **Remove from reading list** control.
- The saved panel lists clickable canonical first-party article links, with a live count and an explicitly confirmed **Clear saved links** action.
- Changes from another tab are reflected through a read-only storage notification.
- The page does not write any browser storage merely by opening the archive.
- With JavaScript disabled or browser storage blocked, the original article cards and links remain available.

## Manual acceptance and rollback

Check desktop and 320/390px mobile widths, dark/light and high-contrast styles, Tab/Space/Enter interaction, VoiceOver/NVDA/TalkBack button announcements, private-browsing storage errors, cross-tab updates, corrupted stored data, browser refresh and explicit clear confirmation. Verify `release.json` SHA/run ID and the GitHub-hosted HTTPS probe separately; passing source tests is not confirmation of CDN delivery.

Rollback: revert the public static-site PR, then redeploy Pages. No database migration or private hosted Core changes are required. The manually saved public link preference can be cleared via the interface before rollback or the browser's site-data settings.

## Portable reader library: on-device search, backup and restore

The saved-links panel can now filter titles locally without touching the archive's original topic/text search, copy just the shown saved articles as canonical Markdown links, and remove any item without returning to its card. Import and export are **explicit** actions; no downloads, storage writes or uploads run on page load.

**Export** downloads `24gotop-public-reading-list.json` with `kind`, `version` and the ordered list of canonical published article filenames. The file is **not encrypted**; keep it private on shared devices. **Import** validates the `.json` filename, strict UTF-8, file byte count (12–16,384 bytes), version, backup marker, filename allowlist, uniqueness and capacity; it prompts before merging with the **current** browser list. If any imported item does not match the current reviewed public archive, the **entire import is rejected**. It does not fetch unfamiliar URLs or overwrite existing preferences.

A local saved-title search is only a display filter; exported backups contain the **entire** approved saved list, while **Copy shown links** copies only the currently visible saved subset. Each saved row supports explicit removal. Cross-tab updates re-render without triggering another storage write. The original unfiltered article archive remains accessible even if saved storage is invalid or blocked.

**Manual QA outstanding:** move a backup between two browsers, test corrupt/oversized/invalid-file inputs, cancelling confirmations, empty and filtered copy, failing clipboard/download, private storage quota, tab conflicts, mobile widths and keyboard/screen readers. Feature presence is covered in the Pages HTTPS audit, but exact deployed commit requires the independent release receipt to match the run. Rollback is one public static-source revert; previously saved v1 links remain readable by the earlier version.
