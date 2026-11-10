# Public 24GOTOP release checks without GitHub Actions

**Status (2026-11-10): source-level migration slice only.** Scope: PUBLIC rf24kja/24GO.top and static https://24go.top. No private Core, account service, database production changes, DNS change or host migration are part of this work.

## Founder constraint

**Do not use GitHub Actions.** The default branch still contains six legacy workflow files, tests and runbooks that depend on them. The GitHub Actions repository-level setting has NOT been verified disabled. Until it is disabled, creating a PR or pushing to main could trigger unwanted workflows. Pushing a feature branch is not permission to run any workflow. This note does not claim Actions were disabled.

## Source validation (Node.js 22+)

Run locally from the checked-out public repository:

    npm run check
    npm test
    node --test tests/verify-public-static.test.mjs

Run this independent read-only HTTPS verifier **after** a real static deployment:

    node scripts/verify-public-static.mjs

The verifier requests the fixed canonical HTTPS origin with GET, no credentials or referrer, no redirect following, bounded bodies and bounded concurrency. It checks each canonical URL listed in the reviewed source sitemap together with fixed editor, editorial and discovery assets. It compares complete response bytes with corresponding files in the local site/ directory. It rejects malformed sitemap entries, external hosts, duplicate URLs, missing local files, stale public assets, redirects and network failures. No secrets, arbitrary remote URLs or deployment permissions are accepted.

A PASS proves those public static files matched the inspected local source at that moment. It is NOT a cryptographic attestation of the released Git commit and does not imply authenticated publishing, signed-in users, SQL persistence, search-engine indexing or continuous uptime. Run it from the exact reviewed release checkout; never treat an audit of a different or dirty checkout as release evidence.

## Remaining migration gates (not completed)

1. Verify GitHub Actions disabled in repository settings before opening PRs or merging while old event-triggered workflows exist.
2. Select a non-Actions deployment method and prove it using a separate preview origin; do not disrupt existing GitHub Pages or DNS prematurely.
3. Replace old GitHub Pages-specific release receipts and UI, including pages_run_id, with a vendor-neutral build identity and independently validated artifact/commit association.
4. Remove or retire all six legacy workflow YAML files and update old workflow-specific tests/runbooks together. Keep node syntax tests, isolated PostgreSQL tests where appropriate, static checks and independent HTTPS verification.
5. Re-check public HTTPS after the deploy and record the exact Git commit, independently observed assets and rollback procedure. If verification cannot run, mark deployment UNVERIFIED rather than claiming success.

## Security boundary

No production registration, user data writes, proprietary backend or 24GO.online access is needed to validate the public static site. Avoid GitHub tokens or published API write credentials in static artifacts.