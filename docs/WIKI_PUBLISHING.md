# GitHub Wiki publishing — maintainer runbook

**Source-of-truth drafts:** [docs/wiki/](wiki/). These files are committed to the normal repository for review and PR history, but **GitHub Wiki has its own Git repository**. Merging a PR that changes `docs/wiki/` does not automatically publish GitHub Wiki pages.

The linked GitHub integration has no dedicated Wiki writing method. Wiki publication requires the maintainer to use GitHub's Wiki editor or a one-time local Git push to `24GO.top.wiki.git`.

## First-time publication: Windows / PowerShell

1. Open [the actual Wiki](https://github.com/rf24kja/24GO.top/wiki). If empty, choose **Create the first page**, name it `Home`, paste the reviewed contents of [Home.md](wiki/Home.md), and click Save Page. This initializes the Wiki Git repository.
2. Make sure `docs/wiki/` changes have been merged into `main` and your local clone is updated (GitHub pull or fresh clone).
3. From a directory where you cloned the project, execute:

```powershell
git clone https://github.com/rf24kja/24GO.top.wiki.git
Copy-Item -Path .\24GO.top\docs\wiki\*.md -Destination .\24GO.top.wiki\
Set-Location .\24GO.top.wiki
git status
git diff --check
git diff
git add -- *.md
git commit -m "docs(wiki): publish initial 24GOTOP documentation"
git push
```

**Important:** Inspect `git diff` before committing; copying files over a pre-existing Wiki page can replace human edits. Only do this if the reviewed docs are the intended updated versions. `git push` relies on your own GitHub credentials; never paste a personal access token in ChatGPT or commit one to this repository.

4. Verify the [Wiki Home](https://github.com/rf24kja/24GO.top/wiki/Home), pages linked from it, and the sidebar. The correct page names are `Home`, `Getting-Started`, `Architecture`, `API-and-SDK`, `Roadmap`, `Contributing`, `FAQ`, and `_Sidebar`.
5. Keep `docs/wiki/` synchronized whenever a real feature/decision changes. Make a PR for content changes first; publish that approved revision to Wiki second.

## Safer browser-only alternative

Create or edit each page in the GitHub Wiki UI, copying the text from the matching file under `docs/wiki/`. There are eight initial files including `_Sidebar`.

## Operational guidance

- Do not enable public Wiki editing for everyone before spam moderation is planned.
- Never claim that features described under future roadmap milestones have shipped.
- Make technical corrections through Issues or PRs; Discussions is for broad conversation.
- GitHub Wiki pages may have limited search indexing for small repositories. Keep key explanations and developer instructions in the main repo and in the public Pages site too.
- Roll back a mistaken Wiki edit using the Wiki page history/Git commit, not by changing the production site.
