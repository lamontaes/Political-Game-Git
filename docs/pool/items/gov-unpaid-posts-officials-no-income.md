---
id: gov-unpaid-posts-officials-no-income
title: "Officials in posts with no salary row, and the election chief, live on no income: a territory's attorney general and board of education members and a state's election chief take in nothing in 70 days"
area: gov
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/unpaid-posts-s6
pr: #5043
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T03:41:08.125Z
---

**What.** Some officials hold a post that pays nothing, so they and their household take in no money at all. In the played world (`buildBenchWorld`, 70 days from the opening) San Jose, Tinian, Northern Mariana Islands (seed 74a3bf7c4304868c) has a territory attorney general and a board of education member with no salary row and no job, and the election chief of Northern Mariana Islands and of American Samoa (Pago Pago, seed e5) has a job its budget line cannot pay (`startPublicJob` returns nothing for a post "its line cannot pay at all"). The salary table has no figure for an office it lacks, so `seat()` in the official pay module keeps a household on no pay. Decide for each such post what the person lives on (a salary row for the office, a stipend, or another job they keep as part-time officials do) and give them it, with the source.

**Rules.** Estimate, never UNKNOWN: a post's pay starts from the real figure or the closest office's, marked with its source and spread. An effect is a read, not a record: the pay is paid through the payroll or the official pay engine and shows on the journal. One rule, all 56 places: the check draws its place from all of them and names the place and seed.

**Done when.** In the played world (`buildBenchWorld`, the drawn places San Jose, Tinian and Pago Pago with the seeds above, and one random place) every seated official and every state election chief receives money by journal record id within 70 days, and the guard in `src/core2/official-pay-cabinet.test.ts` loses its exception for them.

**Files.** src/core2/modules/official-pay.ts, src/core2/modules/executive.ts, data/research/offices/official-salaries-2026.json

**Notes.** TODO

Built Oct 18 (claude/unpaid-posts-s6): a statewide post the salary table has no figure for takes 0.8 of the governor's pay as an estimate (the share the table already uses for secretary of state and treasurer), so a territory's attorney general and board of education members are paid. The election chief is not fixed here: its line is overcommitted, filed as `gov-territory-administration-line-overcommitted`.

**Notes.** Found Oct 18 (claude, claude/jobless-no-income-s6) by listing households with no income in 70 days across seven drawn places; the four states drawn showed none of these, only the territories. The cabinet was the one kind fixed in that branch.
