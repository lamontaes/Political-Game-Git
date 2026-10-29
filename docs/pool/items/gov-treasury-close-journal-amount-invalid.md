---
id: gov-treasury-close-journal-amount-invalid
title: "The month's treasury close stops the year: it posts a journal amount that is not a whole number of cents at or above zero"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: wire-office
---

**What.** office-day-member-filings.test.ts with GOLDEN_PATH_SEED=pet-run-1 stops after about 31 minutes of play with: Error: Invalid nonnegative integer journal amount: journal debits, at minor (src/core2/journal-state.ts:203), from plusTotals (journal-state.ts:1054), postCashJournal (journal-state.ts:1384), transfer (src/core2/accounts.ts:408 and 600), closeTreasuries (src/core2/budgets-treasury.ts:986), closeMonth (src/core2/modules/budgets.ts:819). On main the same run stops earlier, on a world race's seating day (fixed on branch claude/elections-seat-winner-future-day), so this red shows once that fix lands. The journal's running debit total is refused, so either one transfer's amount or the sum it adds to is negative, fractional or past the safe whole-number range; the cause is not found yet.

**Rules.** Fix at the root in the treasury close or the journal, never by clamping or skipping a posting. Every number in a parameter table. Speed: no year more than 20 percent slower. One rule, all 56 places.

**Done when.** office-day-member-filings.test.ts with GOLDEN_PATH_SEED=pet-run-1 runs past every month close of its run with no journal error, the PR names the transfer (accounts, amount and treasury record id) that carried the bad amount and why, and a test that builds the played world for that place and seed fails on main and passes with the fix.

**Time box.** 3 hours; if not done, push what exists, open the PR, write the handoff.

**Files.** src/core2/budgets-treasury.ts, src/core2/journal-state.ts, src/core2/accounts.ts

**Notes.** TODO
