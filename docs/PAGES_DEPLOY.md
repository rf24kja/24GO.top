# Publish the public pre-launch page on GitHub Pages

The public website must remain separate from the Node.js prototype. This workflow uploads **only** `site/`. It never runs the developer-only publishing API and does not need any AI API credentials.

## Once-only setup (repository owner)

1. Open [Settings → Pages](https://github.com/rf24kja/24gotop-starter/settings/pages).
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open [Actions → Deploy pre-launch landing](https://github.com/rf24kja/24gotop-starter/actions/workflows/pages.yml) and choose **Run workflow** if no automatic run appears.
4. After success, click the generated deployment URL. The usual project Pages URL is `https://rf24kja.github.io/24gotop-starter/`, but verify the real URL in the GitHub deployment before announcing it.
5. Confirm HTTPS, the GitHub links, mobile styling, and that no API or local development files are served.

If GitHub Pages is disabled by the account/repository settings, the workflow can fail: fix the repository configuration and rerun. **Do not claim a live website until a successful Pages deployment is verified.**

## What is public?

- `site/index.html`: a lightweight, static pre-launch landing.
- No `src/server.mjs`, `.env`, `packages/sdk/`, database dumps, credentials, or publishing endpoint.
- The site is independent of any API provider and does not claim user counts or partnerships.

## Rollback

Revert the offending commit in `main` or restore `site/index.html` to the last known-good revision, and manually rerun the deployment workflow. For an urgent takedown, disable Pages in repository settings.

## Custom domain

Do not switch to `24go.top` merely because the project plans to use the name. First prove domain ownership, configure DNS and verify HTTPS in GitHub Pages. Coordinate canonical URLs and eventual app hosting separately.
