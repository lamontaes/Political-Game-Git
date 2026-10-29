# The play-first lane

Current as of 2026-10-25, 23:59 UTC (opened by the acting CTO on PR #5963, from the Oct 24 playtest and the owner's read of its screenshots; the owner's Oct 24 "go ahead" on lane edits to director and English files)

The owner has never been able to play his own game. On Oct 24 the playtest (`docs/reports/playtest-2026-10-24.md`) hit three dead ends and 23 more defects, and the owner's own read of the screenshots added more. The owner: "Only the bare minimum needs to be put in the game right now. I still can't play the game."

This lane is the one place that work happens. It has one owner, the lane itself, and many agents of different models working it one after another. **The owner is a file, not a session:** what he ruled is in `LAW.md`, what comes next is in `ORDER.md`, and where the last agent stopped is in `PROGRESS.md`. Nothing lives in an agent's memory.

## The one acceptance

The lane is done when the owner, on the installed Mac build, goes from **New game → Start a life** in a drawn town to election night, votes in his own race, is told on screen whether he won, and never hits a locked screen. Every screen is free of developer text, every conversation has real choices, and the person on screen is the one he made.

## How any agent joins

1. Read `AGENTS.md`, then this file, then `LAW.md`, `ORDER.md` and `PROGRESS.md`, in that order.
2. Take the first item in `ORDER.md` that `PROGRESS.md` does not show as done, and does not show as pushed in the last 3 hours. An item whose newest handoff line is older than 3 hours is yours to take over, on the same branch.
3. Claim it: `node --import tsx scripts/pool/index.ts claim <id> --branch play-first/<id>` (or the adopted PR's branch, where `ORDER.md` names one).
4. Work it to its **You will see** line inside its **Time box**.
5. Before you stop, for any reason, append the handoff block (`HANDOFF-TEMPLATE.md`) to `PROGRESS.md` **on main** (`git checkout main && git pull && append && push`), never on your branch.

## The rules

- **Push every 30 minutes or every green step,** whichever comes first. The environment can die at any moment; work that is not on GitHub does not exist.
- **One branch per item:** `play-first/<id>`. An item `ORDER.md` marks for adoption keeps the adopted PR's branch.
- **A draft PR at the first push.** Line 1 is `Pool item: <id>` (the template's line, no backticks). The body carries before and after screenshots from the start; the after screenshot replaces a placeholder as soon as it exists. Follow `.github/PULL_REQUEST_TEMPLATE.md` for the rest.
- **The handoff block before you stop,** for any reason: done, time box spent, usage out, blocked, the environment restarting. It goes at the top of the log in `PROGRESS.md` **on main only** (acting CTO, Oct 25): `git checkout main && git pull`, append, commit `play-first: handoff <item>`, push; if main refuses you, comment the line on your PR and the CTO copies it. A lane branch that changes `PROGRESS.md` is a defect (the merger drops that hunk). A sha that is not on GitHub is not a handoff.
- **Never rebase, never force-push, never amend a pushed commit.** Merge `origin/main` into your branch with a plain merge.
- **`LAW.md` is not negotiable.** If an item's text disagrees with it, `LAW.md` wins; say so in your handoff line and in the PR body.
- **Done when** is a screenshot of the installed build, or of the bench at 1440×900, from a drawn place (drawn from all 56, not chosen), with the place and seed written under it. A test alone is not done. **Your screenshots close the PR; the owner's check closes the item** (owner, Oct 25): the merger merges on your before/after screenshots and its checks, and the owner's installed-build check sets the item done afterward. "OWNER SCREENSHOT NEEDED" is not a merge gate; do not write it.
- **Never use dev mode to get past something.** If the game stops you, that stop is the defect; file it.
- **You may adopt any PR `ORDER.md` names:** claim the item with that PR's branch, merge main into it, finish it there, and rewrite its body so line 1 is `Pool item: <id>`.
- **The lane is the only writer in `src/bench`** until the owner lifts it. You change the files your item names. **You may edit `src/director`, `src/english` and `data/english` directly for a lane item** (owner, Oct 24): put `Review: words` in the PR body, and the Words session reviews it; a merger never sends a lane PR back for touching those files. An engine change in `src/core2` is still a pool item for that area's lead (`lead: <role>`) plus `needs-from: <lead> <item id>` in your handoff line; build the screen side against what the engine gives today.
- **How we talk** (`.agents/rules/how-we-talk.md`): sessions message the CTO with questions or blockers, never each other (owner, Oct 29). The lane's `PROGRESS.md` is its handoff log; the channel `docs/coordination/LEADS-2026-10-24.md` has a Play-first section the CTO keeps; `MERGE-FIRST.md` is the merge order. Read the channel's CTO section when you start. A need from another role is a `needs-from:` line here and a pool item with `lead:` set to that role.
- **No subagents** unless your prompt says so.
- **SMART, and four hours at most.** Every item is specific, has a screenshot as its measure, is achievable by one agent, is about something the owner will feel, and has a time box of four hours or less. An item that grows past its box is split into `-a` and `-b` (the second carries `after:` the first) before more building.
- **Never merge your own PR.** Mergers take lane PRs first (`docs/coordination/MERGE-FIRST.md`, line 1). The merger sends back a lane PR with no before and after screenshots.
- **Cloud environments:** `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm command; never ask the owner to confirm it.

## Files

| File                                                | What it is                                                         | Who writes it                                   |
| --------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| `LAW.md`                                            | Every owner ruling about the game as played, cited                 | the CTO, only after `OWNER-DECISIONS.md` has it |
| `ORDER.md`                                          | The items, in the order a player feels them                        | the CTO                                         |
| `PROGRESS.md`                                       | The handoff log, newest first                                      | every agent, before it stops                    |
| `HANDOFF-TEMPLATE.md`                               | The one-line handoff block                                         | the CTO                                         |
| `docs/pool/items/play-stop-*.md`, `play-first-*.md` | The items themselves (`milestone: play-first`, `lead: play-first`) | the pool CLI; status changes only through it    |

## The prompt

Paste this into any agent, of any model:

> Read AGENTS.md, then docs/play-first/README.md, LAW.md, ORDER.md and PROGRESS.md in lamontaes/Political-Game-Git. You are the next agent on the play-first lane; the lane is the owner, you are its hands. Take the first item in ORDER.md marked [open], or [claimed]/[in PR] with no push in the last 3 hours (check the branch); claim it: `node --import tsx scripts/pool/index.ts claim <id> --branch play-first/<id>` (or check out the existing branch). Work it to its You-will-see line inside its time box. Push every 30 minutes or every green step; open the draft PR at the first push with the item id on line 1 and before/after screenshots. Before you stop for any reason, append the handoff block from HANDOFF-TEMPLATE.md to PROGRESS.md on main (never on your branch) and push. Honor every line of LAW.md. Never dev mode to get past something; never force-push; never merge your own PR. Cloud environment: OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command; never ask the owner to confirm it.
