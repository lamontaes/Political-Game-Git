---
id: core-release-household-copies-purchase-parts
title: "Returning a household to the counts copies every purchase flow's parts map, 7 percent of a big town's year (Williamsburg, Virginia)"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/release-household-allocs
pr: #5057
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T18:40:40.233Z
---

**What.** Returning a filled-in household to the counted books copied the whole parts map of every purchase flow it paid into, and removing a household from the counts copied it again. A merged purchase flow holds a part for every counted household in a place, so each copy is thousands of entries, repeated for each flow the household touches. In Williamsburg, Virginia (seed d2c5933c4098, run seed audit-oct17) the release function alone took 32 s of a 390 s year, 7.3 percent of all time, and the garbage collector another 18 percent. The earlier item that blamed this function was dropped because a small town showed 0.8 percent; this is the large-town case it asked for.

**Rules.** Speed: a town's game year runs under two minutes and no change makes it more than 20 percent slower; measured before and after on the same base and machine, one process at a time. No dice. One rule, all 56 places. One model, two tiers: a counted household's parts are changed with the same arithmetic as before, only without copying the rest.

**Done when.** A 60-day run of the drawn place Williamsburg, Virginia (seed d2c5933c4098, buildBenchWorld) takes less time on the same machine with every dollar unchanged, and the residents and fill-in tests pass; the PR body gives before and after seconds and the function's profile share.

**Files.** src/core2/modules/residents.ts

**Notes.** Found profiling the slowest place of the Oct 17 audit. Also caches the employer calendars, group accounts and unplaced-pay flow a release looks up, which did not move the profile on their own. The residents-economy test counted-weight-housing.test.ts failed in the same run in two different drawn places; filed as world-counted-weight-housing-test-fails-in-drawn-places.
