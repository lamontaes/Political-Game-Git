---
id: world-trip-resident-from-place-counts
title: "A person met on a trip to another place takes an age, a job and a wage from that place's counts"
area: world
kind: feature
priority: 3
size: S
status: done
claimed-by:
pr: #5555
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** PR 5555's first slice: a place other than the player's keeps a coarse population (src/core2/coarse-place.ts), and a person met there on a trip is drawn from its counts (an age from the county's employed by age, a job from the place's industry mix, the wage its occupation pays there), kept as the identity:work fact. No employer, payroll or household exists for them there yet (SG-WORLD-coarse-place-no-payroll), and SG-OFFICE-FED-trip-residents stays open; world-other-places-coarse-population keeps the played-year trip with household, job and pay.

**Rules.** One rule, all 56 places: the counts come from each place's data; no dice beyond seeded generation of who exists.

**Done when.** coarse-place.test.ts and office-day-federal.test.ts, in places drawn from all 56 (seed named), show a met person whose age, job and wage come from that place's counts by record id.

**Files.** src/core2/coarse-place.ts, src/core2/office-day-federal-president.ts, src/core2/coarse-place.test.ts

**Notes.** TODO

Sent back 2026-10-23 from PR #5555 (branch claude/other-places-coarse): The bounded item, reopened broader parent, restored trip stopgap and named trip witness address the previous scope return, and current main integrates cleanly. One newly added test still has a no-check success path: src/core2/coarse-place.test.ts:44-66 loops over the drawn places but continues whenever coarsePlace returns null; it has no successful-place or filled-resident count assertion of its own. Running this test alone can therefore pass without calling metResident once or checking any age, job or wage. The positive counted assertion at lines 36-40 belongs to the other test and does not guard this one. Add a nonempty witness assertion inside the fill-in test, or make it draw with bounded retries and fail on exhaustion, retaining the existing determinism, age-band, minimum-job-age and wage checks. No local gate pass is claimed for this source review.; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5555 (branch claude/other-places-coarse): The moved employment generated module still has a live deleted-path import in data/tables/index.ts:4 and a stale current table source map; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5555 (branch claude/other-places-coarse): Moved generated module still appears as remaining old-core port/import in docs/design/old-core-retirement-map.md lines 54,354,412 and live old-engine-03 item Files line 22; finish on that branch, merge main into it first.
