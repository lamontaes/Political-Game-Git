---
id: economy-outside-money-loop
title: "A town's outside account drifts by about a billion dollars a year: find the flow that never comes back"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Algiers, Vermont (5001035, seed r7), a town of about 100 workers whose firms sell about 25 million dollars a year, the cash journal's outside-market account for the place nets minus 1.39 billion dollars in the first year, minus 2.59 billion by year 2 and minus 3.76 billion by year 3, against gross incoming and outgoing of about 6.9 trillion dollars (scripts/world-proofs/outside-money.ts r7 5001035 3). The same drift exists on dd9a4417, before the trade-area change, so that change did not cause it. The Dev Tester found the same pattern as 11.7 to 19.1 billion dollars of cash per town (Nov 8), first found Oct 12 (docs/reports/world-drift-2026-10-12.md).

**Rules.** Standing rules: find the engine that owns the flow and fix it there (one engine per mechanic), replace never layer, every cut corner a registered stopgap, wire to the world: the fix is proved by the town's cash and the outside balance together in a played world. Money is conserved: what a town takes in from outside it pays back out or holds as a recorded stock.

**Done when.** In a played year in Algiers VT (5001035, seed r7) and a place drawn from all 56 (name the place and seed), the outside account's net is within one percent of the town's gross sales to outside buyers for the year, its gross incoming and outgoing are within the order of the town's firms' yearly demand plus wages, and the largest outside owners are listed by record id with the flow that explains each; the proof script prints the same numbers before and after.

**Files.** src/core2/journal-state.ts, src/core2/modules/residents.ts, src/core2/opening-outside-market.ts, scripts/world-proofs/outside-money.ts

**Notes.** Jobs and economy, Nov 8. Not started. Facts already measured: net by year, gross in and out, the largest owners (outside-market account for the place about 1.2 billion dollars a year; the federal government outside account about 0.5 billion) and the baseline on dd9a4417 within 0.2 percent of main. The gross being about 280 times the town's yearly demand points at a weighting (the count scale a counted household or firm stands for) applied twice, or flows through the outside account that are not the town's; the first thing to try is the receipts by reason key for that one account over a month.
