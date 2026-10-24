---
id: core-deep-past-kin-past-on-fill-in
title: "A relative from outside the town gets their school and era past when the game first simulates them"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Relatives living outside the town (the opening's husk-tier kin) keep only their family and move facts, because generating every relative's past made the prepared town too large to save (SG-P15-kin-light-past in src/core2/deep-past.ts). When the game first simulates one of them (promoteHusk in src/core2/state.ts, or the kin record turning into an acting person), build their deep past with the same buildDeepPast rules residents use, the way fillInPerson already rebuilds a counted resident's past. The past is seeded from the world, so the same relative comes back with the same schooling every time, and it must agree with what their records already say: their family, moves and birthplace. Resolve SG-P15-kin-light-past in src/core2/data/stopgaps.json when it works.

**Rules.** Two-level population: nobody gets a full past until filled in, and a filled-in relative must match the family and move facts already on their record. Wire to the world: the promoted relative's school cohort records are read by the peer-network and views engines exactly like a resident's.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, named in the PR), a relative promoted from the husk tier carries school:cohort-estimate records whose dates and places agree with their recorded birthplace and moves, named by record id, and a test beside src/core2/deep-past.test.ts shows the same relative gets the same past twice.

**Files.** src/core2/deep-past.ts,src/core2/state.ts,src/core2/data/stopgaps.json

**Notes.** TODO
