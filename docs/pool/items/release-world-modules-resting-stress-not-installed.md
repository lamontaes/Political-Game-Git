---
id: release-world-modules-resting-stress-not-installed
title: "world-modules.test.ts fails on main: openRestingStress is not installed by buildBenchWorld"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found Oct 17 while running the life-core test files for core-counted-drift-delete
---

**What.** `src/bench/world-modules.test.ts` fails on main: "resting-stress.ts is installed by buildBenchWorld" reports `openRestingStress` as not installed and not exempt. Install the resting stress engine in the bench world (it is in `peopleModules()`) or add it to the test's exemptions with the reason.

**Rules.** No dice: results come from the records. One rule for all 56 places.

**Done when.** The test passes, and the PR body says whether resting stress runs in the played world.

**Files.** src/bench/world-modules.test.ts, src/bench/world.ts, src/director/play-modules.ts

**Notes.** Seen on main; the other module checks in the file pass.
