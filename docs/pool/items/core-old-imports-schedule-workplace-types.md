---
id: core-old-imports-schedule-workplace-types
title: "Move the opening workplace and schedule files off the old simulation types"
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

**What.** `src/core2/town-workplaces.ts` and `src/core2/work-schedules.ts` each still import types from `src/simulation/types` (`OrganizationClassification` and friends in the first, `EntityId` and `IsoDate` in the second). Define the few types they use in the core (the core already has `src/core2/kernel/ids.ts` and `kernel/dates.ts`) and delete the two old imports so neither file reaches into the old engine. Nothing about the schedules or workplaces themselves changes.

**Rules.** Replace, never layer: the old type import is deleted in the same change, with no re-export left behind. Build only what the golden path needs: copy only the types these two files use. One rule, all 56 places: no place is named in the moved types. No hand-written player text: the move touches no player words.

**Done when.** The grep `grep -n 'simulation/' src/core2/town-workplaces.ts src/core2/work-schedules.ts` prints nothing, the typecheck passes, and in a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body) the opening builds the same workplaces and schedules by record id, shown by src/core2/opening-employment-provenance.test.ts.

**Files.** src/core2/town-workplaces.ts, src/core2/work-schedules.ts, src/core2/kernel/ids.ts, src/core2/opening-employment-provenance.test.ts

**Notes.** Found by the pool feeder: types-only imports the roll-up grep still lists.
