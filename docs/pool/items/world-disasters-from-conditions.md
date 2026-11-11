---
id: world-disasters-from-conditions
title: "After FEMA's records end, disasters come from the world's own conditions, with damage reaching named households and businesses"
area: world
kind: stopgap
priority: 3
size: L
status: open
standard: 2
claimed-by:
pr:
blocked-on: world-disasters-from-conditions-part-1-damage-to-named-buildings, world-disasters-from-conditions-part-2-repairs-and-insurance-over-months, world-disasters-from-conditions-part-3-aid-on-real-obligation-dates, world-disasters-from-conditions-part-4-close-the-stopgap
after:
lead: laws-effects
model: sonnet
effort: low
root: rc1-world-outside-town
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** src/core2/modules/disasters.ts makes disasters from FEMA declarations on their real dates and, after the records end, from the county's weather (hazardRate): a disaster happens the month the exposure holds one more whole one. What it does not do is damage businesses, public buildings or people, repair anything over time or pay assistance over its real obligation dates; the assistance is a lump to the counted residents. The owner ruled Oct 16: both FEMA's records and the world's own conditions, and the game keeps making its own weather after the records end. Build damage to named households and businesses, repairs and insurance over time, and assistance over its real obligation dates, reading the existing hazard records. Seen: the paper and the town after a disaster, with the owner's Oct 16 ruling that the world makes its own disasters from weather.

**Cause.** Design: the owner's Oct 16, 2026 ruling in this item, docs/coordination/OWNER-DECISIONS.md (Nov 8, about 7:15 p.m.: weather is basic climate change through the effect map), and the open stopgap SG-CORE-disasters-from-records in src/core2/data/stopgaps/core.json; the hazard side is built (hazardRate in src/core2/modules/disasters.ts, commit d170918dd7).

**Fix.** Build it in four parts, in order: world-disasters-from-conditions-part-1-damage-to-named-buildings (damage to named buildings), world-disasters-from-conditions-part-2-repairs-and-insurance-over-months (repairs and insurance over months), world-disasters-from-conditions-part-3-aid-on-real-obligation-dates (aid on its obligation dates) and world-disasters-from-conditions-part-4-close-the-stopgap (close the stopgap).

**Time box.** 24 hours in all, across the four parts; each part carries its own time box.

**Rules.** No dice: a disaster follows a hazard record, never a monthly chance (sliding scales and causes). One rule, all 56 places: hazard histories by county in data. Wire to the world: damage moves money to builders and insurers.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, drawn place and seed named) past FEMA's last record and sees a hazard record cause a disaster, a damaged home and business named by record id, and repair payments post over months, with the chain stated in src/core2/disaster-weather.test.ts. This item is done when its four parts are.

**Waits on.** The four parts: world-disasters-from-conditions-part-1-damage-to-named-buildings, world-disasters-from-conditions-part-2-repairs-and-insurance-over-months, world-disasters-from-conditions-part-3-aid-on-real-obligation-dates, world-disasters-from-conditions-part-4-close-the-stopgap.

**Files.** src/core2/modules/disasters.ts, src/core2/disaster-weather.test.ts, src/core2/data/stopgaps/core.json

**Notes.** Oct 20 (pool feeder): the row SG-CORE-disasters-from-records stays open while its pool item is done; the owner's Oct 16 ruling answers its question. Split before building.

**Evidence, Oct 27 (realistic-not-real audit).** FEMA declarations after the start are replayed on their real dates with their real aid (src/core2/modules/disasters.ts:107-200). The owner's Oct 27 ruling covers every statistic, so the declarations calibrate hazard causes rather than happen as themselves (docs/reports/real-statistics-in-play-2026-10-27.md row 41).
