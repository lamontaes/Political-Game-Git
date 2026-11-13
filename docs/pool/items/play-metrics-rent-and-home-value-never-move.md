---
id: play-metrics-rent-and-home-value-never-move
title: "Metrics shows the opening day's typical rent and home value forever: two years into Joseph City, Arizona it still reads $904 and $198,000"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/p2-metrics-current-rent
pr: #9024
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: Playtester P2, Nov 13 (Joseph City, Arizona, seed 3bb11757-b22e-4a8d-b6c4-7259e5c84834)
---

**What.** On main 596d5127, an Advanced start in Joseph City, Arizona (seed 3bb11757-b22e-4a8d-b6c4-7259e5c84834), played two years week by week. Politics → Metrics → Homes reads "Typical monthly rent $904 · Typical home value $198,000" on January 20, 2025, and exactly the same in January 2027, while the country's prices rose 3.4% and then 2.8% in between. The housing engine's own figures do move: in Crestview, New Mexico (seed 7e9b5aa3...) the town's typical rent went from $803.65 to $835.24 and its typical home value from $96,007 to $99,152 in the first year. Seen: Metrics' typical rent and home value are today's.

**Cause.** Found in code: `housingRows` in `src/bench/metrics.ts` (line 98) shows `stock.openingRentMinor` and `stock.openingHomeValueMinor` from `buildingPanel`, the figures the opening priced the town from. The housing engine's reader of today's figures, `townFigures(api, placeId)` (`src/core2/modules/housing.ts`, line 2181, the one its own review uses), is never read by the screen.

**Fix.** `housingRows` reads `townFigures` for the typical rent and home value. Where the town has no renter or no owned home on record (a median of nothing), the opening's figure stands. A drawn-place test plays a year and checks that the screen's two rows equal `townFigures`.

**Time box.** 1 hour

**Rules.** An effect is a read, not a record: the screen reads the same figures the housing engine decides by. One rule, all 56 places: the reader is the town's own, in every place.

**Done when.** `src/bench/metrics-homes-today.test.ts` passes in two drawn places, and a second session sees, on the bench on main, a drawn life played a year whose Metrics rent or home value differs from the opening day's (screenshots of both with the place and seed).

**Waits on.** Nothing.

**Files.** src/bench/metrics.ts, src/bench/metrics-homes-today.test.ts

**Notes.** "Rentals standing empty" also did not move in the same year in Crestview (2 at the opening and a year on) while renting households fell from 21 to 15; that row reads the building panel's stock and is not changed here.
