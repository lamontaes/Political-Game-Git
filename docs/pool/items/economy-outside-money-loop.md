---
id: economy-outside-money-loop
title: "A town's outside account drifts by about a billion dollars a year: find the flow that never comes back"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
lead: money
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: high
root: design-one-model-two-tiers
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** In Algiers, Vermont (5001035, seed r7), a town of about 100 workers whose firms sell about 25 million dollars a year, the cash journal's outside-market account for the place nets minus 1.39 billion dollars in the first year, minus 2.59 billion by year 2 and minus 3.76 billion by year 3, against gross incoming and outgoing of about 6.9 trillion dollars. The same drift exists on dd9a4417, before the trade-area change, so that change did not cause it. The Dev Tester found the same pattern as 11.7 to 19.1 billion dollars of cash per town (Nov 8), first found Oct 12 (docs/reports/world-drift-2026-10-12.md). Money's trace (Nov 8) shows the gross is the U.S. Treasury's national budget flowing through the same outside account, and the town's real drift is counted households' unplaced pay arriving far above what their modeled budget spends outside. Guards: the town's money totals, where about a billion dollars a year goes missing from the outside account; no player opens that account, but the town's economy drifts with it.

**Cause.** Measured: `npx tsx scripts/money/outside-flows.ts money-1 4763340 1` (Ripley, Tennessee, seed money-1) and `scripts/world-proofs/outside-money.ts r7 5001035 3` (Algiers, Vermont, seed r7). In Ripley the two smaller outside markets take in about 360 million dollars a year as `work.unplaced-residents` (`src/core2/modules/residents.ts` line 571) and pay back about 35 million (`household.outside-living-costs`, line 240).

**Fix.** Give a counted household group one budget (income, taxes, housing, everyday costs, health, savings) by the same rule as a named household, so unplaced pay is spent where real households spend it. Give the national treasuries their own outside account (see core-treasury-settles-with-outside-market). Re-run the outside-money proof until the outside net matches gross sales to outsiders.

**Time box.** 12 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Standing rules: find the engine that owns the flow and fix it there (one engine per mechanic), replace never layer, every cut corner a registered stopgap, wire to the world: the fix is proved by the town's cash and the outside balance together in a played world. Money is conserved: what a town takes in from outside it pays back out or holds as a recorded stock.

**Done when.** A second session runs a played year in Algiers, Vermont (5001035, seed r7) and in a place drawn from all 56 (name and seed written down) and finds the outside account's net matching the town's gross sales to outside buyers for the year, its gross incoming and outgoing on the order of the town's firms' yearly demand plus wages, and the largest outside owners listed by record id with the flow that explains each. The proof script prints the same numbers before and after, and the counted households' unplaced pay is spent by their group budget, shown by record id.

**Waits on.** Nothing to start. Read core-country-tier-town-joins-its-state and its parts first: they replace the outside markets' buyers with the state's sectors and count the town inside its state. Build this on that code if it has merged, and say in the pull request which parts were on main.

**Files.** src/core2/journal-state.ts, src/core2/modules/residents.ts, src/core2/opening-outside-market.ts, scripts/world-proofs/outside-money.ts, scripts/money/outside-flows.ts

**Notes.** Jobs and economy, Nov 8. Not started. Facts already measured: net by year, gross in and out, the largest owners (outside-market account for the place about 1.2 billion dollars a year; the federal government outside account about 0.5 billion) and the baseline on dd9a4417 within 0.2 percent of main. The gross being about 280 times the town's yearly demand points at a weighting (the count scale a counted household or firm stands for) applied twice, or flows through the outside account that are not the town's; the first thing to try is the receipts by reason key for that one account over a month.

**Notes (Money, Nov 8, evening).** First answer to "receipts by reason for that one account": `npx tsx scripts/money/outside-flows.ts money-1 4763340 1` (Ripley, TN, seed money-1, one year, every `accounts.transfer` into or out of the place's outside market, in dollars): treasury-spending in 5.96 trillion, treasury-interest in 0.92 trillion, outside-revenue out 4.32 trillion, federal-borrowing out 0.90 trillion, treasury-tax out 0.79 trillion. The town's own flows through the same account are tiny beside them: landlord-payout 164 thousand, parent-sweep 237 thousand, official.living 174 thousand, reserve-sweep 15.7 million. So the gross is the U.S. Treasury's national budget flowing through the one outside account the place also uses, not a weighting applied twice. Two smaller outside markets for the same place drift by about 230 and 144 million dollars a year in a straight line (outside.ts over four years), and none of that passes through `accounts.transfer` (the counted flows post through `transferSplit`); a trace at that level is the next step. Next: give the national treasuries their own outside account (see `core-treasury-settles-with-outside-market`) and measure the place's outside net without them. Also found while running Ripley: a crash in year 4, filed as `lives-partnership-movein-keeps-only-children`.

**Notes (Money, Nov 8, night): the drift's source, at the `transferSplit` level.** Same run (Ripley, TN 4763340, seed money-1, one year, every posting into or out of each outside market, in dollars; temporary hook in `accounts.ts` `transfer` and `transferSplit`, not committed): the two smaller markets lose **218 million** and **140 million** dollars to `work.unplaced-residents` (the wages of counted workers whose jobs the game does not model, paid from the outside market into the town's resident groups), and take back only 4.4 and 3.7 million (`residents.counted-departure.cash`). On the place's own market, the households' total outside living cost is 10.8 million (`household.outside-living-costs`) and their outside purchases 24 million (medical, premiums). So about 360 million dollars a year of unplaced pay comes in and about 35 million goes back out: counted households earn far more than their modeled budget spends outside the town, and what is left piles up as group savings or in the treasuries. That is the one household budget (queue item 3): income, taxes, housing, everyday costs, health, charges and savings for a counted group by the same rule as a named household, with savings that earn and spend, so the pay that arrives is spent where real households spend it. Not a weighting error and not a leak in the journal. The temporary hook is saved in Money's scratch (`/tmp/money-trace.patch`); recreate it by adding `globalThis.__moneyTrace?.(input)` as the first statement of `transfer` and `transferSplit`.
