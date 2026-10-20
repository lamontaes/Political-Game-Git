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

Part 1 done Oct 17 (claude, PR with the title "Housing, metrics, campaign day and drift stop using the counted household map"): housing occupancy and construction, the monthly town metrics, the campaign day's door count and the drift engine's three passes (since deleted) now read `store.liveHousehold(id)`, `store.memberIdsOf(h)` and `store.liveHouseholds()`. Still to do before the views can be deleted:

- `births-counted.ts` (the legacy births, deaths and arrivals pass) builds household records through `countedHouseholdsByPlace` in `modules/residents.ts` and copies them for newcomers; it needs a column-based rewrite (or removal where counted moves already run from causes).
- `counted-drift.ts` is deleted on main (the renewal engine's counted flows carry births and deaths), so its reads of the household views are gone.
- `residentPerson` and `store.personInput` remain for fill-in (`state.ts` `fillInPerson`, `takeResidentHousehold`) and for the person reads in `jobs.ts` (8), `business.ts` (`ownerPerson`), `employer-taxes.ts` (2), `credit.ts` (2), `jobs-benefits.ts` (2) and `candidacy.ts`.
- `rt.households` (the `CountedHouseholdMap`) is still read by `membership-dues.ts`, `housing-shelter.ts`, fifteen tests (`counted-drift`, `counted-demotion`, `residents`, `saves`, `law-reach-group-b`, `fill-in-returning-newborn`, `jobs-demoted-seeker`, `housing-laws`, `representative-sample`, `residents-fillin-past`, `counted-rent-transfer-read`, `counted-deaths-spread`, `population`, `retirement-claims`, `births-counted`) and four scripts (`scripts/world-proofs/session-b-deposits.ts`, `scripts/core2-year/saves.mjs`, `stress-wiring-proof.ts`, `one-model-proof.mjs`).

Delete the map, `householdView` and the person-view reads last, once none of them is read.

Sent back 2026-10-17 from PR #4920 (branch claude/births-columns): Merging current main (a7d15a03fa) conflicts in docs/pool/items/core-counted-views-delete.md, docs/pool/items/core-residents-rerate-test-flaky.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Looked at Oct 20 (claude/political-game-pool-3xfqef-5), released unbuilt: the five `after` items are done, but the views still have live readers beyond them. `countedHouseholdsByPlace` feeds six call sites in `births-counted.ts` (PR #4920's work), `campaign-day.ts` (town household count) and `housing-construction.ts` (`residentsOf`) read `ResidentsRuntime.households`, and six tests read it too (`residents.test.ts`, `counted-demotion.test.ts`, `housing-laws.test.ts`, `counted-deaths-spread.test.ts`). `personInput` must stay for `takeResidentHousehold` (fill-in) with its stopgap call dropped. Order: finish #4920 (births and credit on columns), move campaign-day and housing-construction to `store.liveHouseholds()` and `store.weightedPeople(placeId)`, then delete `CountedHouseholdMap`, `householdView` and `ResidentsRuntime.households`. This is M, not S.

Sent back 2026-10-20 from PR #4915 (branch claude/counted-views-delete): Merge main fc2817d7d5b5 into claude/counted-views-delete conflicts in: src/core2/modules/jobs.ts, src/core2/unfilled-opening-pay.test.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first. Current replacement claim and PR are preserved.

Sent back 2026-10-20 from PR #4920 (branch claude/births-columns): Changed-file checks failed after merge main: eslint unused var rt in housing-laws.test.ts, and vitest failed with 12 errors (residentsRuntime households undefined in fill-in-returning-newborn.test.ts, jobs-demoted-seeker.test.ts, representative-sample.test.ts, residents-fillin-past.test.ts; countedHouseholdsByPlace not a function in purchase-tax.test.ts); finish on that branch, merge main into it first.
