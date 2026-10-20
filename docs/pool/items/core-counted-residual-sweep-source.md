---
id: core-counted-residual-sweep-source
title: "Find and key the money that reaches a place's residents account unkeyed and is swept to its groups by their people each month"
area: core
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/residual-sweep-source
pr: #5356
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:06:41.241Z
---

**What.** In a one-year run of the played world in Woodway, Texas (seed ab12cd34ef56ab12), the place's counted groups were swept about 7.6 to 8.0 million minor units every month from the residents account's residual, split by their people rather than keyed to the households the money belongs to (SG-CORE-counted-unkeyed-money). Some engine pays the residents account directly with no person or household. Find the payer by logging transfers into the residents account's residual in that run, and make that engine pass the person or household through `transferCash` or `countedPayment`. Unemployment benefits were the other unkeyed payer (299 payments, about 109 thousand) and now pass the claimant (first slice, PR #5217); 32 payments to claimants who are not counted still land unkeyed.

**Rules.** One model, two tiers: a counted group is paid the same dollars as a full person, times its count, through keyed accounts. Replace, never layer: the sweep keeps running only until the last unkeyed payer is keyed, then it is deleted with the stopgap row. Wire to the world: prove it in a generated world, not a hand-built one.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) `sweepResidual` finds nothing to sweep in any month, named by transfer record ids, the ledger balances, the test in src/core2/counted-money.test.ts covers the keyed payer, and SG-CORE-counted-unkeyed-money is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/counted-money.ts, src/core2/world-transfer.ts, src/core2/data/stopgaps.json

**Notes.** From world-stopgap-counted-money-faked-mechanic. Measured Oct 19 with a temporary counter on the two unkeyed sites; the sweeps were monthly and about equal in size, so the payer is a monthly flow. A counter on transfers into residual accounts caught every organization's residual, so filter to organizations of kind residents.
