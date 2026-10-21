---
id: core-older-workers-full-vs-counted-gap
title: "People 62 to 74 work at 89 percent among full people and 5 percent among counted ones in the same played town (Cedro, New Mexico seed 6688ecf3)"
area: core
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/older-workers-tiers
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T10:00:33.519Z
---

**What.** In buildBenchWorld one year after the opening, Cedro, New Mexico (key 3513450, seed 6688ecf3fa1f22a83b3c21db8f19f866d6b21ebfd85a86b0623a3a7221c5c248) has 203 of 231 full people aged 62 to 67 working, 88 percent, but only 11 of 115 counted people of that age, 10 percent; Pagai, American Samoa shows 200 of 209 and 4 of 18, and Columbus, Kentucky 182 of 197 and 0 of 38. Real participation is about 57 percent at 62 to 64 and 26 percent at 65 to 69 (BLS CPS 2019). One model, two tiers says a counted group works at the rate the same rule gives a full person, so one tier is wrong. Find where the opening seeds each tier's older workers and which one departs from the records, and fix it at the cause.

**Rules.** One model, two tiers: the counted group is read by the same rule as a full person, times its count. Estimate, never UNKNOWN: the starting share comes from the real average by age with a per-world spread. No dice.

**Done when.** In a drawn place and seed named in the PR body, buildBenchWorld one year in shows the working share of people 62 to 67 within 8 points between full and counted people, and each within the BLS CPS band for the age, shown by job record ids, with a test that names the place and seed.

**Files.** src/core2/modules/jobs.ts, src/core2/opening-employment.ts, src/core2/modules/residents.ts

**Notes.** Found Oct 21 fitting jobsRetireWebWeight (web-calibrate-labor-participation). Measured with a one-year paired run: the weekly-minutes share of counted residents (countedResidents) against full people with an open job. The weekly-minutes measure may undercount counted workers whose commitments are not scheduled, so first check that the measure is fair.
