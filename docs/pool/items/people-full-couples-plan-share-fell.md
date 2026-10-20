---
id: people-full-couples-plan-share-fell
title: "Full couples plan a child in 1.6 percent of active couples on current main, against 12.2 percent a day earlier"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #5738
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Measured Oct 20 in births-full-web.test.ts: of 191 active couples in 12 drawn places three plan a child on a typical day (1.6 percent), against 518 couples in 12 places with 12.2 percent planning when renewalWebWeight was fitted a day earlier. Most active couples now have a mother far outside childbearing age (the age term of the plan score averages -2.96 of a possible -4 to +4), and among couples whose age term is above -2 (40 of 250 in 16 places) 52 percent plan. Find what changed the couples table or the age term (more older couples in the table, a different age center, counted women moving out) and decide whether full-tier births are now too few, using the CDC birth rate by age as the check on totals.

**Rules.** No dice: the plan share follows the couples' own ages, money, health and tie, never a percentage; real birth rates check totals only. One model, two tiers: the full couples' births must stay in line with the counted women's by age.

**Done when.** In a one-year buildBenchWorld run in three drawn places (named, with seeds), full couples' births per thousand women by age band fall within the CDC natality rate for that band's spread, and the share of active couples with a mother aged 20 to 39 who plan a child is reported with the couples' record ids.

**Files.** src/core2/births-plan.ts,src/core2/modules/renewal.ts,src/core2/births-full-web.test.ts

**Notes.** TODO
