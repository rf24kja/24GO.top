# Protect the PUBLIC 24GOTOP `main` branch — owner-only GitHub setting

**Snapshot 2026-10-30.** The linked GitHub integration confirms that the
public `rf24kja/24GO.top` repository has **no repository rulesets**; the
founder-provided GitHub screenshot also explicitly warns that the default
`main` branch is not protected. The branch protection REST read is
**403 Resource not accessible by integration**; this means we cannot
independently distinguish a classic branch rule through this connection.
The integration cannot create/edit repository protection rules.

This document is an owner-action checklist, **not evidence a protection
rule was applied**. Public source CI passes are not a substitute for an
enforced GitHub merge gate.

## Recommended classic branch protection (available on GitHub Free/public)

1. Sign in as the repository owner. Visit
   [24GO.top → Settings → Branches](https://github.com/rf24kja/24GO.top/settings/branches).
2. Under **Branch protection rules**, select **Add classic branch protection rule**.
3. Set **Branch name pattern** to exactly `main`.
4. Enable **Require a pull request before merging**.
   For a single-maintainer project, **do not require 1 approval yet** unless
   an independent reviewer has agreed to review changes. An author cannot
   approve their own PR. Revisit this requirement when contributors join.
5. Enable **Require status checks to pass before merging** and select the
   actual Actions check **`test`** from workflow **Tests and checks**
   (`.github/workflows/ci.yml`). Only select an actually reported
   status after reviewing the latest green pull request.
6. Enable **Require conversation resolution before merging**.
7. Leave **Allow force pushes** and **Allow deletions** **unchecked**.
   Avoid **Lock branch** (prevents ordinary merges), unverified required
   approvals, forced signed-commit enforcement and required *production
   deployments* (Pages deploys only *after* merge).
8. Optionally enforce rules for administrators too (**Do not allow
   bypassing the above settings**) after verifying that the current
   maintainer/automation can still merge a small PR with passing CI.
   Do not enable rule bypass merely to merge a failing build.
9. Click **Create**, then return to `main` and ensure the
   unprotected-branch warning is absent.

Official upstream documentation:
[Managing a branch protection rule](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)
and [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Verify with a harmless PR (do not weaken settings to pass)

- Create a small topic branch; confirm that a change to `main` must go
  through a PR and **`test`** appears under required checks.
- A **red** `test` must block merging. A **green** `test` with no unresolved
  conversations must permit normal maintainer review/merge.
- Confirm force-push and deletion are disabled in GitHub settings.
  Do not actually rewrite or delete `main` to test.
- Do not require `Deploy pre-launch landing`/Pages or the independent
  post-Pages SEO audit **before** merge: these are post-merge delivery gates.
- Retain independent human review for security-sensitive/private Core PRs;
  a single-maintainer exception on this public documentation repo is not a
  general exemption from security reviews.
- Inspect
  [GitHub branch settings](https://github.com/rf24kja/24GO.top/settings/branches)
  or request an owner screenshot when the integration cannot read protection.

## Rollback

If the new rule prevents legitimate PRs, examine the required check name
and failed jobs first; adjust the named setting via owner GitHub UI only
after documenting why. Do not force-push, delete `main`, expose tokens,
or change private hosted Core policies as a workaround. No code or CI
config change is needed to activate a GitHub branch rule.
