---
id: core-older-workers-full-vs-counted-gap
title: "People 62 to 74 work at 89 percent among full people and 5 percent among counted ones in the same played town (Cedro, New Mexico seed 6688ecf3)"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In buildBenchWorld one year after the opening, Cedro, New Mexico (key 3513450, seed 6688ecf3fa1f22a83b3c21db8f19f866d6b21ebfd85a86b0623a3a7221c5c248) has 203 of 231 full people aged 62 to 67 working, 88 percent, but only 11 of 115 counted people of that age, 10 percent; Pagai, American Samoa shows 200 of 209 and 4 of 18, and Columbus, Kentucky 182 of 197 and 0 of 38. Real participation is about 57 percent at 62 to 64 and 26 percent at 65 to 69 (BLS CPS 2019). One model, two tiers says a counted group works at the rate the same rule gives a full person, so one tier is wrong. Find where the opening seeds each tier's older workers and which one departs from the records, and fix it at the cause.

**Rules.** One model, two tiers: the counted group is read by the same rule as a full person, times its count. Estimate, never UNKNOWN: the starting share comes from the real average by age with a per-world spread. No dice.

**Done when.** In a drawn place and seed named in the PR body, buildBenchWorld one year in shows the working share of people 62 to 67 within 8 points between full and counted people, and each within the BLS CPS band for the age, shown by job record ids, with a test that names the place and seed.

**Files.** src/core2/modules/jobs.ts, src/core2/opening-employment.ts, src/core2/modules/residents.ts

**Notes.** Found Oct 21 fitting jobsRetireWebWeight (web-calibrate-labor-participation). Measured with a one-year paired run: the weekly-minutes share of counted residents (countedResidents) against full people with an open job. The weekly-minutes measure may undercount counted workers whose commitments are not scheduled, so first check that the measure is fair.

Oct 21 (claude, claude/older-workers-tiers): the measure was not fair. The full count (203 of 231 in Cedro) is mostly officials, aides and press staff of other places, who exist because they hold a job; the counted count (115) includes other places' counted people, whom the opening never employs. In the town only, same place and seed: at the opening full 8 of 12 (67 percent) and counted 22 of 29 (76 percent), within 9 points; a year in, full 7 of 28 and counted 7 of 12 by open job (11 of 12 by scheduled minutes). Two causes remain, neither the gap this item names: (1) the opening's recorded work history employs nearly everyone aged 62 to 64 (Cedro's receipt: 16 of 16 recorded against a target of 7 from ACS 48 percent; 65 to 69: 14 recorded against 9), and opening-employment.ts adds jobs up to a cohort's target but never trims recorded jobs above it, so both tiers open above the BLS band; (2) the full people in town aged 62 to 67 grew from 12 to 28 over the year while those working fell from 8 to 7, so people filled in from the counts may arrive without the job their record held; check fill-in against the record before anything else. Measure only residents of the town (lawChain townPlaceId) in both tiers.

Oct 21 (claude, second pass): fill-in is not the cause. In Nicholson, Mississippi (2851840, place seed 77cb636c6c78255762e4f29364563a81b80c771f576c9b87d56763d9924c8aeb), every fill-in over a year was logged at `fillInPerson` (state.ts). Of the 13 people aged 62 to 67 filled in, 10 carried their open counted job into core.jobs. The other 3 had jobs the counted books ended before the fill-in (`endCountedJob`, e.g. work-relationship_36a1cfdf7ec81107 ended 2025-04-01, filled in 2025-09-17). In 92 fill-ins over 200 days, none held a counted job hired since the opening that the household record missed. The tier gap is who becomes full, not a rule: full people in a town are officials, staff, the player's circle, and counted residents out of work who bring a constituent case (constituent-cases.ts `countedOutOfWork` fills them in). In town at the opening, counted people aged 62 to 67 work at 40 percent (88 of 218), the BLS blend for the band; full people at 78 percent (14 of 18). Proposed done-when: the counted tier's working share by age within the BLS CPS band one year in, and the full tier measured only among people filled in from the counts, compared with their own counted share at fill-in.

Oct 21 (claude, third pass, not built): the item's premise does not hold as worded, and the PR that touched it is #5776 (retirement web term on both tiers, merged work or in review). Full and counted people at 62 to 67 differ in who they are, not in the rule that retires them: both tiers now read the same `retireWebTerm`. What remains is one cause worth its own item: for a cohort aged 62 to 64 the recorded work history can employ everyone against an ACS target near half (Cedro, 16 of 16 against 7), and `opening-employment.ts` raises a cohort to its target but never lowers it. Whether to end recorded jobs of named people at the opening is a design call (it rewrites their past), so it is filed as an owner decision rather than built. Sharpened done-when for a builder: in a drawn place and seed, the share of town people aged 62 to 67 at work one year in, per tier among residents only, within the BLS CPS band for the age, with fill-in compared with each person's own counted share at fill-in. Claim released.
