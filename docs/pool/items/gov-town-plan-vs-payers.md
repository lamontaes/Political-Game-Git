---
id: gov-town-plan-vs-payers
title: "A town collects several times its planned revenue: its Census-scaled plan and what its laws and payers raise disagree"
area: gov
kind: bug
priority: 2
size: M
status: open
lead: legislation
claimed-by:
pr:
blocked-on:
source: Money, Nov 9; scripts/money/collected.ts
claimed-at:
---

**What.** Wooster, Indiana (key 1885562, seed money-1): the town's treasury took in 0.53 B (units of 100 million minor, credits on the cash journal) in 2026 against a planned revenue of 0.14 B, a ratio of 3.7; the state (1.014) and the county (1.016) are near 1. The town's plan is the Census fiscal-2022 per-resident line times its residents; its income is what the town's laws (property, sales, income taxes and charges) raise from its modeled payers. They should agree to within the spread of real towns. Until they do, the town's spending cannot be voted from its receipts (SG-GOV-spending-vote-state-county).

**Rules.** Wire to the world: the town's plan and its receipts come from the same laws and payers, so a vote reads one record of what the town raised, proven in a generated world. One rule, all 56 places: the reconciliation runs in drawn places and names no place in code. Estimate, never UNKNOWN: a plan figure the town's payers cannot support is a registered estimate with its source and spread, and real ranges are checked against, never steered to.

**Done when.** At three drawn places and seeds (named in the PR body), `npx tsx scripts/money/collected.ts <seed> 2` shows a town's collected over planned in a full year within the spread real towns show, with the cause named by record id.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/data/budgets/

**Notes.** Money, Nov 9: measured while building the receipts tally for the spending vote (gov-budget-spending-voted-from-revenue).
