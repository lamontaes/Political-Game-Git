---
id: gov-stopgap-budgets-faked-mechanic
title: "Stopgaps in budgets (faked-mechanic): 3 open"
area: gov
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
after: world-commuters-in-opening
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/budgets.ts, kind faked-mechanic"
claimed-at: 2026-10-16T02:50:32.882Z
---

**What.** Three faked-mechanic stopgaps remain in `budgets.ts`. SG-GOV-outside-revenue-monthly (the monthly twelfth plug) is owned by the gov-outside-revenue-* items and the retire-plug item, so leave that row to them. The other two are SG-WORLD-withholding-outside-governments, where income tax owed to a government with no treasury in the world is never withheld, and SG-WORLD-withholding-nonresident-local, where a worker who lives outside the town pays no county or city income tax for working there. Build both so a paycheck withholds tax to every government that taxes it. The player would notice a commuter's take-home pay dropping for the town's income tax and a worker paid out of state having the right tax taken.

**Rules.** Placeholders: a stopgap row is closed only by the replacement, never by deleting the row; An effect is a read, not a record: withholding reads the law at the worker's residence and workplace on each paycheck; One rule, all 56 places: tax chains are law data for all 56 places and no state or city is named in code; One model, two tiers: counted workers are withheld by the same rule as full ones times their count; The chain is the acceptance: follow one commuter's paycheck to the withholding and the receiving treasury or outside obligation; No dice: residence and workplace decide the tax, never a roll; Estimate, never UNKNOWN: a missing nonresident rate starts from the real average marked ESTIMATED with source and spread; Replace, never layer: the not-withheld branch is deleted in the same change; Speed: the workplace chain is cached per employer, not resolved by scanning each day.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a worker living outside the town and working in it has the nonresident local rate withheld, and a worker owing another state has tax withheld to an obligation-backed outside flow; the two rows close in `stopgaps.json`. Tests in `src/core2/budgets.test.ts`. The owner plays it: takes a job across the county line and sees two taxes on the pay stub.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/employer-taxes.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps.json

**Notes.** Claimed and released (Oct 15): in a played world of three drawn places (Zurich, Montana; Santo Domingo, Puerto Rico; Renovo, Pennsylvania) the two-level opening has about 30 full people living in the town and none who live elsewhere and work for a town employer. Every full worker's residence is the town, and the rest of the town is counted, so neither withholding branch can fire in play and neither can be proved there. Build world-commuters-in-opening first. The mechanism for the outside-government branch is already in the journal: the withholding record can authorize its own outside flow (externalFlowAuthorizations, requiredRelatedRefs and relatedRecords on the withholding slot), and the nonresident rate is in the local income tax rows (terms.nonresidentRate).

First row: Each month, a state, county, city or federal treasury receives from the town's outside account an even twelfth of the yearly revenue no flow in the game pays (state and federal aid come from the treasury above it), and p

**Split (Oct 16).** Three rows in the budgets module: the even monthly outside revenue is replaced by real payers in `gov-outside-revenue-taxes`, `-fees`, `-aid`, `-borrowing`, `gov-outside-spending-payees` and retired by `gov-outside-revenue-retire-plug`; the nonresident local tax is `world-withholding-nonresident-local`; the untaxed outside governments is `world-withholding-outside-governments`. This item is done when those are.

Oct 20: The Oct 16 claim has no PR and is over two days old, so the claim is cleared.

Oct 20: Switched from blocked to the automatic after: gate on world-commuters-in-opening, so it opens by itself the moment those items are done.
