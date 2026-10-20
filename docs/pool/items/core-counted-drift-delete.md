---
id: core-counted-drift-delete
title: "Delete counted-drift: every life core that has counted residents runs births-counted instead"
area: core
kind: cleanup
priority: 2
size: M
status: done
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

Tried Oct 17 (claude, not built, reverted): installing the renewal engine in `createLifeCore` for every cores with residents (`RENEWAL_MODULE` appended after the caller's own modules unless the caller already placed it, and `renewalData` for the tiers) and dropping `COUNTED_DRIFT_MODULE` from the list. First run over the 328 test files that build a life core, bench world or population: 176 files failed, almost all with "Duplicate module: core2-renewal-v1" (the play module list and `createRenewalCore` register it themselves). After making the install skip a core whose modules already include it and `createRenewalCore` skip a core that has it, 29 tests in 17 files still fail, in two groups:

- Fixtures with a made-up place (`place:jobs-fixture`, `place:credit-fixture`, `place:build-fixture`, `place:tax-fixture`, `place:prices-fixture`, `place:founding-fixture`) throw "No state recorded for place:..." from `stateOf` in `births-counted.ts` (line 138): `business`, `credit`, `housing-construction`, `housing-property-tax`, `jobs`, `place-prices`. They need a recorded state, or the flows must skip a place with none.
- Tests whose numbers moved because the renewal flows replace counted-drift's: `residents.test.ts` (a month's counts, 38819 against 38784), `counted-drift.test.ts` (no deaths at the real rate), `electorate-weight`, `counted-weight-housing`, `player-money-year`, `service-charges`, `dev-mode`, `birth-scenes`, `office-scene-levels`, `estate-contracts`, `groundwater-law`, and `world-modules.test.ts` (which lists `COUNTED_DRIFT_MODULE` as an installed module and also names `openRestingStress`).

Do it in this order: the fixtures first (give each a state), then the number-moving tests one at a time, reading each number's cause, then delete `counted-drift.ts`, its data and its test. The full list of failing files is reproducible with `npx vitest run $(grep -l "createLifeCore\|buildBenchWorld\|buildPopulation\|createRenewalCore\|newGame\|worldGame" src/core2/*.test.ts src/bench/*.test.ts src/director/*.test.ts tests/*.test.ts) --maxWorkers=3` (about 50 minutes on 4 cores).
