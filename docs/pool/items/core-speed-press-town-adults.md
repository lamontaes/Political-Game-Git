---
id: core-speed-press-town-adults
title: "The press counts a town's adults each week by building and sorting a voter row for every counted resident in the world"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Long Hill, Connecticut's played year (seed m7b), townAdultsByBand in src/core2/modules/press.ts takes 2.25 s of a profiled pair, 2.08 s of it in countedResidents (src/core2/electorate.ts). Once a week it asks for every counted resident of the world, 30,643 in Long Hill's, as full voter rows with packed traits, weekly work minutes and pay built per household, sorted by id, then keeps only the town's 8,521 to count adults by age band. Read only the town's counted residents, with their birth date and household weight, sorted by id as before so the sums add up in the same order, through one shared rule for who votes as counted.

**Rules.** No dice: the adults counted, and every follower count and ad price read from them, stay exactly the same; the weights are summed in the same id order. One model, two tiers: the same rule decides who is a counted resident for both readers. Speed: measured before and after on the same base and machine, both checkouts in one process.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, drawn from all 56, three years) the deep fingerprint is identical before and after; in a paired run's CPU profile split by checkout, townAdultsByBand's inclusive time falls by more than half and the year is no slower; the press, electorate and voting tests pass.

**Files.** src/core2/modules/press.ts, src/core2/electorate.ts

**Notes.** Filed Oct 25 by the speed lead from the profiled pair of core-speed-api-parameter-once.
