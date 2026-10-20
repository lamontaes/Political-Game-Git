---
id: world-jobless-households-no-income
title: "Households with no job and no cash have no income at all: 9 of the 20 largest living-cost arrears in a Utah town hold nothing and receive no pay or benefit"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/jobless-no-income-s6
pr: #5042
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T03:16:47.539Z
---

**What.** In three towns drawn (Murphy, Idaho; Timberwood Park, Texas; Bay Pines, Florida; the played world from January 20, 2025 for 90 days, seeds n1 to n3) 61, 62 and 63 of about 1,700 full households, 3.6 to 3.8 percent, held no cash at the start and received no money at all in 90 days: no pay, no benefit and no transfer. About a quarter of them (12 to 19 a town) have only people 65 or older, and the rest have an adult under 65 and no job. Both groups are real in life, so the number is not obviously wrong: the American Community Survey puts the share of households with no income at roughly 3 to 4 percent (not yet checked against its table for each of these states). What is left to settle is whether those households live on nothing in the game. Each is paid no retirement award, unemployment, SNAP or other benefit, and holds no savings to spend.

**Rules.** Estimate, never UNKNOWN: the share of households with no income starts from the ACS figure for the place with its source and spread, and is checked against it. No dice: a household's benefits follow the law in force and its members' records. One rule, all 56 places.

**Done when.** In the played world (`buildBenchWorld`, the drawn places Murphy, Timberwood Park and Bay Pines with seeds n1 to n3, and one random place) the share of full households with no income in 90 days is printed against the ACS share for that place, and a test in `src/core2/` states the comparison and names the place and seed; any household of people 65 or older with no award is listed by id with the reason.

**Files.** src/core2/modules/residents.ts, src/core2/modules/law-reach, src/core2/data/

**Notes.** Measured Oct 17 (claude) with a wrapper on `api.postJournal` summing positive postings by member account, for full households whose members held $0 at the start. The Utah town in the item's title was not reproduced; its seed was not recorded. The living-cost arrears this causes are `world-households-unpaid-living-costs-payday` and `world-living-costs-pay-from-household-members`.
