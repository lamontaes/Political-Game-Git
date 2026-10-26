# Our Civic Duty — Claude Code bridge

@AGENTS.md

## Claude-only notes

- **Skills load on demand.** Skills live in `.agents/skills/` and are mirrored byte for byte in `.claude/skills/`; edit both, or `npm run test:skill-ops` fails. `civic-prose` is a development-time authoring process, never model calls in shipped play.
- **Owner reports and PR bodies** follow `civic-reports`. Run `npm run report:check -- <file>` before sending one.
- **Sub-agents** in `.claude/agents/` serve the prose and report skills. Give any other helper a bounded brief (see "Helpers" in `AGENTS.md`).
- **Context.** Work one pool item at a time and write findings into the PR body, the item's Notes or the job's report, not only into the conversation. Skip ritual duplicate checks and whole-project rediscovery: read the item, its files and the rule it names.
