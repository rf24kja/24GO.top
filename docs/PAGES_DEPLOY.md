# Publish the public pre-launch page on GitHub Pages

The public website must remain separate from the Node.js prototype. This workflow uploads **only** `site/`. It never runs the developer-only publishing API and does not need any AI API credentials.

## Once-only setup (repository owner)

1. Open [Settings → Pages](https://github.com/rf24kja/24GO.top/settings/pages).
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open [Actions → Deploy pre-launch landing](https://github.com/rf24kja/24GO.top/actions/workflows/pages.yml) and choose **Run workflow** if no automatic run appears.
4. After success, click the generated deployment URL. For the renamed repository, the usual fallback Pages URL is `https://rf24kja.github.io/24GO.top/`. The founder-approved **canonical** hostname is `https://24go.top/`. On 2026-10-29 the owner corrected GitHub Pages `Custom domain` and enabled `Enforce HTTPS`; [Pages config audit](https://github.com/rf24kja/24GO.top/actions/runs/40882729744) and [external content/301 audit](https://github.com/rf24kja/24GO.top/actions/runs/40886701790) passed. [Issue #59](https://github.com/rf24kja/24GO.top/issues/59) is closed with evidence. Do not treat a successful deployment as an indexing guarantee.
5. Confirm HTTPS, the GitHub links, mobile styling, and that no API or local development files are served.

If GitHub Pages is disabled by the account/repository settings, the workflow can fail: fix the repository configuration and rerun. **Do not claim a live website until a successful Pages deployment is verified.**

## What is public?

- `site/index.html`: a lightweight, static pre-launch landing.
- `site/progress.html`: a public evidence-linked development journey (source-code milestones only).
- No `src/server.mjs`, `.env`, `packages/sdk/`, database dumps, credentials, or publishing endpoint.
- The site is independent of any API provider and does not claim user counts or partnerships.

## Rollback

Revert the offending commit in `main` or restore `site/index.html` to the last known-good revision, and manually rerun the deployment workflow. For an urgent takedown, disable Pages in repository settings.

## Custom domain

**Verified current state, 2026-10-29:** `cname=24go.top`, `https_enforced=true`, certificate `approved` for both hosts. GitHub-hosted tests confirmed HTTPS apex, 301 redirects for www/HTTP, and preservation of article paths and query strings. Read [the completed recovery runbook](DOMAIN_RECOVERY_RUNBOOK.md). Avoid changing functioning DNS records. Google/Bing indexing has **not** been verified; inspect through Search Console/Webmaster Tools separately.
