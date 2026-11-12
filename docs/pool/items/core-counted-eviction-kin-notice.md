---
id: core-counted-eviction-kin-notice
title: "A full person whose relative's counted household is evicted hears of it only through husks, not as a witness on the day"
area: core
kind: wiring
priority: 2
size: S
status: merged
claimed-by: claude/pool-core-counted-eviction-kin-notice
pr: #8478
blocked-on:
after: core-evicted-counted-stays-counted
source: added with npm run pool -- add
lead: speed
standard: 2
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:17:56.715Z
merged-at: 2026-11-12T18:10:29.017Z
---

**What.** Since evicted counted households stay counted (core-evicted-counted-stays-counted), an eviction names its full members and husks, and lists its counted members in the counted-subjects fact. A full person who lists a counted member as family but is not in the household does not perceive the eviction on the day, where on main they would have through the filled-in relatives. The gap is registered as SG-WORLD-counted-eviction-kin-notice, with its marker in housing.ts remove(); the counted-death notice (births-counted-death-notice) is the precedent.

**Cause.** Found in code: src/core2/modules/housing.ts `remove` (line 2500) carries the marker for SG-WORLD-counted-eviction-kin-notice (marker at lines 2549 and 2556; row in src/core2/data/stopgaps/world.json line 962): a full person who lists a counted evictee as family does not perceive the eviction on the day. The precedent is the counted-death notice in src/core2/births-counted.ts.

**Fix.** Make the eviction reach relatives who list a counted member as family as a witness event, by the same rule a full household's eviction does, and clear the stopgap.

**Time box.** 3 hours for a Sonnet session.

**Rules.** One model, two tiers: a counted household's eviction reaches the relatives who list its members as family by the same rule a full household's eviction does. Wire to the world: the relative perceives it as a witness and the drives and director engines read that record.

**Done when.** A second session, in a buildBenchWorld place Storrs, Connecticut (key 0973980) and one place drawn from all 56 (seeds named), sees a full person who lists a member of an evicted counted household as family perceive the eviction on the day as a witness, by event and knowledge record id. A test proves it in both places and SG-WORLD-counted-eviction-kin-notice is cleared.

**Waits on.** Nothing (core-evicted-counted-stays-counted is done).

**Files.** src/core2/modules/housing.ts, src/core2/births-counted.ts, src/core2/data/stopgaps/world.json

**Notes.** Lead: speed. Filed Nov 1 from the second review of speed/evicted-stay-counted.
