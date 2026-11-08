---
id: economy-outside-money-loop
title: "A town's outside account drifts by about a billion dollars a year: find the flow that never comes back"
area: world
kind: bug
priority: 2
size: M
status: open
lead: money
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

**Notes (Money, Nov 8, evening).** First answer to "receipts by reason for that one account": `npx tsx scripts/money/outside-flows.ts money-1 4763340 1` (Ripley, TN, seed money-1, one year, every `accounts.transfer` into or out of the place's outside market, in dollars): treasury-spending in 5.96 trillion, treasury-interest in 0.92 trillion, outside-revenue out 4.32 trillion, federal-borrowing out 0.90 trillion, treasury-tax out 0.79 trillion. The town's own flows through the same account are tiny beside them: landlord-payout 164 thousand, parent-sweep 237 thousand, official.living 174 thousand, reserve-sweep 15.7 million. So the gross is the U.S. Treasury's national budget flowing through the one outside account the place also uses, not a weighting applied twice. Two smaller outside markets for the same place drift by about 230 and 144 million dollars a year in a straight line (outside.ts over four years), and none of that passes through `accounts.transfer` (the counted flows post through `transferSplit`); a trace at that level is the next step. Next: give the national treasuries their own outside account (see `core-treasury-settles-with-outside-market`) and measure the place's outside net without them. Also found while running Ripley: a crash in year 4, filed as `lives-partnership-movein-keeps-only-children`.
