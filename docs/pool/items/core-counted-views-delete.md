---
id: core-counted-views-delete
title: "Delete the counted person and household views and resolve the stopgap"
area: core
kind: stopgap
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: world-counted-reads-jobs, world-counted-reads-business, world-counted-reads-housing, gov-counted-reads-campaigns, gov-counted-reads-retirement-claims
source: "split from core-stopgap-counted-groups-faked-mechanic (SG-CORE-counted-person-views), Oct 15"
---

**What.** Once jobs, business, housing, campaigns and retirement claims read groups, nothing builds a record from the packed columns for the engines. Delete `CountedHouseholdMap`, `personInput` for engine reads and `householdView`, keep `takeResidentHousehold` for fill-in, and mark the stopgap resolved with how. The counted tier then has one way to be read.

**Rules.** Replace, never layer: the views are deleted, not left beside the group reads. A row is never closed by deleting it without the mechanic; the five engines above are the mechanic.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) nothing calls the household views, the stopgap row in src/core2/data/stopgaps.json is resolved with its replacement named, and the stopgap tripwire test and src/core2/counted-groups.test.ts pass.

**Files.** src/core2/counted-groups.ts, src/core2/modules/residents.ts, src/core2/data/stopgaps.json

**Notes.** Last part of retiring SG-CORE-counted-person-views.
