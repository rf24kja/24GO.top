# 24GOTOP — Developer benefits & startup credits tracker

**Last verified: 2026-10-30. Owner:** project maintainer. **This is a factual application planning log, not evidence of acceptance.**

Our goal is to lower genuine development costs while we build a useful, independent AI knowledge platform. Credits, subscriptions, compute, and discounts are **different benefit types**, cannot be combined into one cash figure, and may involve eligibility, expiry, overages, and taxes.

## Program watchlist

| Program | Potential benefit | Stage / eligibility caveat | Current factual status | Next action | Official source |
| --- | --- | --- | --- | --- | --- |
| Claude for Open Source | 6 months of Claude Max 20x **personal subscription**, not API tokens | Existing real OSS impact; GitHub account ≥ 2 years; publicly active within 90 days; eligible jurisdiction and legal screening; open license | **Not applied; thresholds not demonstrated** | Track genuine external adoption and personally authored, meaningful upstream contributions | [Application](https://claude.com/contact-sales/claude-for-oss), [terms](https://www.anthropic.com/claude-for-oss-terms) |
| GitHub Copilot Free | Limited no-cost editor assistance | Account must qualify for the free individual tier | **Availability not verified for owner account** | Check existing GitHub Copilot settings and billing | [GitHub Docs](https://docs.github.com/en/copilot/how-tos/manage-your-account/get-started-with-a-copilot-plan) |
| GitHub Copilot Pro for OSS maintainers | Free Pro if qualifying as a maintainer of a popular open-source project | GitHub reviews popularity and eligibility; not automatic for a newly created repository | **Not established** | Use only after verifiable outside adoption; check Copilot settings | [GitHub Docs](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/enable-copilot/set-up-for-teachers-and-os-maintainers) |
| AWS Activate Founders | Starts at **US$1,000** AWS promotional credits; selected recipients may later receive up to US$5,000 total | Self-funded startups; fully functioning startup website; Amazon screening; linked AWS account may have payable charges | **Not applied, account/person eligibility unverified** | Verify website and owner eligibility, then check AWS account payment and spending safeguards before applying | [AWS Activate](https://aws.amazon.com/startups/credits) |
| AWS Pioneer Credits | Promotional AWS credits for eligible businesses evaluating their first AI/cloud workload; **no fixed award assumed** | Intended for businesses new to AWS or without a meaningful workload; AWS Account ID and approval required; individual/no-company eligibility unverified | **Research only; not applied** | Verify legal/business eligibility, credit exclusions, AWS account billing and any overlap with Activate before considering an application | [AWS Pioneer](https://aws.amazon.com/pioneer-credits/), [credit terms](https://aws.amazon.com/awscredits/) |
| Claude for Startups | Member offers and credits; additional API credits may be available via qualifying VC partners | **Official site says the current cohort is full and new applications are closed as of 2026-10-29**; eligibility and future intake unknown | **Not applied; applications currently closed** | Watch official page for next cohort; do not infer approval or available API credits | [Claude for Startups](https://claude.com/programs/startups) |

**Do not place private identity documents, nationality, residency proofs, billing details, API tokens, or application account email in this public repository.** Review these requirements privately with the applicant and provider.

## Claude OSS — precise evidence thresholds

The [official Terms](https://www.anthropic.com/claude-for-oss-terms) say meeting one of these alternatives can support the maintainer track:

- Aggregate 500 dependent repositories **or** 100 dependent packages.
- Aggregate 200,000 monthly package downloads.
- Listed maintainer/committer of a recognized foundation or language project.
- 100 merged PRs **authored by the applicant** in public repositories **they do not own** in the prior 12 months.
- At least 20 distinct **outside contributors** with merged PRs in a maintained repository during the prior 12 months.
- OpenSSF criticality score at or above 0.4.

Or applicants may be considered under the **discretionary Ecosystem Impact Track**, with demonstrable meaningful dependence by the OSS ecosystem.

**Additional requirements include:** applying as a natural person, eligible legal residence/sanctions compliance, GitHub account at least two years old, public OSS activity within 90 days, and at least one OSI-licensed project. Approval remains discretionary and program availability can change. Artificial, automated, trivial or duplicated activity may be disregarded or treated as abuse.

### 24GOTOP readiness (evidence, not speculation)

| Evidence item | Verified result / limitation | Next step |
| --- | --- | --- |
| Public source repository | [rf24kja/24GO.top](https://github.com/rf24kja/24GO.top), MIT-licensed existing components | Keep genuine, reusable public SDK/API/MCP components |
| Technical contributions | Reviewed GitHub PRs, tests, CHANGELOG and published docs in repo | Continue high-quality, scoped PRs and independent review |
| Recent public OSS activity | The repository has recent commits and merged PRs; individual applicant attribution must be checked separately | Verify contributor account identity and ownership before applications |
| GitHub account age | **Not verified** in this document | Check account creation date privately before applying |
| External dependents/downloads | **Not measured / not claimed** | Publish useful, versioned packages only when ready; use registry/dependency evidence |
| 20 distinct outside contributors | **Not demonstrated** | Invite authentic external reviews/PRs; count only merged outside contributors |
| 100 merged outside-repo PRs by applicant | **Not verified** | Contribute genuine improvements to projects not owned by the applicant; keep exact PR links |
| OpenSSF criticality | **Not measured** | Check only when a publicly depended-upon repo exists |
| Infrastructure credits | **No benefit or grant confirmed** | Apply only after verifying eligibility and budget controls |

## Application ledger (only fill with verified facts)

| Date | Program | Applicant's status | Evidence link | Submission/decision reference | Renewal/expiry/billing caution |
| --- | --- | --- | --- | --- | --- |
| 2026-10-26 | Claude for OSS | Research only — **not submitted** | Official terms above | None | If approved: six-month period and potential charges for overages; review renewal terms |
| 2026-10-26 | AWS Activate Founders | Research only — **not submitted** | Official program above | None | Promotional credits do not necessarily cover every AWS charge; configure spending alerts |

## Concrete product-first action plan

1. Publish a reproducible OSS developer tool with real value and independent setup steps; maintain source, semantic versions, examples and tests.
2. Write authentic engineering articles after real implementations; invite **specific** design reviews, not bulk stars or bot accounts.
3. Record only publicly verifiable usage, dependents, merged external PRs and accepted upstream contributions. Differentiate views from users and downloads from dependents.
4. Before each application, verify updated official terms, personal eligibility, credit restrictions, geography, tax obligations, expiry, and any hidden auto-billing.
5. Apply truthfully when there is credible evidence. Do not buy engagement or mass-generate low-value PRs for thresholds.

## Privacy and rights boundary

The current public MIT SDK/examples support developer outreach and applicable OSS programs. Future founder-owned hosted services may have a private core; do not claim that proprietary components are open source, retroactively restrict prior MIT grants, or disclose operational secrets.

**Review frequency:** monthly, or whenever a verified program term changes. No guaranteed benefit and no submissions made by this file.

## Official terms rechecked — 2026-10-28 (UTC)

- **[Claude for Open Source](https://claude.com/contact-sales/claude-for-oss):** official application still describes **six months of Claude Max 20x** (a personal subscription, **not** API/GPU credits). Its published qualifying examples include 500 dependent repositories, 100 dependent packages, 200,000 monthly downloads, 100 merged outside-repository PRs by the applicant, 20 unique outside merged-PR contributors, or OpenSSF criticality ≥ 0.4. The application allows discretionary review; no approval or eligibility is assumed.
- **[GitHub Copilot OSS maintainer access](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/enable-copilot/set-up-for-teachers-and-os-maintainers):** GitHub describes free Pro for eligible maintainers of **popular** OSS projects and reevaluates eligibility monthly. This repository's activity alone does not establish eligibility. The owner's account settings have **not** been checked.
- **[AWS Activate credits](https://aws.amazon.com/startups/credits):** the self-funded Founders route starts at **US$1,000** promotional credits; selected participants may reach **US$5,000**. Official eligibility includes a startup website, age/funding conditions and an AWS account on a paid tier; personal/legal eligibility, credit exclusions and possible paid usage must be reviewed before any application. No account or billable resource was created.
- **Impact baseline:** [dated repository API evidence](OSS_IMPACT_EVIDENCE.md) records **1 star and 0 forks**, not qualified downloads, external contributors or proven OSS dependents. No grants, discounts, free subscriptions, GPU capacity or applications were received/submitted by this check.

This is a source review and public evidence log only; no claim of personalized program approval, and no application submission.

## Official availability recheck — 2026-10-29 (UTC)

- **Claude for Open Source:** [official application](https://claude.com/contact-sales/claude-for-oss) and [terms](https://www.anthropic.com/claude-for-oss-terms) still describe six months of personal Claude Max 20x for selected applicants, not API tokens or GPU. No verified new downstream usage or applicant eligibility; no application.
- **Claude for Startups:** [official program FAQ](https://claude.com/programs/startups) explicitly says the current cohort is **full** and is **not accepting applications**. Its member credits apply to the first-party Claude API, not AWS/Google/Azure; partner VC credits are conditional. This supersedes the older generic 'venture-backed only' watchlist wording without asserting that a self-funded individual can apply.
- **GitHub Copilot OSS:** [official maintainer guidance](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/enable-copilot/set-up-for-teachers-and-os-maintainers) still requires popular OSS maintainer eligibility, reevaluated monthly. GitHub settings and owner eligibility were not inspected.
- **AWS:** [official Activate Founders guide](https://aws.amazon.com/aws-startups/learn/applying-for-aws-activate-credits-a-step-by-step-guide/) retains the self-funded US$1,000 starting route. A distinct [Pioneer program](https://aws.amazon.com/pioneer-credits/) describes promotional credits for eligible businesses new to AWS, including AI workloads; no guaranteed amount or suitability for an unincorporated individual is established. [Promotional credit terms](https://aws.amazon.com/awscredits/) may leave chargeable usage; no AWS account or paid resource created.
- **OSS impact:** the public GitHub repository API on 2026-10-29 reports **1 star, 0 forks, MIT**. These are not verified dependent packages, monthly downloads, independent contributors, or benefit awards. No applications submitted.

## Official program recheck — 2026-10-30 (UTC)

- **[Claude for OSS](https://claude.com/contact-sales/claude-for-oss):** official application remains visible and advertises **six months of personal Claude Max 20x**, not API credits or GPU. The [binding terms](https://www.anthropic.com/claude-for-oss-terms) reserve discretionary review, reject artificial/trivial activity and require legal residence/sanctions eligibility; the current repo does not demonstrate the numerical impact thresholds. No application submitted.
- **[GitHub Copilot for OSS](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/enable-copilot/set-up-for-teachers-and-os-maintainers):** free Pro remains conditional on maintaining a **popular** open-source project, with **monthly** reevaluation. Separately, [GitHub's Copilot cloud documentation](https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-on-github) says its **new** cloud experience from 28 October 2026 requires a paid plan; Copilot Free retains the older chat experience. Neither page proves this owner's personal entitlement.
- **[AWS Activate](https://aws.amazon.com/aws-startups/learn/applying-for-aws-activate-credits-a-step-by-step-guide/):** official June 2026 guide describes Founders US$1,000 for eligible self-funded startups (some up to US$5,000 over time) and Portfolio up to US$200,000 with a qualifying provider. [Pioneer](https://aws.amazon.com/pioneer-credits/) remains a separate, approval-based business program without a published guaranteed award. No application, account change or paid resource.
- **Impact:** source PRs and engineering guides demonstrate work, not external dependency adoption or verified search traffic. No new grant, credit, GPU, subscriber or maintainer entitlement is claimed.
