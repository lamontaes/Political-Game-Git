---
id: wire-office-budgets-justice
title: "Office, budgets and justice from rows: one term writer, body rows for the legislature, one budget base row per government, one case engine, the copied statistics drawn per world"
area: gov
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Engine map lines 5 and 27 to 30. The 38 statistics still copied into every world (docs/reports/real-statistics-in-play-2026-10-27.md) are drawn per world, one source table per PR, using the existing per-world draw (seededUnit, the pattern of #6446). src/core2/office-day-state.ts's own term writer folds into the one in src/core2/modules/offices.ts. The 14 level branches in src/core2/modules/legislature.ts become body rows (chambers, veto holder, term years) the one engine reads. Budget bases (src/core2/modules/budgets.ts around 610-650) become one row per government in data/research/money/public-budget-bases.json. One case-and-sentence engine: src/core2/modules/public-safety.ts reads the crime engine's victims and src/core2/modules/justice.ts's cases, its own copies deleted. Time box: 6 hours.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. One engine per mechanic and the simulation as the one layer (AGENTS.md first bullet). No new mechanic (AGENTS.md step 0): a missing piece is a registered stopgap naming the engine. Every cut corner a registered stopgap. The guards on main (npm run guards, sixteen ids in scripts/guards/index.ts) pass on every PR; a shrinking baseline is lowered in the same PR. Sessions never message; the channel block and PR bodies are the record. One PR per line; mergers merge on green; a golden-path red that reproduces on clean main does not block. Guards: families, two-seeds-differ, no-second-source, no-dice, director-numbers-in-data.

**Done when.** In a drawn world (name it and the seed), a town council, a legislature and Congress run the same bill engine from body rows with no level branch left (grep named); the budget base of each government is its row; one case record kind with one writer; two seeds open with different economies for every drawn statistic (the two-seeds guard lists them).

**Files.** src/core2/modules/legislature.ts,src/core2/office-day-state.ts,src/core2/modules/offices.ts,src/core2/modules/budgets.ts,data/research/money/public-budget-bases.json,src/core2/modules/justice.ts,src/core2/modules/public-safety.ts,src/core2/modules/macro.ts

**Notes.** Filed by the CTO from the engine map on the owner's go (Oct 28). engine: offices.ts, legislature.ts, budgets.ts, justice.ts, seededUnit. guard: families, two-seeds-differ. Read: OWNER-DECISIONS (realistic not real, one engine), the engine map (E3, E4, E13, C2), the realistic-not-real channel block. Starts wiring when the Trim block says the office deletions landed.
