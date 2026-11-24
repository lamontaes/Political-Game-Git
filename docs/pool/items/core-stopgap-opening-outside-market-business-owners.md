---
id: core-stopgap-opening-outside-market-business-owners
title: "Stopgaps in opening-outside-market (business-owners): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/opening-outside-market.ts, kind business-owners"
---

**What.** Replace or clear the 1 open business-owners stopgap row(s) in src/core2/opening-outside-market.ts: SG-CORE-owner-distributions. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/opening-outside-market.ts

**Notes.** First row: Each firm pays cash above twice its industry's median buffer to owners monthly, a fixed tunable share to the town's residents and the rest outside; no firm has recorded owners, retained-earnings policy, taxes or investme

Checked 2026-10-16 against main and dropped as already done: its only stopgap SG-CORE-owner-distributions is resolved in stopgaps.json: the core stand-in payout flow was deleted, and owners now draw from their firm through the business engine (`owner-draw` in `src/core2/modules/business.ts`). Nothing is left to build; no PR of this item's own did the work.
