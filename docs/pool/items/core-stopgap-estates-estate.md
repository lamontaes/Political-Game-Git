---
id: core-stopgap-estates-estate
title: "Stopgaps in estates (estate): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5275
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/estates.ts, kind estate"
claimed-at:
---

**What.** Replace or clear the 1 open estate stopgap row(s) in src/core2/estates.ts: SG-CORE-estate-cash-only. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/estates.ts

**Notes.** First row: A full person's estate is only their cash and the standing payments they owed: homes, loans, businesses and accounts other than their main one are not settled. A relative who is still only a counted record does not inherit.
Sent back from PR #5275: estates-counted-kin.test.ts fails on random seeds when decedent has living spouse because spouse precedes children in intestateOrder.

- Cloud merger, after #5275 merged: counted-kin heirs now inherit, but the SG-CORE-estate-cash-only row is still open (homes, loans and businesses are not settled), so this item stays open.

Oct 21 (claude): PR #5275 (counted relatives inherit) is merged, and the random-seed failure the send-back named (a living spouse inheriting ahead of a counted child) was fixed on main by e3e66693ac. What the row `SG-CORE-estate-cash-only` still lacks is the home, loans and businesses of the dead: the separate items world-estate-sells-the-home (in PR), world-buyer-pays-the-selling-household and the savings half (#5316, in PR) cover parts of it; businesses and loans have no item yet. File those two when the row is next narrowed. Claim released.
