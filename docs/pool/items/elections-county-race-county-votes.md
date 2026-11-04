---
id: elections-county-race-county-votes
title: "A county race counts the rest of the county's voters, not just the town's"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Step A of elections-county-race-sees-only-the-town. A county seat's election counted only the played town's voters (race-places.ts basePlaces gave a local race no wider places), as if the town were the county. The rest of the county is already counted coarsely for statewide races (electorate-places.ts statePlaces, by county), so a county office's race can count it on the same engine, with the town as home.

**Rules.** One model, two tiers: the rest of the county votes on the counted residents' engine, re-placed and weighted to the county's eligible voters, never a second model. One rule, all 56 places: the county comes from the town's recorded county; a town with none votes alone. Replace, never layer: the one place list every reader uses (voting, petitions, campaign reach) gains the county.

**Done when.** In a played world in a place drawn from all 56 (name and seed printed), a decided county contest's result counts the rest of the town's county by its place record id beside the town's named and counted voters, a town race does not, and the test fails when the county is taken out of the race's places; a second fresh draw passes.

**Files.** src/core2/race-places.ts, src/core2/county-race-county-votes.test.ts

**Notes.** Lane 1, Nov 4: built on governing/county-votes.
