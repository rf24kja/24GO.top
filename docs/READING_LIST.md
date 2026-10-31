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
