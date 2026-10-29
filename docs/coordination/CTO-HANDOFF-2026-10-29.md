Touches pool item: none (handoff)

# CTO handoff, October 29, 2026

The owner moved every Claude session to a second account at 9:45 AM Eastern. This file is what the next CTO, on that account, reads first. The game can be played to the filing office and through the first campaign scenes; the furthest step a player reaches on a fresh life has not been measured on today's main. After this file, read the channel's newest block in every section, then the newest rulings in the rulings log.

## Read in this order

1. `AGENTS.md` whole.
2. This file.
3. `docs/coordination/LEADS-2026-10-24.md`: the newest block of every section. The four sessions stopped this morning posted final blocks at the top of `Wire: laws`, `Words and scenes`, `Red main` and `Old engine`.
4. `docs/coordination/OWNER-DECISIONS.md`, the October 27 to 29 sections: one engine per mechanic, the simulation is the one layer, realistic not real, every red has one owner, the words and director plan approved, family batches on every wire line, the six background records.
5. `docs/reports/words-director-plan-2026-10-28.md`: the approved plan for words and the director, with its eight steps.
6. `docs/coordination/voice-notes/`: the owner's words on words and scenes, verbatim. A plan or a brief reads these, never a summary.
7. `.agents/skills/cto/SKILL.md`, especially "What the role learned, Oct 27 to 29".

## What the new account needs before the first session

- A cloud environment for the repository, like the old account's `OCD` environment. Every session runs every npm command with the storage override named in `AGENTS.md`.
- The repository secret `RELEASE_PUSH_TOKEN`, set by the owner on the old account on October 28. It lets the release workflow and the pool's done-flip job push past branch protection. If the new account's sessions run workflows under a different installation, confirm the secret still resolves: a failed "Publish exact candidate" step or a failed "Pool done on merge" run with a GH006 message means it does not.
- Branch protection on main requires the `validate` and `golden-path` checks. Main's own full validation runs once an hour, not on every push.
- The GitHub tools in a cloud session are REST calls through the gh command, repository-scoped. Cross-repository search endpoints are refused.
- Sessions never message each other. The CTO may message its own sessions; a session that calls a scheduling tool or edits anything under the `.git` folder waits on a permission prompt for hours. Every brief says never to.

## Builds

v0.63.0 published at 2:14 AM Eastern with all seven files, from main as of about 2 AM. The two-hour clock skips sometimes; dispatch the package workflow by hand after a stretch of merges. The CI queue was empty this morning after the hourly-validation change (#6692).

## The lines, where each stopped

| Line                         | Item                                       | Last state                                                                                                                                                                                                                                                                                                                                                                 | Branches and PRs left                                                                                                                      |
| ---------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Laws and links               | `wire-law-links-to-people` (back to open)  | 83 of 89 laws, 161 of 244 links on main; 84 and 165 with open PRs. The six laws whose records the game lacks are background simulations by the 13:30 UTC ruling; natural resources is in #6766, teen cannabis and social media age checks were going to helpers, then the college step and small-dollar lenders; medical debt waits on `world-medical-spending-categories` | #6760 labor family, #6763 civic family, #6766 natural resources; helper worktrees named in the final block                                 |
| Words and director           | `words-director-one-path` (back to open)   | Plan steps 1 to 5 landed in part: the voice notes folded and the bans in the guard, the address in parts, the clerk's filing talk with signatures, the post-filing scene, news bodies for twelve more record kinds. Producers 1 of 10. Everyday talk moving onto the one scene engine                                                                                      | #6759 slots, #6764 replies fit what you said, #6762 printed kinds, #6765 a graded line weighs its own pick; the final block names the rest |
| Traits                       | three families merged                      | 85 of 89 decisions fire across drawn election windows; 49 of 89 with researched weights; 40 at the general weight                                                                                                                                                                                                                                                          | none open; `traits-decisions-fire-in-play` evidence is on the item                                                                         |
| Screens (the Oct 28 sitting) | `play-screens-sitting-oct28` (done)        | every point merged except what waits on Words: news bodies, the office-duties bank for the hover card, the clerk's counter conversation, the screen-words bank for labels typed into `controls.json`                                                                                                                                                                       | none open                                                                                                                                  |
| Office, budgets, justice     | done                                       | every line merged; the copied-statistics guard holds one row (world disasters)                                                                                                                                                                                                                                                                                             | none                                                                                                                                       |
| Elections                    | done                                       | one result writer, candidacy in every world, the polling-place path, the petition record                                                                                                                                                                                                                                                                                   | none; `officials-president-import-cycle` is still theirs                                                                                   |
| Opening and home             | done                                       | history from the birth year, the journal as one story, past moves and elections                                                                                                                                                                                                                                                                                            | none                                                                                                                                       |
| Old engine                   | done                                       | `src/simulation` and `src/presentation` gone; the stopgap-register split into per-family files is unbuilt and unfiled                                                                                                                                                                                                                                                      | none                                                                                                                                       |
| Red main                     | `release-main-red-standing` (back to open) | nine fixes merged; reds left are listed with owners in its final block: the vacant House seats in Florida and Texas towns, a dead parent with no record (M0-06), sampled legislators never refilled, large towns out of heap in the nightly                                                                                                                                | none                                                                                                                                       |

## Open pull requests at the handoff

Words: #6759, #6762, #6764, #6765. Laws: #6760, #6763, #6766. Older, not owned by a running session: #6411 donor calls, #6091 Start a life first, #6050 someone the player's age in every town, #5695 unplanned pregnancies, #6505 and #6530 small fixes. Drafts from October 20 to 24 are stale research and can be closed by their audit rows.

## Items claimed or in-pr with nobody on them

The pool shows 28 claimed items and about 30 in-pr whose branches belong to sessions that ended between October 19 and 27 (the `golden/*`, `words/web-*`, `claude/traits-*` and `play-first/*` branches). The retroactive look-first audit of October 27 gave each a verdict; the first pool pass on the new account releases the stale claims and sets in-pr items whose PRs merged to done.

## Scheduled tasks on the old account

All disabled or deleted this morning: the four-hourly skill-lessons sweep, the merger re-poll, the CTO delivery test. The owner's personal morning brief and heartbeat are not the project's and were left alone. A scheduled task cannot fire into a session on another account; the new CTO creates its own.

## The first three things to start

1. **Words and director**, one Opus session on `words-director-one-path` from its Notes line, the plan's next step first. The owner's cadence rule: every Mac build reads a little better.
2. **Laws**, one Opus session on `wire-law-links-to-people` from its Notes line, family batches, two Sonnet helpers, the five remaining background records.
3. **Red main**, a standing Sonnet session on `release-main-red-standing`, reading every workflow on main and the reds its predecessor listed.

Then a screens session for what Words unblocks (news as the full paper once bodies land), and the stopgap-register split as a small fixer unit.

## What the owner said last

October 29, 9:25 AM: the six laws' missing records are background simulations from research, never shown to the player. 9:45 AM: move every session to the other account; take inventory, stop the cloud sessions, update the skills, write this handoff.
