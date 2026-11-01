---
id: core-counted-eviction-kin-notice
title: "A full person whose relative's counted household is evicted hears of it only through husks, not as a witness on the day"
area: core
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: core-evicted-counted-stays-counted
source: added with npm run pool -- add
---

**What.** Since evicted counted households stay counted (core-evicted-counted-stays-counted), an eviction names its full members and husks, and lists its counted members in the counted-subjects fact. A full person who lists a counted member as family but is not in the household does not perceive the eviction on the day, where on main they would have through the filled-in relatives. The gap is registered as SG-WORLD-counted-eviction-kin-notice, with its marker in housing.ts remove(); the counted-death notice (births-counted-death-notice) is the precedent.

**Rules.** One model, two tiers: a counted household's eviction reaches the relatives who list its members as family by the same rule a full household's eviction does. Wire to the world: the relative perceives it as a witness and the drives and director engines read that record.

**Done when.** In a played world (buildBenchWorld) in Storrs, Connecticut (key 0973980), a full person who lists a member of an evicted counted household as family perceives the eviction on the day as a witness, by event and knowledge record id; a test proves it in Storrs and a place drawn from all 56, seeds named; and the stopgap SG-WORLD-counted-eviction-kin-notice is cleared.

**Files.** src/core2/modules/housing.ts, src/core2/births-counted.ts, src/core2/data/stopgaps.json

**Notes.** Lead: speed. Filed Nov 1 from the second review of speed/evicted-stay-counted.
