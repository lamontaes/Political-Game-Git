# The handoff block

Before you stop for any reason (done, time box spent, usage out, blocked, the environment restarting), add one entry at the top of the log in `PROGRESS.md` (newest first) **on main only** (acting CTO, Oct 25): `git checkout main && git pull`, append, commit `play-first: handoff <item>`, push (pull with rebase and push again if rejected; never force-push), then check your branch out again. Never commit it on your item branch: a branch that changes `PROGRESS.md` is a defect and the merger drops the hunk. If main refuses you, post the line as a comment on your PR and the CTO copies it to main.

Copy this block, one line, fields in this order, separated by `·`:

```
- <time UTC, YYYY-MM-DD HH:MM> · <agent/model> · <item id> · <branch> · <last push sha> · <state> · <next step> · <blocking>
```

- **time UTC:** from `date -u +"%Y-%m-%d %H:%M"`.
- **agent/model:** who you are and the model (`Claude/Opus`, `GLM/5.3`, `Argon`, `Astra`, `Codex/medium`).
- **item id:** the pool id exactly, as in `ORDER.md`.
- **branch:** `play-first/<item id>` (or the adopted PR's branch, as `ORDER.md` names it).
- **last push sha:** `git rev-parse --short HEAD` after your last push. A sha that is not on GitHub is not a handoff.
- **state:** one of `started`, `pushed`, `PR opened #N`, `ready for recheck #N`, `blocked`, `done #N` (done only after a merger merged it).
- **next step:** the very next thing the next agent does, as a command or a file and line ("run the bench in a drawn place and screenshot the ballot's page 2", "src/bench/play.mjs pageIn: the pager's Continue never re-measures").
- **blocking:** `none`, or what stops it: `needs-from: <lead> <item id>` for an engine change, or the failing check and its first error line.

Example:

```
- 2026-10-24 21:40 · Claude/Sonnet · play-stop-21-ballot-stuck-on-first-page · play-first/play-stop-21-ballot-stuck-on-first-page · 3f2a9c1d0e · PR opened #6001 · take the after screenshot on the bench at 1440×900 in a drawn place, put it in the PR body · none
```
