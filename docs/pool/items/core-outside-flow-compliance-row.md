---
id: core-outside-flow-compliance-row
title: "Outside-flow catalog has no row for compliance payments"
area: core
kind: bug
priority: 2
status: open
claimed-by:
pr:
blocked-on: core-outside-flow-catalog-rows
milestone:
source: "closure proof on Garden City, Idaho (1629620), seed 0ef58e07, Oct 15"
---

**What.** `scripts/core2-year/closures.mjs` check 6 lists `accounts.transfer compliance` as an unmatched flow in a Garden City year, next to the kinds the open catalog PR adds. Find which engine posts it, and add a catalog row (or a plug row under its stopgap if its payee is a stand-in).

**Rules.** The catalog rejects plugs; a flow is matched only when a recorded exchange stands behind it.

**Done when.** The closure check on the same seed and place lists no unmatched `compliance` flow.

**Files.** src/core2/data/outside-flows.json, the engine that posts `compliance:` transfers.

**Notes.** Found while measuring `core-year-over-120s`.
