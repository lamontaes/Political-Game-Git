---
id: gov-outside-revenue-aid
title: "Intergovernmental and federal aid lines are paid by the treasury of the level above, on its schedule"
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

**What.** `federalAid` and `intergovernmental` lines are paid by the plug unless the payer level is in the game (the `aided` set in `closeTreasuries`). Extend the aid flows so every aid line is paid by the treasury of the level above, on its real schedule, from that treasury's own spending line, never from the outside account.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug's share for this family goes in the same change).

**Done when.** In a drawn place, a one-year run of the played world (`buildBenchWorld`), `scripts/core2-year/closures.mjs` check 6 matches no plug row for this family, each aid receipt is a transfer from a named government's treasury, and that treasury's spending line shows the same transfer.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/budgets/treasury-spending.json (`aid.flows`)

**Notes.** The `aid.flows` table is the place to extend; the federal treasury is the root payer. Split from gov-outside-revenue-real-payers (Oct 15). The plug is `closeTreasuries` in `src/core2/budgets-treasury.ts` (the `outside-revenue:` transfer) and stopgap SG-GOV-outside-revenue-monthly.
