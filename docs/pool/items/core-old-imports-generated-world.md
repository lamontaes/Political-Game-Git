---
id: core-old-imports-generated-world
title: "Move the generated-world tooling off the old history-index and world checks"
area: core
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: split from core-old-imports-opening-builders by pool feeder Oct 20
---

**What.** `src/core2/tooling/generated-world.ts`, the route the speed guard and the bench use for a generated opening, still imports `releaseRecentHistory` from the old `history-index` and `forgetLastValidatedWorld` and `withoutWorldChecks` from the old `world` module. Check what each does for a core-only opening; where the core builds no old World, delete the call, and where it still does, replace it with a core step. Delete the three old imports.

**Rules.** Replace, never layer: the old calls are deleted when the core path stands alone, and the PR body counts them. Bookkeeping is a debug switch: world validation stays in tests and the bench only. Speed: opening time and memory stay within 20 percent of base, measured before and after on the same machine. One rule, all 56 places: the generated place is drawn, never named.

**Done when.** The grep `grep -n 'simulation/' src/core2/tooling/generated-world.ts` prints nothing, and a generated opening in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body) builds the same people and organizations by record id and passes a one-year run of `buildBenchWorld`; src/core2/tooling/calibration-guard.test.ts passes.

**Files.** src/core2/tooling/generated-world.ts, src/core2/tooling/calibration-guard.test.ts

**Notes.** Found by the pool feeder: the roll-up grep still lists this file, and the earlier tooling item left it.
