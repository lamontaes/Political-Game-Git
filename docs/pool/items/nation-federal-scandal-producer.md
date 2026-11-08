---
id: nation-federal-scandal-producer
title: "A federal official's recorded act becomes public through the press, so the President's approval can move by a scandal"
area: gov
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Nothing produces a federal-level scandal: the corruption engine (corruption.ts) records bribes by the town's officials only, so the national opinion engine's pushes table (national-opinion.ts, pushOpinion) has no scandal to read. Add a producer through the existing engines: an official of the President's cabinet or Congress (people-pack officials, the cabinet the unplayed President fills in president-acts.ts) commits a recorded act, the press reports it (scandalsOf / press tipOff), and the national opinion engine pushes approval by the sized effect the research gives (Iran-Contra: 63 to 47 in two months, recovered over about 20 months; Watergate: 62 to 24 over 21 months; Gallup, news.gallup.com/poll/4258).

**Rules.** No dice: the act follows the official's traits, money and chances, never a monthly chance. Knowing is a read: approval moves only for an act the public learned of through the press. One engine: the corruption engine's records, not a second scandal system. A push is sourced, with its half-life from the dated readings.

**Done when.** In a one-year played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a federal official's recorded act is reported by the press and the next approval row cites the act's record id and a negative push; src/core2/federal-scandal.test.ts proves it.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/national-opinion.ts, src/core2/modules/press.ts, src/core2/federal-scandal.test.ts

**Notes.** Found by Nation, Nov 8: the Coordinator asked for this item when approval moved by disasters was ruled out (Gallup finds little evidence Katrina moved job approval). pushOpinion is the writer waiting for it.
