---
id: elections-polling-place-misses-town-government
title: "A town's polling places get no building: the lookup skips a municipal government recorded as service:municipal-government"
area: elections
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/polling-place-town-government
pr: #5911
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T06:30:40.716Z
---

**What.** pollingPlaces() in src/core2/modules/voting.ts picks the building for each precinct from the town's organizations whose classification starts with government: or whose kind is government or local-government. A town government recorded with classification service:municipal-government, the classification the disasters engine and the law-reach group B code read, matches neither test. So every precinct votes at a polling place with no building and kind unread, and the SG-GOV-polling-place-kind stopgap is hit even where the town has a town hall.

**Rules.** Wire to the world: a polling place is a real building in the town, so the lookup must read the municipal government record the other engines already read, in every one of the 56 places, never a named place.

**Done when.** In a played world built with buildBenchWorld in a place drawn from all 56 (seed named in the PR), the town's polling-place rows name the municipal government organization's record id as their building; a test in src/core2/modules/voting.test.ts (or the elections tests) fails when the classification check is undone. Seen first in Tarpon Springs, Florida, seed 2eadf2dbc7e6: 4 precincts, no building.

**Files.** src/core2/modules/voting.ts

**Notes.** Found Oct 23 by the research-elections-sourced-parameters proof year (scripts/research/elections-year.ts).
