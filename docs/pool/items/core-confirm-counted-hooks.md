---
id: core-confirm-counted-hooks
title: "Show the counted-group hooks in budgets, housing, regional, world-transfer and births-counted read by another engine"
area: core
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from core-needs-opus-core-57; docs/coordination/OPUS-CORE.md"
---

**What.** The one-model-two-tiers change added hooks so counted groups are read like full people in `budgets.ts`, `budgets-treasury.ts`, `housing.ts`, `regional.ts`, `world-transfer.ts` and `births-counted.ts`. The core's list still asks the government, world and people engines to confirm each hook, and nothing shows one is read. Show each in a played world, or remove the hook.

**Rules.** An effect is a read, not a record: a hook counts when another engine reads what it wrote at the moment it decides or pays. One model, two tiers: a counted group is read with the same rule as a full person, times its count. Replace, never layer: a hook nothing reads is deleted, not kept.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named) each of the six hooks is shown read by another engine, named by record id, in a test that fails if the hook is removed; any hook that is not read is deleted in the same change. The owner plays it: pass a tax change and see counted households pay it on the date.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/modules/housing.ts, src/core2/modules/regional.ts, src/core2/world-transfer.ts, src/core2/births-counted.ts

**Notes.** Counted workers' quits and hires reading the groups (business audit defects 2, 4, 7, 8) belong to the world line and are not part of this item.
