---
id: world-disasters-from-conditions
title: "After FEMA's records end, disasters come from the world's own conditions, with damage reaching named households and businesses"
area: world
kind: stopgap
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/modules/disasters.ts makes disasters only from FEMA declarations and pays assistance to the counted residents in a lump, with no damage to businesses, public buildings or people and nothing after the records end. The owner ruled Oct 16: both FEMA's records and the world's own conditions, and the game keeps making its own weather after the records end. Build the causes (a hazard record from NOAA storm-episode history per county), damage to named households and businesses, repairs and insurance over time, and assistance over its real obligation dates. L: split into hazard records, damage, and aid.

**Rules.** No dice: a disaster follows a hazard record, never a monthly chance (sliding scales and causes). One rule, all 56 places: hazard histories by county in data. Wire to the world: damage moves money to builders and insurers.

**Done when.** In a one-year run of the played world (buildBenchWorld, drawn place and seed named) past FEMA's last record, a hazard record causes a disaster, a damaged home and business are named by record id, and repair payments post over months, checked in src/core2/modules/disasters.test.ts.

**Files.** src/core2/modules/disasters.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): the row SG-CORE-disasters-from-records stays open while its pool item is done; the owner's Oct 16 ruling answers its question. Split before building.
