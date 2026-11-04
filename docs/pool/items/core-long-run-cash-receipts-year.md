---
id: core-long-run-cash-receipts-year
title: "Fold the cash journal's itemized receipts to a year for the circle and two calendar years for the player's household"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: speed/fold-cash-receipts
pr: #7128
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T21:16:00.492Z
---

**What.** The cash journal keeps an itemized copy of every payment a followed person makes or receives (core.cashJournal.detailedReceipts, indexed by detailedByOwner), and never drops one. A long save of Ringgold, Louisiana held 209,046 of them at year 18, the fourth largest table, and Chamblee, Georgia gained 38,325 in its second year alone. Balances, account totals and the journal already hold the money itself, and no screen, scene or law reader reads itemized receipts older than a year.

**Rules.** Speed (owner, Oct 29; OWNER-DECISIONS Oct 30 01:55): old records fold once play no longer reads them, and years 97 to 100 hold at most 1.2 times the records of years 1 to 4. Folds are built once each reader's window is agreed with its owner (CTO, Oct 30 04:14): the play-first lane agreed 365 days for dev mode's ledger with the player and household keeping the current and prior calendar year, and the laws lead agreed no law reader needs more. A receipt an open obligation names, and every observer-mode receipt, stay.

**Done when.** A four-year run of the played world (npm run speed:year -- --seed long-1 --years 4, Ringgold, Louisiana) on main and the branch, one process each, keeps dev mode's records proof identical in every table except core.cashJournal.detailedReceipts and its index, with row counts in the PR body; dev-why.test.ts and the M0-04 check (m0-check.ts) pass in drawn places named with their seeds, and dev-why says in plain words when a followed person has no itemized payments in the last year.

**Files.** src/core2/journal-state.ts,src/core2/decision-detail.ts,src/core2/data/parameters.json,src/bench/dev-why.ts

**Notes.** lead: speed. Round four of core-long-run-tables-grow-with-history; reader map in the speed lead's scratchpad r4/round-four-map.json. Lane (Nov 1, 21:15) and laws (21:14) agreed the window.

Nov 2, 01:20 UTC (speed lead, handoff record; the first account is near its weekly limit): branch speed/fold-cash-receipts, head ae0a0d7047 (built on main 15059c66cc), built, reviewed and fixed; folds receipts older than the window into per-person, per-kind yearly totals as the CTO ruled. Its four-year proof against main 15059c66cc is running. Next: proof (only core.cashJournal.detailedReceipts, its index and the new totals may differ), PR, checker by PR number mod 5.
