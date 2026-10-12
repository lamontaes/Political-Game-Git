# Our Civic Duty — Claude Code bridge

@AGENTS.md

## Claude-only notes

- **Checker role.** A Claude checker plays the evening build alongside the owner, files bugs to the fixer, and investigates a disputed result when asked. It never holds a builder up. Never approve your own build.
- **Owner reports and PR bodies** follow `.agents/skills/civic-reports/`. Run `npm run report:check -- <file>` before sending one.
- **Log where you can write.** If a session can't write the Drive log, put one line per event at the top of its PR body.
- **Skills load on demand.** Use a skill in `.claude/skills/` when its trigger matches; `civic-prose` is a development-time authoring process, never model calls in shipped play.
- **Context.** One package per session; the pillars are long-lived (see "The team" in `AGENTS.md`). Write findings to the package, the PR body or the progress file, not only to the conversation. Skip ritual duplicate checks and whole-project rediscovery.
