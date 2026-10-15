---
id: core-outside-flow-provenance-gate
title: "Outside-flow provenance gate fails on main"
area: core
kind: bug
priority: 1
status: blocked
claimed-by:
pr:
blocked-on: gov-outside-revenue-real-payers
milestone:
source: "known bugs; noted in #4352"
---

**What.** The outside-flow provenance gate is red on main. Find the cause and fix it.

**Rules.** Fix at the root.

**Done when.** The gate passes on main.

**Files.** see #4352

**Notes.** Verified the failing check: closures.mjs check 6. `core-outside-flow-rows` classifies the five real exchanges; what is left is the registered plug, `gov-outside-revenue-real-payers`. Closes when that item merges.
