# 24GOTOP — IP, Code Licensing, and Owner-Control Strategy

> **Planning note, not individual legal advice.** Founder-facing review required before changing any license. Verify applicable jurisdictions and contributor agreements with a qualified IP lawyer.

## Confirmed present situation

- The repository `rf24kja/24GO.top` is public and currently includes an MIT [LICENSE](../LICENSE).
- The notice currently names **"24GOTOP contributors"**, not a verified legal identity for a sole copyright assignee.
- MIT has granted broad permission to copy, modify, redistribute, commercialize and self-host covered versions when license terms are followed.
- GitHub public repository terms permit viewing and forking. Changing the license later does **not automatically undo rights granted for earlier releases**, nor remove old public copies, forks, local clones or historical commits.
- Ownership of an official service, its domain, production data, trademarks/branding and company operations is a distinct issue from whether licensed source code can be run independently.
- Contributors normally own their original contribution copyright unless a valid separate agreement transfers it. A CLA usually licenses rights to a maintainer; it does **not necessarily transfer copyright**.

## Founder requirements (confirmed direction)

1. Be publicly identified as the **founder and product lead**.
2. Keep final authority over official project roadmap, brand, website, deployments, infrastructure and acceptance of contributions.
3. Welcome broad community participation through Discussions, Issues and selected code PRs.
4. Avoid involuntarily placing the **entire future commercial platform** under a permissive license.

Do not promise that nobody can fork or self-host already MIT-licensed code; that would be inaccurate.

## Possible future licensing / architecture models

### Model A: Open developer ecosystem + private product core (recommended for evaluation)

- Continue public Issues, Discussions, Wiki, API contracts and genuinely open SDK/MCP/examples under a recognized OSS license.
- Develop proprietary production infrastructure, admin workflows, private services, product-specific moderation workflows and sensitive configuration in a **separate private repository with independently managed secrets and clean provenance**.
- Define API boundaries with tests, CI and license manifests. Do not copy third-party GPL/AGPL or contributor-owned material into private software without meeting all conditions.
- The existing MIT-licensed code remains available under its original terms; future proprietary improvements must be legally separable.

**Pros:** open ecosystem and compatibility with many OSS programs; owner controls official service, brand, operations.  
**Cons:** other people can still deploy MIT SDK/examples or older code; private core is not directly open for unrestricted public PRs.

### Model B: Source available, restricted commercial hosting

- Publish selected future code under a carefully reviewed **non-OSI** source-available license that restricts commercial hosted alternatives.
- Do not market those restricted modules as OSI open source or assume they qualify for OSS grants.
- Existing MIT versions remain licensed as previously granted.

**Pros:** open code visibility with possible restrictions for future releases.  
**Cons:** difficult license enforcement, contributor friction, OSS eligibility trade-offs, forks still allowed on GitHub, and legal review required.

### Model C: Keep complete code under MIT/Apache/AGPL and distinguish the brand

- Founder controls official repository and hosted service; contributor PRs follow maintainer approval.
- Separate trademark/brand identity and operational data; other teams may still make independent software distributions or self-host, subject to license conditions. AGPL can impose source-sharing duties on network versions but **does not prohibit competing hosting**.
- More direct OSS community participation but less licensing control over public implementation.

## Concrete next actions (non-destructive)

1. Record founder role and current licensing honestly in [GOVERNANCE.md](../GOVERNANCE.md), [BRAND_POLICY.md](../BRAND_POLICY.md) and README.
2. Verify ownership/registration/use history of 24GOTOP and investigate trademark conflicts before investing in registration. Domain registration **is not trademark registration**.
3. Get a legal IP review before replacing MIT, negotiating CLA/copyright assignment, or moving contributors' code.
4. Draft a private-core architecture boundary; identify which published modules already have MIT grants and must remain compliant.
5. For new community contributions, decide whether an optional CLA with broad relicensing rights is justified. GitHub's repository license model already addresses most normal inbound contributions; a CLA is not proof of exclusive ownership.
6. Maintain a change log, contributor credit and evidence of original authorship. Do not represent the entire repository as solely owned by one person when copyright ownership has not been verified.

## Decision pending

The founder has **not yet approved** changing the root MIT license or moving current published code to a different licensing regime. Until then the existing LICENSE remains in place, contributors must not be misled, and future product-level proprietary code should not be publicly released by default.

## References

- [GitHub licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [GitHub Terms of Service — public code and contributions](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- [OSI Open Source Definition](https://opensource.org/osd)
- [WIPO trademark protection overview](https://www.wipo.int/en/web/trademarks/protection)
