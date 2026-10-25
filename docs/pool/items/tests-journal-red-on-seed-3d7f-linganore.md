---
id: tests-journal-red-on-seed-3d7f-linganore
title: "Three journal tests fail on main in Linganore, Maryland (seed 3d7f19f2)"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** With GOLDEN_PATH_SEED=3d7f19f27037978915428ed7093ff881432c851d, journal.test.ts draws Linganore, Maryland and three tests fail on main. 'never makes a school, a workplace or a visit an entry by itself' and 'never titles a chapter by a school' expect an empty journal from a fixture, but the household's own past (where the family came from, a parent's new job) is told whatever the fixture holds; #6093 rewrites both checks to the lines their fixture moments give. 'tells a relative's race by the record's result' finds no race line (line 349). CI draws a random seed, so any PR can go red on these with no change of its own.

**Rules.** One rule, all 56 places: a test that draws a place must pass in every place it can draw. Ask why: name the record behind each failure, not a flake.

**Done when.** In a played world on seed 3d7f19f27037978915428ed7093ff881432c851d (Linganore, Maryland), journal.test.ts passes, with the cause of the relative's-race failure named by record id in the PR body and a test that failed before the fix.

**Files.** src/director/journal.test.ts, src/director/journal.ts

**Notes.** Found by the Words session on Oct 25 while checking tests-journal-world-moments-red-on-seed-2803 on a fresh seed. The two school and visit checks are fixed by #6093 when it merges; the race check is open.
