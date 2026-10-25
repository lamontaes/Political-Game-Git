---
id: people-full-women-births-without-couples
title: "A full woman with no recorded partner has no way to have a birth: 26 of 990 full women aged 15 to 49 are in the couples table, and full births are about ten times below the CDC rates"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-full-couples-plan-share-fell
source: added with npm run pool -- add
---

**What.** Measured Oct 20 in three drawn places over one year: 990 full women aged 15 to 49, 3 births, against about 38 from the CDC 2024 age rates (data/research/renewal/natality-2024.json). The full tier has mostly one-person households (1,641 of 1,674 in Camden, Tennessee) and 21 partner links, so only women in the renewal engine's couples table (a partner link between two living people in one household) can plan a birth. Let a full woman with no recorded partner plan a birth from her own age, money, health and drives, with the other parent unrecorded, so full births by age band follow the same rule as the counted women's; or give the full tier partners at the opening. The owner's call on which is the question in people-full-couples-plan-share-fell.

**Rules.** No dice: the plan follows the woman's own records, never a percentage; CDC rates check totals only. One model, two tiers: a full woman is a consistent member of the counted group she stands for. Replace, never layer: one planning path for a woman with or without a partner.

**Done when.** In a one-year buildBenchWorld run in three drawn places (named, with seeds), full women's births per thousand by 5-year age band are within the CDC band rate's spread, shown by person-birth record ids, and a test in src/core2/births-plan.test.ts or a new births-full-coverage test states the share of full women aged 20 to 39 who can plan a birth.

**Files.** src/core2/modules/renewal.ts,src/core2/births-plan.ts

**Notes.** TODO
