---
id: core-counted-deaths-opening-small-town-red
title: "counted-deaths-opening.test fails in about a quarter of drawn towns that expect 10 to 15 counted deaths: its floor of half the tables is inside the spread of a small count"
area: core
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/political-game-pool-7xkkii
pr: #5196
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:12:43.492Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** Replayable: GOLDEN_PATH_SEED d4 (Naco, Arizona: 4 died, 13.4 expected) and d7 (Le Roy, Minnesota: 3 died, 12.7 expected) failed; 6 of 8 seeds passed. Measured Oct 20 over 14 drawn places with scripts/core2-year/deaths-ratio.ts: in towns expecting 49 to 173 deaths the ratio of deaths to the tables' expected is steady at 0.60 to 0.71 (deaths lag onsets), so a count near 13 has a mean near 8.5 and falls under a flat 6.7 about a quarter of the time. The floor is now half the expected less two standard deviations of that count, and at least one death, so the original bug (nobody dies for months) still fails it. Fixed in the PR that carries this note.
