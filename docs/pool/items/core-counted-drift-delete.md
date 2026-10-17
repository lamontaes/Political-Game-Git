---
id: core-counted-drift-delete
title: "Delete counted-drift: every life core that has counted residents runs births-counted instead"
area: core
kind: cleanup
priority: 2
size: M
status: in-pr
claimed-by: claude/counted-drift-delete
pr: #4889
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T08:04:16.466Z
---

**What.** `src/core2/modules/counted-drift.ts` still drives births, deaths and moves for counted residents in every life core that has residents but not the renewal engine (`createLifeCore` with `residents`, about 160 test and tool call sites). In a played world `births-counted.ts` (the renewal engine) owns all three and counted-drift stands down, so counted-drift is dead in play. After `core-counted-engine-merge` (the state death-rate scaling now lives in `births-counted.ts`), install the renewal engine's counted flows wherever `createLifeCore` admits residents, repoint `counted-drift.test.ts` and `residents.test.ts` at it, and delete `counted-drift.ts`, `COUNTED_DRIFT_MODULE` in `life.ts` and `data/counted-drift.json`.

**Rules.** Replace, never layer: the old module, its data and its stopgap rows go in the same change (resolve `SG-CORE-counted-drift` and `SG-CORE-counted-moves` only if the renewal engine's flows now carry what they fake; otherwise re-point their file field and keep them open). One model, two tiers.

**Done when.** `grep -r counted-drift src` finds nothing, the residents, counted-deaths-spread, births-counted and the tests that run a life core with residents for a year pass, and a one-year `buildBenchWorld` run in a drawn place (seed named in the PR body) shows the same counted births, deaths and moves rows as before.

**Files.** src/core2/life.ts, src/core2/modules/counted-drift.ts, src/core2/data/counted-drift.json, src/core2/counted-drift.test.ts, src/core2/residents.test.ts, src/core2/births-setup.ts

**Notes.** Found while taking `core-counted-engine-merge` (Oct 16): the pieces counted-drift had and births-counted lacked were the state death-rate scaling (folded in) and the SSA given names by birth year (births-counted already draws canonical named identities), the pull to leave (the counted-moves engine owns moves from causes; births-counted's departure rule runs only without it) and named workers (resolved in SG-CORE-counted-drift-named-workers). What remains is the install: `renewalData` swaps the `newborn` tier to inactive, so making it the default for residents cores changes every `createLifeCore` caller; check a few of the largest tests first.
