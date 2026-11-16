# Offline editorial review package

The 24GOTOP Draft Lab lets an author explicitly download a review package with the complete unpublished Markdown document and a SHA-256 checksum of its UTF-8 bytes.

## Author flow

1. Prepare a valid original technical draft, and keep a separate local Markdown backup.
2. Click **Export review package**. Confirm that an unencrypted JSON file containing the full text may be downloaded to the current device. Draft Lab now runs a **local best-effort sensitive-content check** before this export. If common credential or email patterns are detected, it displays only categories (never matched values) and requires a **second, explicit confirmation** before allowing the plaintext package. Refusing either prompt downloads nothing. Changes during either consent step invalidate the attempt. Clean-looking text gets the original one-step consent; a clean result is not proof of safety.
3. Deliberately send the resulting JSON file only to a reviewer you trust. Nothing is uploaded, published, sent to GitHub or written to browser storage by the export action.

The package contains exactly four fields: `kind`, `version`, `document` and `sha256`. The document retains the existing Draft Lab Markdown grammar including the unpublished-draft footer.

## Reviewer verification

Use the browser's **Check review package** button. It validates a local selected file without replacing the open draft or browser vault. For an author or reviewer who explicitly wants to **continue editing** the received manuscript, a *separate* **Open verified review package** action reads the chosen JSON file locally, verifies the canonical Draft Lab grammar and SHA-256, then asks before replacing any current writing. Cancelling, corrupted files, newer edits or newer file selections never replace the editor. After opening, its title, language, category, source and body become editable, and it behaves like reopening a saved .md file; download a new file to preserve subsequent edits. This does not approve, sign, authenticate, publish or upload anything. **Checking a package alone remains read-only.** Reviewers using a checked-out public repository can alternatively execute:

```bash
npm run review:verify -- /path/to/24gotop-editorial-review-pack.json
```

The offline CLI checks the file type, 64 KiB limit, UTF-8 decoding, exact JSON fields, Draft Lab grammar and SHA-256. It prints a generic PASS/FAIL and the checksum, without exposing manuscript text.

**Integrity is not identity.** The checksum only confirms that the supplied document matches the checksum inside that same supplied file. It is not a digital signature, verified authorship, ownership proof, timestamp, moderation approval or publishing authorization. Someone able to replace both document and checksum can create a different self-consistent package.

## Safety and lifecycle

The pattern check is not secret detection certification: unknown formats, unexpected personal data and false negatives remain possible. A warning does not automatically upload or block a legitimate author who knowingly accepts both prompts. Always manually inspect the complete manuscript before sharing.

Review files are unencrypted. Do not include confidential or third-party restricted materials in files sent to others, and do not attach unpublished private articles to public GitHub issues. Publication proposals remain an independent manually reviewed process described in [EDITORIAL_CONTRIBUTIONS.md](EDITORIAL_CONTRIBUTIONS.md). No public hosted writing, account or reviewer privilege is enabled.

The source regression suite covers Unicode, source code, tampering, invalid metadata, malformed UTF-8, bounded files, browser consent and editor non-destruction. Real screen-reader, mobile and separate-browser manual verification remains necessary.

Rollback: revert the public source PR and redeploy GitHub Pages. Existing Markdown files and optional manually saved drafts remain compatible. No private database or production infrastructure migration is involved.

### Local reopening safety and recovery

The open action uses the same browser-only stale-operation gate as a normal
Draft Lab `.md` import. Validation must finish before any replacement prompt,
and the author's text is rechecked after the native confirmation. Choosing a
new review package, editing, clearing, importing a different `.md`, or even
selecting the read-only checker invalidates a delayed older open. A deliberate
successful open resets only the in-tab original-file comparison baseline,
not the saved-drafts browser vault; new edits are unsaved until the author
exports them. A valid checksum proves **internal file consistency only**, not
reviewer approval or the identity of the sender. Keep original files and
independently verify sender, consent and license rights.
