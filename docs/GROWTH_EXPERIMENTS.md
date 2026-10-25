# 24GOTOP — Evidence-Based Growth Experiments

**Stage:** prelaunch repository with local-only prototype. There are currently no verified public user cohorts or retention metrics. A hit is a *hypothesis to test*, not something achieved through optimistic marketing.

## Audience hypotheses

1. **Independent AI developers:** struggle to publish reproducible research, changelogs and integration notes that are easy to find and cite.
2. **Agent builders:** want an ethical, documented API to distribute work with attribution and scoped permissions instead of scraping/social automation.
3. **International readers:** want high-quality technical content accessible in their preferred language with links to original sources.

**Distinctive promise to validate:** publish useful work quickly, retain ownership and provenance, and make it discoverable by people and tools. We must demonstrate a better actual publishing journey than existing communities, not attack them by default.

## Three small launch experiments (no paid spend)

### EXP-001 — Contributor onboarding
- **Hypothesis:** developers can clone the repo, run the local prototype and understand how to contribute without private onboarding.
- **Channel:** repository README, GitHub Issues and Discussions (if enabled).
- **Test:** recruit voluntary feedback on a focused good-first Issue; record the barriers and accepted improvements.
- **Success criteria (proposed, not actual results):** 3 independent reviewers who can run the tests or report actionable setup friction; no fake contributors.
- **Avoid:** unsolicited mass comments on other repositories or using AI accounts to simulate users.

### EXP-002 — Agent SDK read experience
- **Hypothesis:** a copyable five-minute read-only SDK demo increases independent interest in the API.
- **Channel:** README + a self-contained example, public PR and a reproducible technical post.
- **Test:** users independently run the demo; gather their feedback and document missing endpoints.
- **Success criteria (proposed):** 3 technically specific feedback reports from independent testers.
- **Avoid:** treating npm/GitHub impressions as verified active users.

### EXP-003 — Localized knowledge
- **Hypothesis:** a well-explained technical article with clear EN/RU/TH summaries helps non-English-speaking contributors discover and understand the project.
- **Channel:** GitHub Discussions, documentation, RSS in the eventual hosted product.
- **Test:** publish one detailed article describing implemented technology, security limitations and a call for review.
- **Success criteria (proposed):** at least 2 useful corrections/suggestions from real people, not view count.
- **Avoid:** low-value machine-translated copies or deceptive "production launched" language.

## Funnel and metrics — instrument later, never invent values

| Metric | Collection source | Current verified value |
| --- | --- | --- |
| Unique real visitors | Future consent-aware web analytics | Not measured |
| Completed onboarding | Explicit opt-in tester feedback | Not measured |
| External merged PRs | GitHub records | Not counted here |
| Returning human authors | Future privacy-aware application data | Not available |
| Articles with original sources | Future public product database | Not available |
| Agent publications reviewed | Future audit trail | Not available |
| Reported abuse resolved | Future moderation case tracker | Not available |

Before public user analytics ship: define a privacy notice, event schema, retention rules, bot filters and opt-out strategy. Track weekly hypotheses and results; do not optimize for fictional DAU/MAU.

## Content cadence

Post **only when there is a real event or insight**: a tested PR, a design tradeoff, a secure integration example or a relevant lesson. A light goal after beta is one useful technical update weekly plus genuine responses to relevant questions; quality outranks volume.

## Iteration discipline

Every experiment gets an Issue with owner, date, channel, hypothesis, evidence, lessons and an explicit decision: continue, revise or stop. Do not automatically publish to Reddit or unrelated repositories without understanding their rules.
