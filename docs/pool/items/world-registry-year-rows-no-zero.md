---
id: world-registry-year-rows-no-zero
title: "A town's past year rows read rent and home value 0 before its first lease or home, where the figure is unknown"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude-world
pr: 9797
blocked-on:
after:
lead: world
model: sonnet
effort: medium
root: none
source: Screens finding, Nov 17, 2026 (comment 6933758202), seen at Waimanalo, Hawaii
---

**What.** The registry's year rows for a town hold rent 0 for every year from 1977 to 2002 before the first value in 2003, and the same for home value where no home was owned. A year with no lease or home has no median, so the figure is unknown, not zero. Seen: Screens at Waimanalo, Hawaii, Nov 17.

**Cause.** Found in code: `src/core2/housing-past.ts` wrote `median(renting.map(...))` into the year row for every December, and the median of an empty list is 0, so a year with no lease running read rent 0.

**Fix.** The pass writes a year's rent only when a lease was running and its home value only when a home was owned, through `putPastYear` in `src/core2/output-numbers.ts`, so the reader finds no figure and reports it unknown. The player sees the year as unknown on Metrics, never a zero rent.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** The `estimate-not-unknown` rule applies: a figure with no record is shown as unknown, not zero, and no real series fills it. No dice: nothing is drawn.

**Done when.** In a drawn place and a seed the builder did not choose, no year row of the world's past carries a zero rent or home value, shown in `src/core2/past-year-rows-never-zero.test.ts`; a second session sees an unknown, not 0, for an early year on Metrics.

**Waits on.** Nothing.

**Files.** src/core2/housing-past.ts, src/core2/past-year-rows-never-zero.test.ts

**Notes.** The other finding (state unemployment falling to 0.18) is a model-dynamics cause in `src/core2/country-model.ts`, reported on #9747 for the CTO.
