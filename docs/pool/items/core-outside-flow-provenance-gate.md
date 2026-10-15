---
id: core-outside-flow-provenance-gate
title: "Outside-flow provenance gate fails on main"
area: core
kind: bug
priority: 1
status: blocked
claimed-by:
pr:
blocked-on: gov-stopgap-budgets-faked-mechanic
milestone:
source: "known bugs; noted in #4352"
---

**What.** The outside-flow provenance gate is red on main. Find the cause and fix it.

**Rules.** Fix at the root.

**Done when.** The gate passes on main.

**Files.** see #4352

**Notes.** Verify the failing test name from #4352.

**Split (claude/political-game-pool-g2977r).** The gate has two causes. (1) Real exchanges missing from the catalog: done in `core-outside-flow-catalog-rows`. (2) The registered plug `SG-GOV-outside-revenue-monthly` (budgets-treasury.ts `closeTreasuries`): every government is paid an even twelfth of its Census revenue from the outside account, and the federal treasury's is about $5.3 trillion a year. The check rejects plugs by design, so it stays red until `gov-stopgap-budgets-faked-mechanic` replaces each revenue line with its real payer. This item is done when that lands and the check reports `M0-08 PASS`.
