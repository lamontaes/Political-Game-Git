---
id: gov-campaign-day-test-nobody-can-file
title: "campaign-day-controls.test fails in some places: none of the five richest adults aged 35 or more can file"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: #5180
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/bench/campaign-day-controls.test.ts` picks the five richest living adults aged 35 or more and tries each against every open contest. In some places none can file, so the test stops at "the player could file for nothing" before it checks anything. It failed on main with GOLDEN_PATH_SEED=t4 (Ridgeway, Missouri, US-MO 2961904) and with t3 and t5 in other places. The test should draw its candidate from people who can file, not from the richest.

**Rules.** One rule, all 56 places: the check draws a place and names it, and tunes no seed. No dice: who can file follows the filing rules, so the test asks the eligibility check instead of guessing by wealth.

**Done when.** The test passes in the same drawn places and seeds t3, t4 and t5 (the first test, "shows the day's choices"), and a new check in the test file proves it picks its candidate with the eligibility check, run in a drawn place with the seed named in the PR body.

**Files.** src/bench/campaign-day-controls.test.ts

**Notes.** Found while adding the interview-told test in the same file.
