---
id: core-counted-views-delete
title: "Delete the counted person and household views and resolve the stopgap"
area: core
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/pool-views-delete
pr: #5321
blocked-on:
after: world-counted-reads-jobs, world-counted-reads-business, world-counted-reads-housing, gov-counted-reads-campaigns, gov-counted-reads-retirement-claims
source: "split from core-stopgap-counted-groups-faked-mechanic (SG-CORE-counted-person-views), Oct 15"
claimed-at: 2026-10-20T00:23:51.378Z
---

**What.** Once jobs, business, housing, campaigns and retirement claims read groups, nothing builds a record from the packed columns for the engines. Delete `CountedHouseholdMap`, `personInput` for engine reads and `householdView`, keep `takeResidentHousehold` for fill-in, and mark the stopgap resolved with how. The counted tier then has one way to be read.

**Rules.** Replace, never layer: the views are deleted, not left beside the group reads. A row is never closed by deleting it without the mechanic; the five engines above are the mechanic.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) nothing calls the household views, the stopgap row in src/core2/data/stopgaps.json is resolved with its replacement named, and the stopgap tripwire test and src/core2/counted-groups.test.ts pass.

**Files.** src/core2/counted-groups.ts, src/core2/modules/residents.ts, src/core2/data/stopgaps.json

**Notes.** Last part of retiring SG-CORE-counted-person-views.

Sent back 2026-10-17 from PR #4920 (branch claude/births-columns): Merging current main (a7d15a03fa) conflicts in docs/pool/items/core-counted-views-delete.md, docs/pool/items/core-residents-rerate-test-flaky.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Looked at Oct 20 (claude/political-game-pool-3xfqef-5), released unbuilt: the five `after` items are done, but the views still have live readers beyond them. `countedHouseholdsByPlace` feeds six call sites in `births-counted.ts` (PR #4920's work), `campaign-day.ts` (town household count) and `housing-construction.ts` (`residentsOf`) read `ResidentsRuntime.households`, and six tests read it too (`residents.test.ts`, `counted-demotion.test.ts`, `housing-laws.test.ts`, `counted-deaths-spread.test.ts`). `personInput` must stay for `takeResidentHousehold` (fill-in) with its stopgap call dropped. Order: finish #4920 (births and credit on columns), move campaign-day and housing-construction to `store.liveHouseholds()` and `store.weightedPeople(placeId)`, then delete `CountedHouseholdMap`, `householdView` and `ResidentsRuntime.households`. This is M, not S.
