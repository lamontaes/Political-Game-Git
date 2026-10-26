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

**Done when.** In Prescott, Michigan (seed a91c03e7d2b84f10) and one drawn place, the sales tax's counted reach stands for no more people than the town's counted residents, the count matches what the price engine counts for the same households, and the PR names the cause of the 5,845 by file and line. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Time box.** 3 hours. Model: Sonnet, no helpers.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-people.ts

**Notes.** Found by the laws lead on Oct 24 while writing the prices family PR body.

Laws lead, Oct 26: the prices family's runs on the own-payment checker show the same in both audit towns, and for the cannabis law too. The sales tax's counted reach is 5,044 people in Prescott and 3,132 in Uehling. Legal cannabis sales reach 277 and 231. The towns have 216 and 188 residents (Census, 2020-2024 estimates), and the other price engine laws reach 125 to 136 people in each. Run files: docs/reports/law-wiring/families/prices-year-US-MI-2666300.json and prices-year-US-NE-3149425.json on claude/laws-nine-links-prices (PR #5986).

Laws lead, Oct 26 (07:50 UTC): the grocery exemption over-counts the same way. In the control worlds where it is in force at the opening, its counted groups stand for 5,044 people in Prescott (46 groups) and 3,106 in Uehling (35 groups); enacted in Colome, South Dakota (260 residents), its 224 named people and 2 groups for 171 people make 395 (`docs/reports/law-wiring/families/prices-year-*.json`, PR #5986).
