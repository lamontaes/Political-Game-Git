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
---

**What.** In buildBenchWorld one year after the opening, Cedro, New Mexico (key 3513450, seed 6688ecf3fa1f22a83b3c21db8f19f866d6b21ebfd85a86b0623a3a7221c5c248) has 203 of 231 full people aged 62 to 67 working, 88 percent, but only 11 of 115 counted people of that age, 10 percent; Pagai, American Samoa shows 200 of 209 and 4 of 18, and Columbus, Kentucky 182 of 197 and 0 of 38. Real participation is about 57 percent at 62 to 64 and 26 percent at 65 to 69 (BLS CPS 2019). One model, two tiers says a counted group works at the rate the same rule gives a full person, so one tier is wrong. Find where the opening seeds each tier's older workers and which one departs from the records, and fix it at the cause.

**Rules.** One model, two tiers: the counted group is read by the same rule as a full person, times its count. Estimate, never UNKNOWN: the starting share comes from the real average by age with a per-world spread. No dice.

**Done when.** In a drawn place and seed named in the PR body, buildBenchWorld one year in shows the working share of people 62 to 67 within 8 points between full and counted people, and each within the BLS CPS band for the age, shown by job record ids, with a test that names the place and seed.

**Files.** src/core2/modules/jobs.ts, src/core2/opening-employment.ts, src/core2/modules/residents.ts

**Notes.** Found Oct 21 fitting jobsRetireWebWeight (web-calibrate-labor-participation). Measured with a one-year paired run: the weekly-minutes share of counted residents (countedResidents) against full people with an open job. The weekly-minutes measure may undercount counted workers whose commitments are not scheduled, so first check that the measure is fair.

Oct 21 (claude, claude/older-workers-gap), measured, not fixed. At the default size (no Census scale) Cedro, New Mexico (3513450, seed 6688ecf3fa1f22a83b3c21db8f19f866d6b21ebfd85a86b0623a3a7221c5c248; town `jurisdiction_1c1164e9a882a4fc`, 126 full people) the item's numbers do not reproduce, so they come from the Census-scale opening. Through `reachOf` (src/core2/counted-reach.ts) people aged 62 to 67 working: at the opening full 8 of 11, counted 22 of 22; a year on full 7 of 26, counted 8 of 9. Three things to settle before changing anything: (1) `reachOf` counts a counted person as working when they hold a counted job or take a share of the household's `unplacedWorkers`, so "22 of 22" is not 22 held jobs; compare held jobs only. (2) The full 62 to 66 share across every place in the world is 172 of 193 (89 percent) at the end of a year, which includes people outside the town; measure the town's own full people. (3) The full group's size went from 11 to 26 in a year while counted fell from 22 to 9, so counted people are being filled in, and 4 of 17 full people aged 62 to 66 who were not full at the opening hold a job (some are simply aging in). Check that a filled-in person keeps the group's job and pay (AGENTS.md "Keep it simple": a filled-in person must match what the records already say).
