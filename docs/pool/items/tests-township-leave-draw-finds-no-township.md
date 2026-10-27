---
id: tests-township-leave-draw-finds-no-township
title: "The township leave-law test drew 40 places and found no township in any law chain (red on main)"
area: laws
lead: laws-effects
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/township-leave-draw
pr: #6268
blocked-on:
source: laws-and-effects lead, Oct 27 (PR #6011's gate, replayed on main)
claimed-at: 2026-10-27T08:42:31.692Z
---

**What.** src/core2/law-reach/group-a-money-township.test.ts draws up to 40 places for one whose law chain has a township and no leave law in force. On clean main with LEAVE_TOWNSHIP_SEED=a30a670d01753df4 every draw but one says 'no township in the law chain', including places in states with townships such as Wessington, South Dakota and Thomasville, Missouri; Wassaic, New York had one but the law was in force at another level. The test then fails. Either the opening builds a township into few chains where the place lies inside one, or the draw should choose among places whose records show a township.

**Rules.** One rule, all 56 places: the township comes from the place's records, never a named state. A fix lands where the failure reproduces; flake is not a root cause. Never skip or quarantine the test.

**Done when.** On LEAVE_TOWNSHIP_SEED=a30a670d01753df4 the test passes in a played world, drawing a place whose law chain holds a township from its records, with the place, seed and the township government's record id named in the PR body, and it passes on one fresh seed.

**Time box.** 2 hours, one Sonnet fixer; waits on nothing.

**Files.** src/core2/law-reach/group-a-money-township.test.ts, scripts/core2-year/place.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27: found in PR #6011's gate and replayed on clean main with the same seed.
