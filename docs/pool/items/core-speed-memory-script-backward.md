---
id: core-speed-memory-script-backward
title: "scripts/core2-year/speed-memory.mjs stops with Core advance cannot move backward"
area: core
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/core-speed-memory-script-backward
pr: #4611
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T04:47:17.755Z
---

**What.** `CORE2_BOOKKEEPING=0 GOLDEN_PATH_PLACE_KEY=3325300 node --max-old-space-size=8000 --import tsx scripts/core2-year/speed-memory.mjs --seed speed-ex-1` stops with "Core advance cannot move backward" at `runCommand` (`src/core2/saves.ts` line 174, `advanceCore` at line 109), so the year time the speed guard reads cannot be measured on a pinned place. The script builds the bench world and then runs a command that advances to a date earlier than the world's own date.

**Rules.** Speed: measure before and after on the same base, one process at a time. No dice: the seed and place are named, not drawn.

**Done when.** The command above prints the load, year and slowest-day times for Exeter, New Hampshire (key 3325300, seed speed-ex-1), and exits 0 or 1 by its budgets, not by a thrown error.

**Files.** scripts/core2-year/speed-memory.mjs, src/core2/saves.ts

**Notes.** Found while finishing core-year-speed-remaining (PR #4586), which could not remeasure for that reason.
