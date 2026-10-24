---
id: world-households-unpaid-living-costs-payday
title: "In a small Kansas town half of the outside living costs go unpaid: households hold no cash on the 1st"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #4937
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Full households that lack cash on the monthly living-cost date lose the unpaid part instead of keeping the bill. Carry the unpaid amount until money arrives, and use the same obligation and retry rule for counted groups. Each group keeps what it owes and paid without assigning its debt to another group.

**Rules.** One model, two tiers: full and counted households retain unpaid living costs by the same rule. Replace, never layer: replace skipped bills with one carried balance and prevent duplicate charges. Wire to the world: later payroll cash pays the recorded debt through the existing journal.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place and seed named in the PR body), a full household short of cash on its billing date carries a positive unpaid amount and pays it after a later payday, with bill and journal record ids named. A counted group also carries a positive unpaid living-cost obligation across a day with no new bill and repays it when cash arrives; the flow arrears equal the sum its groups owe and the journal balances. src/core2/living-costs-arrears.test.ts proves both tiers without a vacuous zero-debt comparison, and the existing service-charge assertions remain intact.

**Files.** src/core2/modules/residents.ts, src/core2/counted-money.ts, src/core2/living-costs-arrears.test.ts, src/core2/service-charges.test.ts

**Notes.** TODO

**Where the unpaid part sits (Oct 17, claude).** In that town the counted groups pay their outside living cost in full (the one counted flow asks $627 and gets $627 on February 1 and on March 1); the shortfall is the full households. Twelve full households carry this cost; on the last month six paid nothing and the twelve together asked $12,208 and paid $5,139. They hold no cash on the 1st because everything they earn is spent between paydays on food and other purchases, which run before the 1st. So the fix is the order and timing of a full household's spending against its pay (a bill that cannot be paid on the 1st waits for the next payday as arrears, as counted housing already does), not the counted tier.

Sent back 2026-10-20 from PR #4937 (branch claude/living-costs-arrears): Morning check: outside-living-cost arrears and daily retries are introduced only when !countedPays && !countedPaid in residents.ts. The counted path still calls chargeGroups with the current base, and counted-money.ts carries arrears only for housing, so counted households lose unpaid living costs while full households retain them. No new registry row/code marker describes this tier-specific shortcut. Apply the same arrears rule to counted groups, preserving per-group obligations and conservation, before calling the household fix complete.; finish on that branch, merge main into it first.

Sent back 2026-10-22 from PR #4937 (branch claude/living-costs-arrears): Normal main integration conflicts in src/core2/living-costs-arrears.test.ts:65; preserve both full-household and counted-group arrears assertions.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #4937 (branch claude/living-costs-arrears): counted arrears test can pass with zero debt and never follows non-billing-day carry or repayment; add positive counted and annual full-household record witnesses plus the Done-when evidence table; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #4937 (branch claude/living-costs-arrears): repayment witnesses count any debt reduction despite write-off and construct journal IDs without requiring positive payment records; reconcile actual group payment, payer/payee postings and charge-off separately; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #4937 recheck (branch claude/living-costs-arrears): counted repayment still sums all positive postings instead of selecting the actual payee account, and full repayment sums all debits instead of recorded payer/member accounts; require those account-identity assertions while preserving the annual positive-payment and write-off reconciliation proof; finish on that branch, merge main into it first.
