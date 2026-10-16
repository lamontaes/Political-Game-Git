---
id: core-fill-in-hook
title: "Engines can hook a person's fill-in (onFillIn)"
area: core
kind: feature
priority: 3
size: S
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

Looked at 2026-10-16 (claude session), not built: the housing rows that need the hook are the eviction cases. A case on a counted household keeps `counted: true` and a lease id `rent:<household>`; once a member is filled in, the household's lease is `lease:<household>` (`householdContracts` in modules/residents.ts) with no arrears, and the case's counted payment path finds the household gone from the store, so the case can never cure or be paid. The hook needs a decision on what happens to the arrears the group owed: carry them onto the new lease, or close the case as vacated.
