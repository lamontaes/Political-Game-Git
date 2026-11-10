---
id: realistic-row-45-dc-delegate-seat
title: "The two-seeds-differ guard fails whenever it draws Washington, D.C.: the delegate seat 98 maps to no roster holder"
area: core
kind: bug
priority: 1
size: S
lead: m0-m2
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The guard two-seeds-differ (npm run zero-real-data, src/core2/realistic-not-real.test.ts) draws a random place each run, so it fails some runs and passes others on the same commit. On main 886c21ab72 it failed 2 of 4 runs in a words session; the captured failure is Washington, District of Columbia (1150000), seed 5fe2f06aee1fd05c, audit row 45: 'row 45 seat:US-DC:us-house:98: expected Democratic to be null'. The officials engine seats a Democratic delegate in seat:US-DC:us-house:98, but the test's holderIn reads congress['US-DC']['98'], which the world roster does not hold, so the expected holder is null. A random red in the guards job blocks any PR that drew that place.

**Rules.** One rule, all 56 places: the check must pass by the same rule for D.C. and the territories' delegate seats as for a state's districts, so the seat-to-roster mapping covers a delegate seat. Realistic not real: the fix keeps the check that every member of Congress carries the world roster's party, it does not exempt a place.

**Done when.** The test src/core2/realistic-not-real.test.ts, run through npm run zero-real-data, passes for the drawn place Washington, D.C. (seed 5fe2f06aee1fd05c) and for a drawn place that is a territory with a delegate, and passes ten runs in a row on random draws; the PR names each drawn place and seed it ran.

**Files.** src/core2/realistic-not-real.test.ts

**Notes.** TODO Oct 29 08:15 UTC, Words and director: Puerto Rico fails the same row too. CI on #6756 (job 123333674951) drew Parcelas de Navarro, Puerto Rico (run seed 64786bd44fc6d52f): row 45 seat:US-PR:us-house:98, "expected 'Democratic' to be null". The delegate seats of D.C. and the territories, not D.C. alone.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. `holderIn` in src/core2/realistic-not-real.test.ts (lines 947 to 960) now maps a non-voting delegate's seat 98 (`DELEGATE_DISTRICT`, line 143) to the roster's at-large seat, with the comment naming Moca, Puerto Rico seed 08477dec014e6c2e; D.C. and the territories are covered.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): already done on main (evidence in the Notes above).
