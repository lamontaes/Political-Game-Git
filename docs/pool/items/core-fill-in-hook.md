---
id: core-fill-in-hook
title: "Engines can hook a person's fill-in (onFillIn)"
area: core
kind: feature
priority: 3
size: M
status: done
claimed-by: claude/fill-in-hook
pr: #4848
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T00:40:42.353Z
---

**What.** No `onFillIn` hook exists, so an engine that keeps a record on a counted person (a housing bill, a view) cannot move it to the full person when they are filled in. Add the hook where fill-in happens and call it from housing.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** A counted household's housing record follows its filled-in person in a one-year run, by household and person record ids.

**Files.** src/core2/state.ts, src/core2/types.ts, src/core2/modules/housing.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/archive/2026-10-23/coordination/world.md), checked against main on Oct 16, 2026.

Looked at 2026-10-16 (claude session), not built: the housing rows that need the hook are the eviction cases. A case on a counted household keeps `counted: true` and a lease id `rent:<household>`; once a member is filled in, the household's lease is `lease:<household>` (`householdContracts` in modules/residents.ts) with no arrears, and the case's counted payment path finds the household gone from the store, so the case can never cure or be paid. The hook needs a decision on what happens to the arrears the group owed: carry them onto the new lease, or close the case as vacated.

Looked at Oct 16 (claude, released, not built). The hook itself is small: a `registerFillInListener` in `state.ts`, called at the end of `fillInPerson` with the household id, the admitted people and whether they are returning (I wrote it and it typechecks). The housing half is not small. An open eviction case on a counted household (`counted: true`, `leaseId` a counted id, in the housing `cases` table) can be switched to the filled-in household's lease (`lease:<householdId>`, which `fillInPerson` creates), but that lease starts with zero arrears: the rent a counted household owed is the group's `housingMonth` arrears, not a per-household figure, and no core call adds arrears to a finance contract (`addFinanceContract` admits it at zero, finance-state.ts near line 547). So the converted case would find nothing owed and cure itself, which quietly forgives the rent. Needs a core call to admit a contract with arrears (or an owed-rent record on the household) first; then the listener can follow. Size M, core and world.

Looked at again Oct 17 (claude, claimed and released, nothing built). The hook itself is small: a CoreModule `onFillIn(api, {householdId, memberIds})` called at the end of `fillInPerson` in src/core2/state.ts, after the household's own contracts are added (`api.addFinanceContract` for each of `record.contracts`, which is where `lease:<household>` appears). The housing side is the hard part, and it is the arrears decision the earlier note names. To carry the group's arrears onto the new lease, finance needs a writer that adds arrears and a first-unpaid date to a standing contract; the only writers today are `reduceStandingArrears` and the settlement path in finance-state.ts, so that is a Core change with the ledger's checks (an arrears payment may not exceed what is owed). To close the case instead erases an eviction the household is still behind on. Per AGENTS.md the simplest version that follows the rules is: carry the arrears (the group owed `owedAtNoticeMinor` since `noticeAt`), re-point the open case from `rent:<household>` to `lease:<household>` with `counted: false`, and register an owner-decision stopgap for the carry-or-close question. That needs a Core-area writer first, so it belongs to a Core session.
