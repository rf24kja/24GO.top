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
