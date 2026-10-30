# Open-source impact evidence — maintainers' checklist

This document explains how to collect authentic evidence before applying to maintainer programs. **No unverified statistics are reported here.**

## Track verifiable records

| Metric | Preferred proof | Guardrail |
| --- | --- | --- |
| Maintainer identity and role | GitHub account, repo permissions and relevant commit/PR history | Do not falsely credit another maintainer's work |
| External contributors | GitHub merged PRs from distinct contributor accounts over a defined window | Exclude self, sybils, trivial and duplicative PRs |
| Upstream contributions | PRs actually authored and merged into repositories the applicant does not own | Include direct URLs, code review and meaningful changes |
| Software dependents | GitHub dependency graph or package registry reverse dependencies | Do not count stars, clones or pageviews as dependents |
| Package downloads | Registry download dashboard with period/version | Do not interpret npm installs as verified active humans |
| OpenSSF criticality | Official OpenSSF Scorecard/Criticality data with target repository and date | Do not invent missing score |
| Website/domain | Actual HTTPS landing tested from outside | Passing GitHub CI does not prove DNS/HTTPS deployment |

## Example evidence entry template

- Date and source URL:
- Metric type and exact time window:
- Applicant role:
- Observed verified value (or `unknown`):
- What this does **not** measure:
- Reviewer / verification method:
- Decision: application-ready, more evidence required, or ineligible:

Use [Developer Benefits Tracker](DEVELOPER_BENEFITS_TRACKER.md) to log program rules and application status. Large-scale adoption is a consequence of a useful product, not a metric we should simulate.

## Verified public baseline — 2026-10-28 (UTC)

**Source:** [GitHub repository metadata API](https://api.github.com/repos/rf24kja/24GO.top) for the public MIT repository [rf24kja/24GO.top](https://github.com/rf24kja/24GO.top). Snapshot taken 2026-10-28; these values can change.

| Metric | Observed | What it proves / does not prove |
| --- | ---: | --- |
| GitHub stars | 1 | A repository signal, **not** one verified dependent, customer, or external contributor |
| Forks | 0 | No public forks recorded in this API snapshot; does not prove absence of local clones |
| Repository subscribers | 0 | Not an adoption or user count |
| Open issues (GitHub's combined issue/PR counter) | 14 | Maintenance backlog, not external impact or shipped product |
| Dependency graph / registry downloads | **Not verified** | Cannot claim 500 dependents, 200,000 monthly downloads or other Claude OSS thresholds |
| Unique external contributors with merged PRs | **Not verified** | No claim of 20 outside contributors; self-authored PRs do not qualify |
| Merged upstream PRs by applicant in unrelated repositories | **Not verified** | No claim of 100 qualifying outside-repo PRs |
| OpenSSF criticality score | **Not verified** | No claim of score ≥ 0.4 |

**Decision:** the evidence collected here is **not application-ready** for a demonstrated-threshold Claude OSS claim or a guaranteed Copilot OSS grant. A project with active CI and technical articles is still not a proven widely adopted dependency. Do not submit applications, buy engagement, invent usage, or count self-generated issues/PRs as third-party impact. Personal eligibility, country restrictions, and account benefits were not accessed or verified.

## Verified public snapshot — 2026-10-30 (UTC)

**Read-only source:** [GitHub repository metadata API](https://api.github.com/repos/rf24kja/24GO.top), queried 2026-10-30 against the public MIT repository.

| Field | Observed | Interpretation |
| --- | ---: | --- |
| Stars | 1 | Repository interest signal, **not** an authenticated customer or downstream dependent |
| Forks | 0 | Public GitHub forks at observation time, not a clone/download count |
| Subscribers | 0 | Repository watch subscriptions, **not** RSS readers |
| Open issues counter | 13 | GitHub metadata counter includes issues/PRs, **not** unique external contributors |
| License | MIT | Public repository license only; **not** the separate proprietary hosted core |
| Real dependents, downloads, independent merged contributors | Not verified | No invented threshold eligibility or benefit application |

This source snapshot is not a Google/Bing indexing report, unique website visitor count, AI citation report, RSS subscriber count or proof of eligibility for Claude OSS/Copilot maintainer benefits. No applications, paid services, engagement purchases or fabricated contributions.
