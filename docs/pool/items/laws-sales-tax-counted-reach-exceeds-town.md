---
id: laws-sales-tax-counted-reach-exceeds-town
title: "The sales tax's counted reach in Prescott stands for 5,845 people in a village of about 260"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the laws lead's Oct 24 prices regrade, the sales tax and the grocery exemption reach 35 counted groups standing for 5,845 people in Prescott, Michigan (2666300, seed a91c03e7d2b84f10), through src/core2/law-reach/group-b.ts:229. The price engine's laws in the same town reach 23 named households and 34 counted groups standing for 167 people, and the village has about 260 residents. In Uehling, Nebraska the same sales-tax reach counts 145 people, which fits the town. Either the counted residents group-b reads for Prescott include people outside the town, or their scale is applied twice. The run files are docs/reports/law-wiring/families/prices-US-MI-2666300.json on branch claude/laws-nine-links-prices.

**Rules.** One model, two tiers: a counted group stands for the people it counts, once, and every engine reads the same count. One rule, all 56 places: the fix may not name Prescott or Michigan. Ask why: the PR names the cause by file and line.

**Done when.** In Prescott, Michigan (seed a91c03e7d2b84f10) and one drawn place, the sales tax's counted reach stands for no more people than the town's counted residents, the count matches what the price engine counts for the same households, and the PR names the cause of the 5,845 by file and line.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-people.ts

**Notes.** Found by the laws lead on Oct 24 while writing the prices family PR body.
