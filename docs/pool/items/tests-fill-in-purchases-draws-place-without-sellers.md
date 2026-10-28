---
id: tests-fill-in-purchases-draws-place-without-sellers
title: "residents-fill-in-purchases.test draws a place whose counted households buy from no seller in town and fails (Floweree, Montana)"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/fill-in-purchases-draw
pr: #5456
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:07:08.767Z
---

**What.** src/core2/residents-fill-in-purchases.test.ts draws one place and expects counted households to buy from at least one seller in town. In Floweree, Montana (seed 0ddfc54da59c07a85128bf3718b902baa217a0e8eb4683d18c8abf6769664fea) none do, so the first assertion fails before the move it tests. Draw the next place when the first has no seller, up to eight, and fail by name listing the places tried if none has one. The move check that follows is unchanged.

**Rules.** No dice: the place is drawn from all 56 by a named seed. One model, two tiers: the test still proves a filled-in household takes its purchases to its own plan and a seller total across both tiers does not change. One rule, all 56 places: a place with no seller in town is skipped, not named in logic.

**Done when.** In the played world (buildBenchWorld), src/core2/residents-fill-in-purchases.test.ts passes on a draw that includes Floweree, Montana and on two further random draws, and fails by name when none of eight drawn places has a seller in town.

**Files.** src/core2/residents-fill-in-purchases.test.ts

**Notes.** Found Oct 20 sweeping src/core2 tests p and r on clean main.
