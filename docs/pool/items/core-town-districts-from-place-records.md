---
id: core-town-districts-from-place-records
title: "A council is elected the way the place's records say (ruling Oct 15); resolve SG-CORE-owner-decision-town-districts"
area: core
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/town-districts-records
pr: #5144
after:
blocked-on:
source: "CTO ruling Oct 15 (town council seats); audit Oct 19, Part A 'What it fakes' 4"
claimed-at: 2026-10-19T20:27:08.496Z
---

**What.** `src/core2/modules/residents.ts` splits a town into the state House districts its population falls in, else the whole town, and holds that under `SG-CORE-owner-decision-town-districts`. The Oct 15 ruling answers it: each place's council or board is elected the way its own records say (at-large, by district, or mixed, from the place's data where the repository has it), estimated as at-large with a per-world spread where it does not, marked as an estimate with its source. Build the read from place data, replace the state-House split, and resolve the stopgap so the release build stops refusing on an answered question.

**Rules.** One rule, all 56 places: the council's shape comes from place records in data, never a named place in logic. Estimate, never UNKNOWN: where the records are silent the place is at-large with a per-world spread, marked as an estimate with its source.

**Done when.** Two drawn places built with `buildBenchWorld` show their council seats shaped by their own records (one by district, one at-large or estimated) by record id with the source cited; the state-House split is deleted; the stopgap row is resolved and the residents and elections tests run both cases. The owner plays it: his town's council has the seats his town really has.

**Files.** src/core2/modules/residents.ts, src/core2/electorate-places.ts, src/core2/data/stopgaps.json

**Notes.** people-od-town-districts is the owner-decision item; it closes with this.
