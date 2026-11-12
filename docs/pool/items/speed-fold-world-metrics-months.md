---
id: speed-fold-world-metrics-months
title: "Fold the monthly metrics rows of places no one plays into year rows"
area: core
kind: cleanup
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: metrics-output-numbers-registry
blocked-on:
lead: speed
model: sonnet
effort: medium
root: none
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
---

**What.** The town's monthly metrics table grows without a fold: the daily register lists it at 759 rows growing to 3,063 over four years, and the outcome web reads the whole history each month to find the month's places and each place's latest row. Fold rows older than 24 months into their year rows for every place except the played town and its county, which keep their months so the timeline can open any month, and replace the web's whole-history reads with lookups by id. Guards: a hundred-year save opens Metrics as fast as year one.

**Cause.** Measured: the daily register (docs/design/daily-register.md) lists the town's monthly table as growing (759 to 3,063 rows over four years) with no fold; `npm run speed:year` over four years shows the year.

**Fix.** Fold rows older than 24 months for places other than the played town and county into their year rows, in the December step, and replace the web's whole-history reads (`placesOf` and the latest-row sort in src/core2/modules/outcome-web.ts:159 and 375) with lookups by id.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed (owner, Oct 29): years 97 to 100 run at most 1.2 times as long as years 1 to 4, and old records fold into summaries once play no longer reads them; never scan the whole history. Replace, never layer (owner, Oct 14): the whole-history reads are deleted, not kept beside the lookup.

**Done when.** A second session runs the speed command (`npm run speed:year`) for four years before and after on one machine, naming the place and seed, and the year is no slower and the table stops growing, counted by row on the town's metrics record ids (metrics:jurisdiction_<id>:<date>) in the played world.

**Waits on.** metrics-output-numbers-registry.

**Files.** src/core2/modules/world-metrics.ts, src/core2/modules/outcome-web.ts, docs/design/daily-register.md

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12.
