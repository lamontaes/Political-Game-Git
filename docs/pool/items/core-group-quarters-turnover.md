---
id: core-group-quarters-turnover
title: "Group quarters admit no one: a college town's students age in place and its rooms empty as residents die or are met"
area: core
lead: speed
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-group-quarters-population
source: speed lead, Nov 1, review of core-group-quarters-population
claimed-at:
---

**What.** The opening houses each place's group-quarters residents (college housing, prisons, juvenile facilities, nursing homes, military quarters, other) in room records counted from the 2020 Census, and both moves engines leave them out of the households' leaving and arrival rates (stopgap SG-GQ-no-turnover). Nothing admits anyone: a college admits no class in the fall, a prison and a nursing home take no one as residents leave, so each type's count only falls as residents die or are filled in, and a college's students are a year older every year. Over a long save a college town's dormitories empty and its students reach middle age in place.

**Rules.** One model, two tiers: an intake is a counted arrival through admitCountedHousehold, read by every engine with the same rule as a household, times its weight, and a full resident of a room is held by the same institution calendar. Sliding scales and causes: an institution admits on its own calendar (a college each fall, a prison and a nursing home as residents leave), never by a monthly chance. One rule, all 56 places: each type is held at its row in data/research/group-quarters/census-2020-group-quarters.json scaled by the world's count, never by a place named in logic.

**Done when.** In a ten-year run of the played world (buildBenchWorld) in Storrs, Connecticut (0973980) and a drawn place with a prison or base, place and seed named, each type's residents stay within 5 percent of their opening count every year and the college residents' median age stays within one year of the opening's, by room record id; a test in src/core2 holds it; and SG-GQ-no-turnover is resolved with its markers removed.

**Files.** src/core2/modules/counted-moves.ts, src/core2/modules/moves.ts, src/core2/modules/residents.ts, src/core2/group-quarters.test.ts

**Notes.** Needed before long saves (speed bar: years 97 to 100 against years 1 to 4).
