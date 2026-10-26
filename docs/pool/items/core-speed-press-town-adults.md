---
id: core-speed-press-town-adults
title: "The press counts a town's adults each week by building and sorting a voter row for every counted resident in the world"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/speed-press-town-adults
pr: #6075
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T08:51:28.947Z
---

**What.** In Long Hill, Connecticut's played year (seed m7b), townAdultsByBand in src/core2/modules/press.ts takes 2.25 s of a profiled pair, 2.08 s of it in countedResidents (src/core2/electorate.ts). Once a week it asks for every counted resident of the world, 30,643 in Long Hill's, as full voter rows with packed traits, weekly work minutes and pay built per household, sorted by id, then keeps only the town's 8,521 to count adults by age band. Read only the town's counted residents, with their birth date and household weight, sorted by id as before so the sums add up in the same order, through one shared rule for who votes as counted.

**Rules.** No dice: the adults counted, and every follower count and ad price read from them, stay exactly the same; the weights are summed in the same id order. One model, two tiers: the same rule decides who is a counted resident for both readers. Speed: measured before and after on the same base and machine, both checkouts in one process.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, drawn from all 56, three years) the deep fingerprint is identical before and after; in a paired run's CPU profile split by checkout, townAdultsByBand's inclusive time falls by more than half and the year is no slower; the press, electorate and voting tests pass. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/modules/press.ts, src/core2/electorate.ts

**Notes.** Filed Oct 25 by the speed lead from the profiled pair of core-speed-api-parameter-once.

Ready Oct 25 (speed lead), not opened while the play-first freeze holds: branch `claude/speed-press-town-adults` at f95abc8db6 (base main 16df65ad60, no code change from 01f5cd4715). `countedResidents` and the new `countedResidentsOf(core, place)` take who is still counted from one rule (`eachCountedResident`); the press reads only the town's residents, sorted by id as before. Exact: deep fingerprints identical (Long Hill year one `3350c66a3805f1e8`; Stanardsville years one to three `176370fb6d3c2ba1`, `3ccb0a9002236aa5`, `4be9e9254da3aaf3`). Profiled pair 140.8 to 136.3 s (0.968): `townAdultsByBand` 2.3 to 0.7 s, `pressWeek` 4.2 to 2.8 s. Plain pair 125.9 to 114.6 s (0.911). Press, electorate and voting tests pass (press 3, electorate 4, electorate-weight, electorate-inputs 2, electorate-house-side, press-played, press-money, press-asks, press-owners 3, press-public-facts, voting, voting-winner-person); `press-turnover`'s second case runs its test worker out of its 2 GB heap on main too (same run, both checkouts). Typecheck, release check and zero-dice are clean.
