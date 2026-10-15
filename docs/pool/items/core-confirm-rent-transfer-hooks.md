---
id: core-confirm-rent-transfer-hooks
title: "Show counted rent renewal in housing and counted payments in world-transfer read in a played year"
area: core
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "split from core-confirm-counted-hooks"
---

**What.** Two of the six counted-group hooks are not yet shown read in a played year: counted tenants' rent flows are renewed by the rent rule in `housing.ts` (the `rent:` flows), and payments between an organization and a place's counted residents go through `countedPayment` in `world-transfer.ts`. Show each in a played world with the record ids that moved, or delete the hook if nothing reads it. A hook nothing reads is a placeholder, not a feature.

**Rules.** An effect is a read, not a record: each hook counts when another engine reads what it wrote at the moment it decides or pays. One model, two tiers: a counted group follows the same rent rule as a full tenant, times its count. Replace, never layer: a hook nothing reads is deleted in the same change.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named), a rent flow of a counted household changes on the lease renewal date by the rent rule in force, named by flow id, and a purchase between an organization and the counted residents moves the group's account, named by the journal entry id, in a test in src/core2 that fails if either hook is removed. The owner plays it: rents in the town rise with the rule and counted renters' budgets follow.

**Files.** src/core2/modules/housing.ts, src/core2/world-transfer.ts, src/core2/counted-money.ts

**Notes.** The budgets, regional, retirement and births hooks are shown in src/core2/counted-hooks-read.test.ts and the tests it cites.
