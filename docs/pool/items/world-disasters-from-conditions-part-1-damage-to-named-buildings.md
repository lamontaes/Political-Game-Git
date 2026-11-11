---
id: world-disasters-from-conditions-part-1-damage-to-named-buildings
title: "A hazard-caused disaster damages named homes, businesses and public buildings"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: rc1-world-outside-town
source: split from world-disasters-from-conditions in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Disasters after FEMA's records end already come from weather: on the first of each month the county's exposure to each hazard grows by the climate's rate (hazardRate) and a disaster happens the month the exposure holds one more whole one. But the damage is a lump paid to the counted residents with no harm to businesses, public buildings or people. Make a hazard-caused disaster damage named homes, named businesses and named public buildings, sized from the county's NOAA storm-episode history, each damage a record by id. Seen: the paper and the town after a disaster, with named homes, businesses and buildings damaged (owner, Oct 16).

**Cause.** Design: the owner's Oct 16, 2026 ruling in the item (both FEMA's records and the world's own conditions; the game makes its own weather after the records end) and docs/coordination/OWNER-DECISIONS.md, Nov 8, about 7:15 p.m. (weather is basic climate change through the effect map). Open stopgap SG-CORE-disasters-from-records (src/core2/data/stopgaps/core.json) names the missing damage.

**Fix.** In src/core2/modules/disasters.ts, after a hazard-caused disaster begins, write damage records for named homes, businesses and public buildings of the affected places, sized from sourced county storm-episode figures with spread, and have the business and housing engines read them.

**Time box.** 8 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: damage follows the hazard record and what stands in the path, never a roll. One rule, all 56 places: hazard histories by county live in data. One model, two tiers: a counted household or business is damaged by the same rule as a full one, times its count. Wire to the world: damage moves money in the later parts, so each damage record is read by another engine.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, drawn place and seed named) past FEMA's last record and sees a hazard-caused disaster name damaged homes, businesses and public buildings by record id; a test in src/core2/disaster-weather.test.ts states the chain.

**Waits on.** Nothing.

**Files.** src/core2/modules/disasters.ts, src/core2/disaster-weather.test.ts, src/core2/data/stopgaps/core.json
