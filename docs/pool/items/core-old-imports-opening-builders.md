---
id: core-old-imports-opening-builders
title: "Move the opening builders off the old town-pay, employment and residents code"
area: core
kind: cleanup
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
after: core-old-imports-population,core-old-imports-opening-employment,core-old-imports-opening-work,core-old-imports-town-households,core-old-imports-opening-employment-jail-term,core-old-imports-opening-people,core-old-imports-schedule-workplace-types,core-old-imports-generated-world
source: added with npm run pool -- add
claimed-at:
---

**What.** This is the roll-up for removing the last old-engine imports from the opening builders. The files named in the title (`population.ts`, `opening-employment.ts`, `opening-work.ts`, `town-households.ts`) are each owned by a child item, and three more files the grep still lists (opening-people.ts, town-workplaces.ts with work-schedules.ts, and tooling/generated-world.ts) have their own new items. When all are done, the grep `grep -rlE 'from "\.\./(\.\./)?(simulation|presentation)' src/core2 --include=*.ts | grep -v test` prints nothing and the old `town-pay`, `town-employment`, `town-residents`, `work-schedules`, `life-queries` and `jail-terms` code the openings pulled in can be deleted.

**Rules.** Replace, never layer: the old modules are deleted once nothing in the core imports them, and the PR body counts the lines removed. Build only what the golden path needs: port what the opening reads and write the rest fresh. One rule, all 56 places: the same town by record id for a drawn place before and after. Bookkeeping is a debug switch: validation stays out of play.

**Done when.** After the child items are done, the grep prints nothing, the typecheck passes, and in a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body) the opening builds the same town by record id as on the base commit, shown by src/core2/population.test.ts.

**Files.** src/core2/population.ts, src/core2/opening-employment.ts, src/core2/opening-work.ts, src/core2/town-households.ts, src/core2/opening-people.ts, src/core2/tooling/generated-world.ts

**Notes.** Follows core-old-imports-14 (PR #4773). One module per session; start with the smallest leaf the opening builders share.

Oct 20 (pool feeder): spec written; the grep on this branch also lists opening-people.ts, town-workplaces.ts, work-schedules.ts and tooling/generated-world.ts, which no child covered, so three split items were created; the rest already have children.
