---
id: core-group-quarters-turnover-part-2-institution-intake
title: "Institutions admit new residents on their own calendar"
area: core
kind: feature
priority: 2
size: M
status: in-pr
claimed-by:
pr:
after: core-group-quarters-turnover-part-1-settle-the-red-test
blocked-on:
lead: speed
source: split from core-group-quarters-turnover in the pool redo, Nov 10, 2026
standard: 2
model: sonnet
effort: high
root: none
checked: fable 2026-11-10
---

**What.** The opening houses each place's group-quarters residents (college housing, prisons, juvenile facilities, nursing homes, military quarters, other) in room records counted from the 2020 Census, and nothing admits anyone afterward, so each type's count only falls and a college's students are a year older every year. Over a long save a college town's dormitories empty. Give each institution intake on its own calendar: a college each fall, a prison and a nursing home as residents leave.

**Cause.** Found in code: src/core2/modules/counted-moves.ts and src/core2/modules/moves.ts leave group-quarters residents out of the households' leaving and arrival rates; stopgap SG-GQ-no-turnover (src/core2/data/stopgaps/gq.json line 27).

**Fix.** Admit new residents through admitCountedHousehold on each institution's calendar, taking them from the counted population of the right age and sex, and resolve SG-GQ-no-turnover with its markers.

**Time box.** 5 hours for a Sonnet session.

**Rules.** One model, two tiers: an intake is a counted arrival through admitCountedHousehold, read by every engine with the same rule as a household, times its weight. Sliding scales and causes: an institution admits on its own calendar (a college each fall, a prison and a nursing home as residents leave), never by a monthly chance. One rule, all 56 places: each type is held at its row in data/research/group-quarters/census-2020-group-quarters.json scaled by the world's count, never by a place named in logic.

**Done when.** A second session, in a ten-year run of the played world in Storrs, Connecticut (0973980) and a drawn place with a prison or base (place and seed named), sees a class admitted each fall into the college rooms and the other types refilled as residents leave, so no type empties and the college residents' median age stays with the student ages, by room record id, with yearly counts printed. A test holds it and SG-GQ-no-turnover is resolved.

**Waits on.** core-group-quarters-turnover-part-1-settle-the-red-test.

**Files.** src/core2/modules/counted-moves.ts, src/core2/modules/moves.ts, src/core2/modules/residents.ts, src/core2/group-quarters.test.ts, src/core2/data/stopgaps/gq.json

**Notes (Nov 14).** Built on branch claude/project-thread-uh34sg: rooms discharge on each type's own calendar (`SG-GQ-no-turnover` row deleted) and Medicaid-style programs reach only institutional rooms that their own rule serves (`SG-GQ-means-tests-poverty` row deleted, part 2 of laws-group-quarters-means-tests). `src/core2/group-quarters.test.ts` is red at Storrs and Charlotte Amalie on the clean train with the same seed (a room grows from 2 to 3 people), not from this change.
