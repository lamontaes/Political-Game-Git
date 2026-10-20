---
id: people-full-couples-plan-share-fell
title: "Full couples plan a child in 1.6 percent of active couples on current main, against 12.2 percent a day earlier"
area: people
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/couples-plan-share
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T17:50:57.862Z
---

**What.** Measured Oct 20 in births-full-web.test.ts: of 191 active couples in 12 drawn places three plan a child on a typical day (1.6 percent), against 518 couples in 12 places with 12.2 percent planning when renewalWebWeight was fitted a day earlier. Most active couples now have a mother far outside childbearing age (the age term of the plan score averages -2.96 of a possible -4 to +4), and among couples whose age term is above -2 (40 of 250 in 16 places) 52 percent plan. Find what changed the couples table or the age term (more older couples in the table, a different age center, counted women moving out) and decide whether full-tier births are now too few, using the CDC birth rate by age as the check on totals.

**Rules.** No dice: the plan share follows the couples' own ages, money, health and tie, never a percentage; real birth rates check totals only. One model, two tiers: the full couples' births must stay in line with the counted women's by age.

**Done when.** In a one-year buildBenchWorld run in three drawn places (named, with seeds), full couples' births per thousand women by age band fall within the CDC natality rate for that band's spread, and the share of active couples with a mother aged 20 to 39 who plan a child is reported with the couples' record ids.

**Files.** src/core2/births-plan.ts,src/core2/modules/renewal.ts,src/core2/births-full-web.test.ts

**Notes.** Measured Oct 20 (buildBenchWorld, one year, three places drawn from `drawPlace("fb1:i", "full-births")`: Elsinore, Utah (4922650, seed c5489068…), Camden, Tennessee (4710560, seed e238c846…), Columbia, California (0614904, seed 55d0794d…)). Full women aged 15 to 49 at the start: 990. Births to them in the year: 3. CDC 2024 age rates (`data/research/renewal/natality-2024.json`) would give about 38 for the same women by band, so full-tier births are about ten times too few (30 to 34: 185 women, 2 births against 17 expected).

The cause is not the plan score or its age term. The full tier is 1,750 people in 1,674 households in Camden, and 1,641 of those households have one member; there are 21 partner links in all. Of 229 full women aged 25 to 44 there, 4 have a partner. A birth can only be planned by a couple in the renewal engine's `couples` table, which is built from partner links between two living people in one household (`initialize` in `src/core2/modules/renewal.ts`), so 26 of 990 full women are in an active couple and the rest cannot have a birth at all. The fall from 518 couples to 191 is the smaller full tier, not a changed age term; the plan share among couples with a mother 20 to 39 is high (52 percent plan), as the item found.

OWNER DECISIONS NEEDED: should a full woman with no recorded partner be able to have a birth, as the counted women do by age (a single or cohabiting parent), or should the full tier be given partners at the opening? Either changes what a full household looks like; the engine work is filed as `people-full-women-births-without-couples` and does not start until this is decided or the simplest version (a woman with no partner plans from her own age, money, health and drives, with the other parent unrecorded) is accepted.
