---
id: core-group-quarters-turnover
title: "Group quarters admit no one: a college town's students age in place and its rooms empty as residents die or are met"
area: core
lead: speed
kind: stopgap
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on: core-group-quarters-turnover-part-1-settle-the-red-test, core-group-quarters-turnover-part-2-institution-intake
after: core-group-quarters-population
source: speed lead, Nov 1, review of core-group-quarters-population
claimed-at:
standard: 2
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
---

**What.** The opening houses each place's group-quarters residents (college housing, prisons, juvenile facilities, nursing homes, military quarters, other) in room records counted from the 2020 Census, and both moves engines leave them out of the households' leaving and arrival rates (stopgap SG-GQ-no-turnover). Nothing admits anyone: a college admits no class in the fall, a prison and a nursing home take no one as residents leave, so each type's count only falls as residents die or are filled in, and a college's students are a year older every year. Over a long save a college town's dormitories empty and its students reach middle age in place.

**Cause.** Measured: `npx vitest run src/core2/group-quarters.test.ts` is red on main c00d0a7b6d (3 of 4 tests): an arriving household is housed in a group-quarters room where the test says no arrival may be ('college' in place 0973980, 'nursing' in 3929428 and 5683040). The moves engine keeps a room capacity and queue (`roomCapacity`, `roomQueue` in src/core2/modules/counted-moves.ts), and the stopgap SG-GQ-no-turnover (src/core2/data/stopgaps/gq.json line 27) says nothing admits anyone.

**Fix.** Two parts: first settle whether the test or the admission is right and make the test say it; then add institution intake on its own calendar and resolve SG-GQ-no-turnover.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** One model, two tiers: an intake is a counted arrival through admitCountedHousehold, read by every engine with the same rule as a household, times its weight. Sliding scales and causes: an institution admits on its own calendar (a college each fall, a prison and a nursing home as residents leave), never by a monthly chance. One rule, all 56 places: each type is held at its row in data/research/group-quarters/census-2020-group-quarters.json scaled by the world's count, never by a place named in logic.

**Done when.** A second session, in a ten-year run of the played world (buildBenchWorld) in Storrs, Connecticut (0973980) and a drawn place with a prison or base (place and seed named), reads each group-quarters type's residents every year and sees none emptying out and the college residents' median age not drifting up year over year, by room record id, with the yearly counts printed. A test in src/core2 holds it and SG-GQ-no-turnover is resolved with its markers removed.

**Waits on.** Its two parts: core-group-quarters-turnover-part-1-settle-the-red-test and core-group-quarters-turnover-part-2-institution-intake.

**Files.** src/core2/modules/counted-moves.ts, src/core2/modules/moves.ts, src/core2/modules/residents.ts, src/core2/group-quarters.test.ts

**Notes.** Needed before long saves (speed bar: years 97 to 100 against years 1 to 4).

**Notes (Fable, Nov 10).** `npx vitest run src/core2/group-quarters.test.ts` is red on main today (c00d0a7b6d) and was already red on yesterday's main (d088df98cd), three of four tests, in every place it draws: an arriving household is housed in a group-quarters room where the test says no arrival may be (`move:in:household_194eae169e3d9dc1:2025-03-01: expected 'college' to be undefined` in place 0973980; 'nursing' in places 3929428 and 5683040). The moves engine keeps a room capacity and a room queue (`roomCapacity`, `roomQueue` in src/core2/modules/counted-moves.ts), so rooms do admit arrivals now, and either that admission or this test's rule is out of date. Whoever takes this item settles which and makes the test say it. Seen while a helper was fixing the back-to-the-counts error; not caused by it.

**Notes (Nov 14).** Built on branch claude/project-thread-uh34sg: rooms discharge on each type's own calendar (`SG-GQ-no-turnover` row deleted) and Medicaid-style programs reach only institutional rooms that their own rule serves (`SG-GQ-means-tests-poverty` row deleted, part 2 of laws-group-quarters-means-tests). `src/core2/group-quarters.test.ts` is red at Storrs and Charlotte Amalie on the clean train with the same seed (a room grows from 2 to 3 people), not from this change.
