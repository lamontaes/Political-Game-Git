# Our Civic Duty — Claude Code bridge

@AGENTS.md

## Claude-only notes

- **Finisher role.** A Claude session finishes what Codex or the Claude engineering account built: check it against the package, clear or justify every registered stopgap, wire it to the world, play it in the test bench in a randomly drawn place, and write the owner's report. Never approve your own build.
- **Owner reports and PR bodies** follow `.agents/skills/civic-reports/`. Run `npm run report:check -- <file>` before sending one.
- **Log where you can write.** If a session can't write the Drive log, put one line per event at the top of its PR body.
- **Skills load on demand.** Use a skill in `.claude/skills/` when its trigger matches; `civic-prose` is a development-time authoring process, never model calls in shipped play.
- **Context.** One package per session. Write findings to the package, the PR body or the progress file, not only to the conversation. Skip ritual duplicate checks and whole-project rediscovery.
