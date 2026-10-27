---
id: tests-apply-need-no-town-with-spread
title: "The apply-need test fails on main: no drawn town in 12 has two seekers in each tier a month of runway apart"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/apply-need-spread
pr: #6137
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T03:05:26.106Z
---

**What.** src/core2/jobs-apply-need-varies.test.ts (from the runway-both-tiers work) plays each drawn place one week and needs at least two unemployed seekers with a finite runway in each tier, full and counted, whose runways differ by 30 days or more. On clean main at 2b3a89a2a4 with APPLY_NEED_SEED=moneycheck1 it found none in 12 draws and failed. Most small towns hold 1 to 5 unemployed full seekers after a week, and many hold no counted ones: Pierce, Idaho 3 and 3; Driscoll, North Dakota 2 and 0; Washington, District of Columbia 1 and 33; Auburn, Wyoming 3 and 0. The traits money branch failed the same way on a random seed.

**Rules.** Never loosen a check to get green: the test must still show a shorter runway raising the need in each tier and the need surviving fill-in. One rule, all 56 places: keep drawing from all 56, naming place and seed.

**Done when.** src/core2/jobs-apply-need-varies.test.ts passes on main for APPLY_NEED_SEED=moneycheck1 and for three fresh seeds, each run naming the drawn place, seed and the two seekers it compared in each tier by person id, with the shorter runway's need above the longer's in both tiers. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/jobs-apply-need-varies.test.ts

**Notes.** Found Oct 25 by the traits lead while gating the money family's main merge. Two ways that keep the check: compare across more of each town's seekers (every working-age adult the apply step would weigh, not only those unemployed after a week), or draw until both tiers have the spread, with a larger draw limit.
