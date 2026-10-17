---
id: core-counted-views-delete
title: "Delete the counted person and household views and resolve the stopgap"
area: core
kind: stopgap
priority: 2
size: S
status: in-pr
claimed-by:
pr: 4915
blocked-on:
after: world-counted-reads-jobs, world-counted-reads-business, world-counted-reads-housing, gov-counted-reads-campaigns, gov-counted-reads-retirement-claims
source: "split from core-stopgap-counted-groups-faked-mechanic (SG-CORE-counted-person-views), Oct 15"
claimed-at:
---

**What.** Once jobs, business, housing, campaigns and retirement claims read groups, nothing builds a record from the packed columns for the engines. Delete `CountedHouseholdMap`, `personInput` for engine reads and `householdView`, keep `takeResidentHousehold` for fill-in, and mark the stopgap resolved with how. The counted tier then has one way to be read.

**Rules.** Replace, never layer: the views are deleted, not left beside the group reads. A row is never closed by deleting it without the mechanic; the five engines above are the mechanic.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) nothing calls the household views, the stopgap row in src/core2/data/stopgaps.json is resolved with its replacement named, and the stopgap tripwire test and src/core2/counted-groups.test.ts pass.

**Files.** src/core2/counted-groups.ts, src/core2/modules/residents.ts, src/core2/data/stopgaps.json

**Notes.** Last part of retiring SG-CORE-counted-person-views.

Done in part Oct 17 (claude, PR 4915, stacked on #4889, #4894, #4903 and #4909): the household record view (`householdView`, `HouseholdView`), `CountedHouseholdMap` (`rt.households`), `CountedPersonHouseholdMap` (`rt.householdOfPerson`) and `countedHouseholdsByPlace` are deleted from the engines; world-metrics, campaign-day, housing-construction and housing-occupancy read the store (`liveHousehold`, `memberIdsOf`, `weightedCount`), and the old record view lives in `src/core2/tooling/counted-records.ts` for tests and proof scripts only. What is left: the births engine (`births-counted.ts`) still reads a household's people as records through `peopleOf` (so `personInput` still serves an engine, and the stopgap stays open, narrowed). Next step: read the columns directly (birth date, sex, kin pairs, jobs) there, then `peopleOf` goes and `personInput` stays only for fill-in.

Second part Oct 17 (claude, PR 4920, stacked on 4915): the births engine and the household-credit engine read the group columns (`births-counted.ts` builds a light member from them; `credit.ts` reads cash, living cost, job and packed traits), with identical results in two drawn places for two years. What remains of SG-CORE-counted-person-views is a counted person looked up by id through `registerCountedPersonSource(residentPerson)`; callers of that source are the next to move to group reads.
