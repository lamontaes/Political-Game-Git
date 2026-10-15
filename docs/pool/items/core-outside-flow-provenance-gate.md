---
id: core-outside-flow-provenance-gate
title: "Outside-flow provenance gate fails on main"
area: core
kind: bug
priority: 1
status: claimed
claimed-by: pool/core-outside-flow-provenance-gate
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

Result: check 6 was red for two reasons. Five flows were real recorded exchanges missing from the catalog (`mover-departure`, `counted-arrival`, `entrant`, `price`, `property-tax`), now rows. Three were the government stand-in's other half (`outside-revenue`, `treasury`, `federal-borrowing`), now all `plug` rows under SG-GOV-outside-revenue-monthly. The gate stays red on that one open stopgap by design, so the done-when is met once `gov-stopgap-budgets-faked-mechanic` replaces it (raised to priority 1).
