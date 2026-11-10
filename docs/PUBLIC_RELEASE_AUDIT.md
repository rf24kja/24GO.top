# Public 24GOTOP independent static release audit

**2026-11-10 scope:** PUBLIC `rf24kja/24GO.top` and canonical `https://24go.top` only. No access to private `24GO.online`.

## GitHub Actions permission boundary

GitHub Actions **are permitted in this public repository**, including the existing public Node CI and GitHub Pages deployment. They **must not be used in the private 24GO.online repository**. This verifier runs both locally and as a post-deploy extra check in the PUBLIC Pages workflow. It does not require credentials.

## Local source checks (Node.js 22+)

From a clean checkout of a reviewed PUBLIC commit:

```sh
npm run check
npm test
```

After the PUBLIC Pages deployment of that exact checkout has completed:

```sh
npm run release:audit
```

The public Pages workflow additionally runs `node scripts/verify-pages-delivery.mjs` for an exact commit + workflow-run receipt and critical source bytes, then `npm run release:audit` for all canonical sitemap URLs and fixed Draft Lab/editorial/reader assets. The new verifier is read-only and limited to `https://24go.top`; it sends no credentials, does not follow redirects, limits response size/concurrency and checks every response byte against `site/` in the checked-out public source tree.

**Meaning of PASS:** the audited HTTPS files matched the local reviewed source at test time. It is not a cryptographic receipt, a hosting provider uptime guarantee, search indexing, or a proof of hosted account publishing. The existing public Pages release receipt provides separate commit/run provenance. If either verifier fails, investigate deployment state and CDN caches before claiming the latest release was delivered.

## Operational controls

- The audited origin is fixed; there are no command-line URL arguments or secrets.
- Adding a source file does not automatically imply a new public route. The reviewed sitemap and fixed route allowlist are authoritative.
- For a new article, update the article, archive, RSS/JSON feed, search index, related links and sitemap before merging. Run `npm run check && npm test` and review diff and rights.
- The audit script has focused tests for off-origin URL rejection, duplicated sitemap routes, missing/changed responses, bounded streaming and no-credential fetches.
- On a failed release, keep the previous known-good public release, revert the problematic public commit or repair the public Pages deployment, and re-verify canonical HTTPS.
- No private deployment, database migrations, private workflow runs or DNS edits belong to this procedure.
