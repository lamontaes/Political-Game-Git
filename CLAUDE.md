# Our Civic Duty — Claude Code bridge

@AGENTS.md

## Claude-only notes

- **Project threads and cloud sessions do NOT load skills.** Anthropic's docs (Nov 17, 2026) say they load this CLAUDE.md but not `.claude/skills`, hooks or settings. Before building, open these as files and read them: `.claude/skills/done-proof/SKILL.md`, `.claude/skills/verify/SKILL.md`, and the SKILL.md for your job, including its Gotchas section. Find the job's skill by its folder name in `.claude/skills/`.
- **Skills load on demand** (local sessions). Skills live in `.agents/skills/` and are mirrored byte for byte in `.claude/skills/`; edit both, or `npm run test:skill-ops` fails. `civic-prose` is a development-time authoring process, never model calls in shipped play.
- **Owner reports and PR bodies** follow `civic-reports`. Run `npm run report:check -- <file>` before sending one.
- **Sub-agents** in `.claude/agents/` serve the prose and report skills. Give any other helper a bounded brief (see "Helpers" in `AGENTS.md`).
- **Context.** Work one pool item at a time and write findings into the PR body, the item's Notes or the job's report, not only into the conversation. Skip ritual duplicate checks and whole-project rediscovery: read the item, its files and the rule it names.
