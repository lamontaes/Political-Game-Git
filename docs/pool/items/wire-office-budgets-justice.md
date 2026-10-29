---
id: wire-office-budgets-justice
title: "Office, budgets and justice from rows: one term writer, body rows for the legislature, one budget base row per government, one case engine, the copied statistics drawn per world"
area: gov
kind: feature
priority: 1
size: L
status: done
claimed-by: claude/wire-office-2
pr: #6691
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T14:35:00.332Z
---

**What.** Engine map lines 5 and 27 to 30. The 38 statistics still copied into every world (docs/reports/real-statistics-in-play-2026-10-27.md) are drawn per world, one source table per PR, using the existing per-world draw (seededUnit, the pattern of #6446). src/core2/office-day-state.ts's own term writer folds into the one in src/core2/modules/offices.ts. The 14 level branches in src/core2/modules/legislature.ts become body rows (chambers, veto holder, term years) the one engine reads. Budget bases (src/core2/modules/budgets.ts around 610-650) become one row per government in data/research/money/public-budget-bases.json. One case-and-sentence engine: src/core2/modules/public-safety.ts reads the crime engine's victims and src/core2/modules/justice.ts's cases, its own copies deleted. Time box: 6 hours.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. One engine per mechanic and the simulation as the one layer (AGENTS.md first bullet). No new mechanic (AGENTS.md step 0): a missing piece is a registered stopgap naming the engine. Every cut corner a registered stopgap. The guards on main (npm run guards, sixteen ids in scripts/guards/index.ts) pass on every PR; a shrinking baseline is lowered in the same PR. Sessions never message; the channel block and PR bodies are the record. One PR per line; mergers merge on green; a golden-path red that reproduces on clean main does not block. Guards: families, two-seeds-differ, no-second-source, no-dice, director-numbers-in-data.

**Done when.** In a played world on a drawn place (buildBenchWorld; name the place and the seed), a town council, a legislature and Congress run the same bill engine from body rows with no level branch left (grep named); the budget base of each government is its row; one case record kind with one writer; two seeds open with different economies for every drawn statistic (the two-seeds guard lists them).

**Files.** src/core2/modules/legislature.ts,src/core2/office-day-state.ts,src/core2/modules/offices.ts,src/core2/modules/budgets.ts,data/research/money/public-budget-bases.json,src/core2/modules/justice.ts,src/core2/modules/public-safety.ts,src/core2/modules/macro.ts

**Notes.** Filed by the CTO from the engine map on the owner's go (Oct 28). engine: offices.ts, legislature.ts, budgets.ts, justice.ts, seededUnit. guard: families, two-seeds-differ. Read: OWNER-DECISIONS (realistic not real, one engine), the engine map (E3, E4, E13, C2), the realistic-not-real channel block. Starts wiring when the Trim block says the office deletions landed. Back to open Oct 28, 12:40 UTC (box over, wire-office session): done: budget base rows (#6553), one term writer seatTerm (#6604), legislature body rows first part (#6605), 25 of 38 statistics on main (#6565, #6588, #6593, #6597, #6599), red-main guard fix #6611 open. Left: merge main into #6598 (row 28, branch claude/realistic-population) and #6600 (rows 21 to 24, 26, 27, branch claude/realistic-business-rows); the rest of map line 28 (the four structural kind lines and the executive lookup named in #6605); E13, one case engine (public-safety.ts cases and terms into justice.ts cases, sentences and custody, public safety reading the crime engine's victims); statistics rows 42, 44, 45, 48 and 37 (41 waits on the disasters ruling); SG-WORLD-draw-helpers-three.

Oct 28, 20:45 UTC (wire-office): every line is merged or in PR. Merged: #6626 (one world draw; SG-WORLD-draw-helpers-three resolved), #6631 (legislature body rows and the executive lookup), #6646 (one case and sentence engine, E13), #6655 (rows 44, 48), #6664 (row 37). In PR: #6678 (row 42) and #6691 (row 45, stacked on #6678); both say "Touches", so whoever merges #6691 sets this item done. Row 41 is world-disasters-from-conditions's; SG-WORLD-creator-town-count-published is the lane's (play-creator-town-count-is-the-worlds).

Oct 28, 23:20 UTC (wire-office): every line is merged; ready for the CTO to set done (the PRs said "Touches", and the done flip is down, release-pool-done-push-token). Line 1: #6600 and #6598. Line 2, the copied statistics: rows 37 (#6664), 42 (#6678), 44 and 48 (#6655), 45 (#6691); the guard's copied list on main holds only row 41, which world-disasters-from-conditions carries. Line 3, the legislature's last kind branches and the executive lookup: #6631. Line 4, one case and sentence engine (E13): #6646. Line 5: SG-WORLD-draw-helpers-three resolved in #6626; SG-WORLD-creator-town-count-published is the lane's (play-creator-town-count-is-the-worlds). All sixteen guards pass on main at 22966e18f1.
