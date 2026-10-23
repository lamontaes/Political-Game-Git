---
id: elections-polling-places-by-building-kind
title: "Precincts vote in the town's own buildings of fitting kinds"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Every precinct of a town votes in one building: the first government building in the town's records, or no building with the kind unread where the town records none (SG-GOV-polling-place-kind). The EAC's 2024 EAVS gives each place's precincts and polling places, and one state's measured list shows the buildings voters use (religious 31 percent, government 19, schools and libraries 15, public safety 14, community and club 12, commercial and other 9). Read data/research/elections/eavs-2024-polling-places.json in pollingPlaces(): give the town as many polling places as its precincts share at its place's EAVS ratio, each in one of the town's own recorded buildings of a fitting kind, and record that kind on the row. The election-day scene and the poll workers then read the building the precinct votes in.

**Rules.** One rule, all 56 places: the precincts per polling place and the kind shares are read per place from the research file, never a state named in code. No dice: which building a precinct uses follows from the town's recorded buildings, their size and where the precinct's households live, never a seeded draw against the shares; the shares are the band the proof checks.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR), the town's polling-place rows name recorded buildings by record id, of more than one kind where the town records them, the precincts per polling place land in the place's EAVS band, SG-GOV-polling-place-kind is not in core.stopgapHits, and src/core2/voting.test.ts passes.

**Files.** src/core2/modules/voting.ts, data/research/elections/eavs-2024-polling-places.json

**Notes.** TODO
