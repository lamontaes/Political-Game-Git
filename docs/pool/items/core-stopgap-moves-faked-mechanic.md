---
id: core-stopgap-moves-faked-mechanic
title: "Stopgaps in moves (faked-mechanic): 3 open"
area: core
kind: stopgap
priority: 2
status: done
claimed-by: claude/core-stopgap-moves
pr: #4531
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/moves.ts, kind faked-mechanic"
claimed-at: 2026-10-15T23:25:07.269Z
---

**What.** The stopgap row(s) SG-P15-moves-owners-stay, SG-P15-moves-pinned-jobs, SG-FIXER-moves-income-household in src/core2/modules/moves.ts mark a shortcut that is still live in play. Today a household that owns its home with a mortgage never leaves together, households with pinned jobs stay, and moves use a stand-in household income. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** Sliding scales and causes: who moves comes from jobs, rents, money and ties, never a threshold, a roll or a fixed share. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a mortgaged owner household moves for a recorded cause and the move appears on the household record, the housing ledger and the director's journal, named by record id. The test in src/core2/moves.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: watch a homeowner family leave town after the plant closes and read the sale in the news.

**Files.** src/core2/modules/moves.ts, src/core2/modules/counted-moves.ts, src/core2/data/stopgaps.json, src/core2/moves.test.ts

**Notes.** First row: A household that owns its home with a mortgage never leaves together; only a grown child in it can move out.
