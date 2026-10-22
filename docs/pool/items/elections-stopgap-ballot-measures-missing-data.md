---
id: elections-stopgap-ballot-measures-missing-data
title: "Stopgaps in ballot-measures (missing-data): 1 open"
area: elections
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
after: elections-counted-voters-read-group-stances
size: M
source: "src/core2/data/stopgaps.json, src/core2/modules/ballot-measures.ts, kind missing-data"
claimed-at:
---

**What.** Replace SG-GOV-measure-groups-stand-in in countMeasure (src/core2/modules/ballot-measures.ts). The town's named adults vote from viewOn and their traits, but the rest of the state votes as even lean bands around the state's 2024 presidential lean, each band's yes share found by shareFavoring from personStance and publicOffset. Count the unnamed voters instead as the state's counted voter groups: each ElectoratePlace block from statePlaces(usps) in src/core2/electorate-places.ts (county or place, with its 2024 votes and lean) casts yes and no by the same stance rule a full person uses on the question, times the group's count, with turnout from cpsTurnout and the cycle, so a measure's result differs by region and by who the groups are.

**Rules.** One model, two tiers: the counted groups read the question with the same stance formation as full people (the counted-group stance rule of elections-counted-voters-read-group-stances), times their count, with no separate band formula. No dice: a group's yes share follows its stance, turnout and the law, never a roll, and the 2024 vote only sizes the groups. Sliding scales and causes: a small gap in stance moves the result a few points, not a flip (owner, Oct 20 on vote swings). Replace, never layer: shareFavoring, the lean-band spread and the api.stopgap call are deleted in the same change. One rule, all 56 places: the state comes from the town's law chain and no state is named.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, a statewide measure on the ballot is counted with each county block voting from its group stances, and two blocks of different lean and traits give different yes shares, shown by the measure result record id and the block ids; src/core2/ballot-measures.test.ts proves it and SG-GOV-measure-groups-stand-in is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/modules/ballot-measures.ts, src/core2/electorate-places.ts, src/core2/campaign-views.ts, src/core2/ballot-measures.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: On a statewide ballot measure, the voters the world doesn't name vote as even lean bands around the state's 2024 presidential lean, sized by the state's 2024 vote, each band voting its own view of the question (no separa

Oct 20 (pool feeder): spec written; it waits on the counted-group stance rule (elections-counted-voters-read-group-stances, in a PR), which is what 'CORE voter groups populated and PEOPLE's views' now means; the old blocker text is stale since voter groups are populated by statePlaces blocks.
