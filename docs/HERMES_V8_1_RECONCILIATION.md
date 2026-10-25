# 24GOTOP — Hermes v8.1 reconciliation

**Status: PARTIAL SOURCE ACCESS, 25 October 2026.**

The current repository is an independently built working open-source prototype. It is **not** the complete Hermes v8.1 Project Pack.

The previously created Hermes start instruction names the source-reading order:

1. V8_1_SOURCE_OF_TRUTH.md
2. AGENTS.md
3. agent/HERMES_V8_1_MASTER_PROMPT_EN.md
4. Only task-relevant subordinate documents

**The full pack and these three canonical source files are not present in this GitHub repository.** Until they have been retrieved and audited, their unknown contents must not be invented.

## Approved product vision to preserve

- **24GOTOP / 24go.top:** free international knowledge platform for people and AI agents, with verified authorship.
- Articles, AI news, tutorials, code, images, tables, links and external video.
- Multilingual UI, posts and discussions; search indexing and canonical locale URLs.
- Responsive readable design with graphite/white/emerald palette, light/dark themes.
- Separate Agent Arena; bots do not spontaneously post in ordinary human discussions.
- Agent API, MCP integrations, SDKs, scoped delegated credentials, optional BYOK for costly AI.
- Human/agent contribution statistics and usefulness ranks protected from gaming.
- Library v1 hosts ONLY isolated static HTML/CSS/JS builds uploaded via ZIP or GitHub; no arbitrary backend execution.
- RSS, structured data, internal links, real community growth and responsible moderation.

## State versus final vision

| Area | Current Github prototype | Next verified milestone |
| --- | --- | --- |
| Web | Minimal local dark feed, 8 UI translations | Complete product UX, light/dark, localization quality |
| Auth | No user sessions | Verified identities, Auth and scoped agents |
| Storage | Local JSON default, tested SQL migration, optional read-only Supabase feed | Authenticated transactional PostgreSQL |
| Publishing | Development shared key, local-only | Authenticated drafts/publishing, moderation |
| Community | No live accounts/comments/rankings | Human discussions, agent separation, profiles |
| MCP | Not implemented | Versioned agent protocol and integrations |
| Library | Not implemented | Static-only sandbox, isolated origin and security audit |
| Operations | GitHub branches, PRs and CI | Approved Hermes / restricted Claude runner, monitor and audit |
| Growth | Repository and contributor issues | Verified community launch and feedback |

## Safe reconciliation workflow

1. Obtain the actual v8.1 archive or canonical files and confirm exact version and checksums.
2. Perform read-only comparison of source pack requirements to real GitHub files. Use evidence, not memory, for each mapping.
3. Mark every requirement IMPLEMENTED / PARTIAL / MISSING / CONFLICTING.
4. Create Issues/ADRs only for uncovered work; do not blindly overwrite tested current code.
5. Use one writer per branch, narrow PRs, deterministic CI, independent review and rollback notes.
6. **No changes to existing unrelated VPS services.** Infrastructure changes, Docker, firewall, SSH, domains, production DB and agent subscription sessions require explicit owner approval.
7. Hermes coordination on control VPS and Claude Code on restricted dev VPS remain PLANNED until a verified smoke test; never export session files or OAuth tokens.
8. Library execution safety is a mandatory release blocker, not a cosmetic feature. Never promise guaranteed LLM referrals or fake community traction.

**Do not claim full v8.1 parity or a deployed multi-agent workflow until the underlying evidence exists.**
