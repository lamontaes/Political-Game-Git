---
id: gov-town-plan-vs-payers
title: "A town collects several times its planned revenue: its Census-scaled plan and what its laws and payers raise disagree"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
lead: legislation
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: high
root: none
source: Money, Nov 9; scripts/money/collected.ts
claimed-at:
---

**What.** A town collects several times its planned revenue. In Wooster, Indiana (key 1885562, seed money-1) the town's treasury took in 0.53 B (units of 100 million minor, credits on the cash journal) in 2026 against a planned revenue of 0.14 B, a ratio of 3.7, while the state (1.014) and the county (1.016) sit near 1. The town's plan is the Census fiscal-2022 per-resident line times its residents, and its income is what the town's laws (property, sales, income taxes and charges) raise from its modeled payers. The two should come from the same laws and payers; until they do, the town's spending cannot be voted from its receipts (SG-GOV-spending-vote-state-county).

**Cause.** Needs cause. Measured with `npx tsx scripts/money/collected.ts money-1 2` (Money, Nov 9) while building the receipts tally for the spending vote (gov-budget-spending-voted-from-revenue): Wooster, Indiana (1885562) collected 0.53 B against a planned 0.14 B, ratio 3.7; state and county near 1. Not yet looked at: which of the town's laws or payer groups raises the excess, and whether the plan or the receipts are the wrong side.

**Fix.** None until the cause is found.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the town's plan and its receipts come from the same laws and payers, so a vote reads one record of what the town raised, proven in a generated world. One rule, all 56 places: the reconciliation runs in drawn places and names no place in code. Estimate, never UNKNOWN: a plan figure the town's payers cannot support is a registered estimate with its source and spread. Real town ratios are reported, never steered to (owner, Nov 8: ranges aren't targets).

**Done when.** A second session, not the builder, runs `npx tsx scripts/money/collected.ts <seed> 2` at three drawn places and seeds (named in the PR body, with Wooster, Indiana and seed money-1 as the first). For each, the town's collected and planned totals are shown by treasury ledger record id, the line that raises more than the plan is named by record id, and the plan and the receipts are read from the same laws and payers. The real-town ratio is reported next to it as a figure, not a pass mark.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/data/budgets/, scripts/money/collected.ts

**Notes.** Money, Nov 9: measured while building the receipts tally for the spending vote (gov-budget-spending-voted-from-revenue).

**Notes (Fable, Nov 10, model).** The sort marked this for a Fable-level model. Read again by Fable: Finding this cause is one engine's receipts read against one plan: an Opus session at high effort can do it, and a second session checks the cause before anything is built on it.
