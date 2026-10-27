---
id: tests-player-money-and-town-corporate-tax-red
title: "Two tests fail on some draws on the taxes family's base: player money and the town's corporate tax payers"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/player-money-red
pr: #6399
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T18:56:27.273Z
---

**What.** The taxes family's helper (Oct 25) found two tests red on its branch and red the same way on its base, 9f2616ba71: the player money test on a random place in the Northern Mariana Islands (2 against 0), and `town-payers-corporate-tax` in Sedley, Virginia (seed 252dc69d2dbe31fc), 136134377 against 175029914 (measured). Neither failure is from the taxes change. The exact test file names and failure lines are in the helper's notes in the laws lead's session; whoever takes this reruns both tests on main with those seeds first.

**Rules.** A fix lands on the branch where the failure reproduces. Ask why: the cause by file and line.

**Done when.** Both tests pass on main on the seeds above and on a fresh seed each, named in the PR, with the cause of each failure named by file and line. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2

**Notes.** Filed by the laws lead, Oct 25.
