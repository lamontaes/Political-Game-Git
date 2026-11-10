---
id: elections-polling-places-by-building-kind
title: "Precincts vote in the town's own buildings of fitting kinds"
area: elections
kind: feature
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: elections
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** Every precinct of a town votes in one building: the first government building in the town's records, or no building with the kind unread where the town records none. The EAC's 2024 EAVS gives each place's precincts and polling places, and one state's measured list shows the buildings voters use (religious 31 percent, government 19, schools and libraries 15, public safety 14, community and club 12, commercial and other 9). Read `data/research/elections/eavs-2024-polling-places.json` in `pollingPlaces()`: give the town as many polling places as its precincts share at its place's EAVS ratio, each in one of the town's own recorded buildings of a fitting kind, and record that kind on the row. The election-day scene and the poll workers then read the building the precinct votes in.

**Cause.** Found in code: `src/core2/modules/voting.ts` `pollingPlaces` (line 2591) gives every precinct the town's first municipal-government organization and registers the stopgap `SG-GOV-polling-place-kind` (line 2618) when the town records none; the research file `data/research/elections/eavs-2024-polling-places.json` exists and is not read there.

**Fix.** In `pollingPlaces`, read the place's precincts-per-polling-place ratio from the EAVS file, make that many polling places, assign each to one of the town's own recorded buildings of a fitting kind (by size and where the precinct's households live), and record the kind on the row. Remove the stopgap marker and its row in the same change.

**Time box.** 6 hours for one sonnet session.

**Rules.** One rule, all 56 places: the precincts per polling place and the kind shares are read per place from the research file, never a state named in code. No dice: which building a precinct uses follows from the town's recorded buildings, their size and where the precinct's households live, never a seeded draw against the shares; the shares are what the proof reports, not a pass or fail (owner, Nov 8: ranges are not targets). Replace, never layer.

**Done when.** A second session plays a year of a world (`buildBenchWorld`, a drawn place from all 56, seed named) and sees the town's polling-place rows name recorded buildings by record id, of more than one kind where the town records them, with the precincts per polling place read from the place's EAVS row (reported beside the figure). `SG-GOV-polling-place-kind` is not in `core.stopgapHits`, and `src/core2/voting.test.ts` and `src/core2/polling-places.test.ts` pass.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, data/research/elections/eavs-2024-polling-places.json, src/core2/polling-places.test.ts, src/core2/polling-place-building.test.ts, src/core2/voting.test.ts, src/core2/data/stopgaps/gov.json

**Notes.** TODO

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would spread precincts across church, school and government buildings by the EAVS shares; the polling scene already has a building and a player cannot tell the shares.
