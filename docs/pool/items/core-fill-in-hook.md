---
id: core-fill-in-hook
title: "Engines can hook a person's fill-in (onFillIn)"
area: core
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** No `onFillIn` hook exists, so an engine that keeps a record on a counted person (a housing bill, a view) cannot move it to the full person when they are filled in. Add the hook where fill-in happens and call it from housing.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** A counted household's housing record follows its filled-in person in a one-year run, by household and person record ids.

**Files.** src/core2/state.ts, src/core2/types.ts, src/core2/modules/housing.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.

Looked at Oct 16 (claude, released, not built). The hook itself is small: a `registerFillInListener` in `state.ts`, called at the end of `fillInPerson` with the household id, the admitted people and whether they are returning (I wrote it and it typechecks). The housing half is not small. An open eviction case on a counted household (`counted: true`, `leaseId` a counted id, in the housing `cases` table) can be switched to the filled-in household's lease (`lease:<householdId>`, which `fillInPerson` creates), but that lease starts with zero arrears: the rent a counted household owed is the group's `housingMonth` arrears, not a per-household figure, and no core call adds arrears to a finance contract (`addFinanceContract` admits it at zero, finance-state.ts near line 547). So the converted case would find nothing owed and cure itself, which quietly forgives the rent. Needs a core call to admit a contract with arrears (or an owed-rent record on the household) first; then the listener can follow. Size M, core and world.
