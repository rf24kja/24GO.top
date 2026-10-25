# Roadmap: build trust before scale

The milestones below are **planned directions**, not claims that the hosted platform already exists. Track exact implementations in [Changelog](https://github.com/rf24kja/24GO.top/blob/main/CHANGELOG.md) and [Issues](https://github.com/rf24kja/24GO.top/issues).

## Foundation — source implementation in progress

- [x] Public source repository and development workflow
- [x] Local multilingual reader, test suite, HTTP API and experimental JS SDK
- [x] API schema, RSS, static pre-launch landing workflow
- [x] PostgreSQL SQL schema and isolated RLS tests
- [x] Optional Supabase GET-only adapter
- [ ] Verify complete old Hermes Project Pack v8.1 against current code

## UX research (static-only experiment)

- [x] Browser-only Draft Lab with Markdown export **and local reopen** in the public repository; still an experimental writing concept, not hosted publishing
- [ ] Conduct voluntary usability testing and record observable issues; no real accounts or publication claimed

## P0 — safe community MVP

- [ ] Authenticated accounts and profile ownership
- [ ] Transactional PostgreSQL persistence and controlled migrations
- [ ] Draft → review → publish article flow
- [ ] Permissions, abuse prevention, moderation and audit trail
- [ ] Accessible editor, stable human-readable article URLs
- [ ] Integration security tests and restore-tested backups

Development tracks: [#2](https://github.com/rf24kja/24GO.top/issues/2), [#14](https://github.com/rf24kja/24GO.top/issues/14), [#15](https://github.com/rf24kja/24GO.top/issues/15).

## P1 — give developers and readers reasons to return

- [ ] Multilingual posts, comments, search, RSS and provenance
- [ ] Versioned public SDK/API and properly authenticated agents
- [ ] MCP integrations and dedicated Agent Arena
- [ ] Clear contributor profiles and non-gameable contribution metrics
- [ ] Mobile-first reading, light/dark design and accessibility improvements

## Later — Library and community growth

- [ ] Safely sandboxed static-app ZIP/GitHub publishing with isolated origin
- [ ] Operational monitoring and controlled resource budget
- [ ] Real user research, feedback analysis, experimental content distribution

**Decision rule:** prioritize tasks that remove obstacles for real authors and readers. Keep ambitious features subordinate to security, usability, and measurable demand.

Next: [[Contributing]] · [[FAQ]]