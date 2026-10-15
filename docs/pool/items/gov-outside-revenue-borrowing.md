---
id: gov-outside-revenue-borrowing
title: "The federal gap is borrowed from named lenders, and interest is paid to them"
area: gov
kind: stopgap
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from gov-outside-revenue-real-payers"
---

**What.** The federal treasury's gap is borrowed from outside each month with no lender behind it. Have it borrowed from named lenders (households, banks, funds and foreign holders as counted groups at the coarser level), with a debt record per issue and interest paid back to them through the same engine, so the borrowing, the balance and the interest are each a ledger transfer between named accounts.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug's share for this family goes in the same change).

**Done when.** In a drawn place, a one-year run of the played world (`buildBenchWorld`), `scripts/core2-year/closures.mjs` check 6 matches no plug row for this family, each borrowing names a lender account; interest paid in the year names the holders; the debt balance equals borrowed minus repaid.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/credit (or the finance engine), src/core2/data/outside-flows.json

**Notes.** State and local borrowing, if modeled, follows the same rule. See the open item gov-stopgap-budgets-faked-mechanic. Split from gov-outside-revenue-real-payers (Oct 15). The plug is `closeTreasuries` in `src/core2/budgets-treasury.ts` (the `outside-revenue:` transfer) and stopgap SG-GOV-outside-revenue-monthly.
