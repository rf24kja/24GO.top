# Publish the public pre-launch page on GitHub Pages

The public website must remain separate from the Node.js prototype. This workflow uploads **only** `site/`. It never runs the developer-only publishing API and does not need any AI API credentials.

## Once-only setup (repository owner)

1. Open [Settings → Pages](https://github.com/rf24kja/24GO.top/settings/pages).
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open [Actions → Deploy pre-launch landing](https://github.com/rf24kja/24GO.top/actions/workflows/pages.yml) and choose **Run workflow** if no automatic run appears.
4. After success, click the generated deployment URL. For the renamed repository, the usual fallback Pages URL is `https://rf24kja.github.io/24GO.top/`. The owner configured the custom domain `24go.top`; verify the **actual** deployment URL and DNS/HTTPS status before announcing it.
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

The owner has entered `24go.top` as the GitHub Pages custom domain. DNS previously showed a GitHub `InvalidDNSError`; it is not evidence that resolution or HTTPS has succeeded now. Check A/CNAME/AAAA records with the authoritative DNS provider, re-run the GitHub Pages DNS check, verify certificate issuance and HTTPS, then test both apex and www redirects. GitHub repository renaming does not automatically redirect the old project Pages URL. If the site is unreachable, do not publish a public launch announcement. Do not change DNS or certificates through automation without owner approval.
