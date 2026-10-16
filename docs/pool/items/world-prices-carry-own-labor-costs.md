---
id: world-prices-carry-own-labor-costs
title: "A business's price carries its own labor costs, not only the national wage index"
area: world
kind: feature
priority: 3
size: S
status: in-pr
claimed-by: claude/prices-own-labor
pr: #4700
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T10:16:15.195Z
---

**What.** `projectBusinessPrice` moves price with the national wage index only (`wagePriceFactor`), so a local minimum-wage raise lifts payroll but not prices. Build the factor from the business's own pay per hour against its last review.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place a local minimum-wage raise lifts the prices of low-wage firms more than the national figure, by business review record ids.

**Files.** src/core2/finance-state.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.
