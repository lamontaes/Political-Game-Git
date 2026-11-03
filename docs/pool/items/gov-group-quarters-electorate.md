---
id: gov-group-quarters-electorate
title: "Counted prisoners vote, run for office and answer the door like any household in a prison town"
area: gov
lead: governing
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-group-quarters-population
source: speed lead, Nov 1, review of core-group-quarters-population
claimed-at:
---

**What.** Group-quarters residents are counted room records (core-group-quarters-population), and the voting, candidacy and campaign engines read them as households. Counted residents of adult correctional rooms vote at the town's counted scale and can be drawn to run for a local seat, though the state's barred share only covers prisoners on average, not concentrated in a prison town (stopgap SG-GQ-counted-prisoners-vote). A canvasser's doors include prison cells and nursing-home rooms (stopgap SG-GQ-campaign-doors).

**Rules.** One model, two tiers: the counted voter loops and the candidacy draw skip correctional rooms by the same rule a full person in custody follows, times their count. Wire to the world: whether incarcerated people may vote is the state's law in force (incarceratedMayVote, src/core2/justice-law.ts), read when the electorate is counted, and the prison part comes out of the state's barred share so no one is barred twice.

**Done when.** In a played world (buildBenchWorld) in a drawn place with an adult correctional count above zero, place and seed named, a test in src/core2 shows the town's counted electorate and its candidacy draw leave the correctional rooms out where the state's law bars them, by room record id, the town's campaign doors leave institutional rooms out, and SG-GQ-counted-prisoners-vote and SG-GQ-campaign-doors are resolved.

**Files.** src/core2/modules/voting.ts, src/core2/modules/candidacy.ts, src/core2/campaign-day.ts, src/core2/law-reach/group-a-voting.ts

**Notes.** Markers: src/core2/modules/voting.ts (countedScale), src/core2/modules/candidacy.ts (countedScreen), src/core2/campaign-day.ts (townHouseholdCount).
