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
standard: 2
model: opus
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** Group-quarters residents are counted room records (core-group-quarters-population), and the voting, candidacy and campaign engines read them as households. Counted residents of adult correctional rooms vote at the town's counted scale and can be drawn to run for a local seat, though the state's barred share only covers prisoners on average, not concentrated in a prison town (stopgap `SG-GQ-counted-prisoners-vote`). A canvasser's doors include prison cells and nursing-home rooms (stopgap `SG-GQ-campaign-doors`). The prerequisite item core-group-quarters-population is done. Seen: election results and the ballot, where a prison town's counted prisoners no longer vote or run.

**Cause.** Found in code: stopgap markers `SG-GQ-counted-prisoners-vote` in `src/core2/modules/voting.ts` (line 3494, `countedScale`) and `src/core2/modules/candidacy.ts` (line 1162, `countedScreen`) and `SG-GQ-campaign-doors` in `src/core2/campaign-day.ts` (line 232, `townHouseholdCount`); rows in `src/core2/data/stopgaps/gq.json`.

**Fix.** Drop barred correctional rooms from the counted electorate and the candidacy draw where the state's law bars them (`incarceratedMayVote` in `src/core2/justice-law.ts`, taken out of the state's barred share so no one is barred twice), drop institutional rooms from campaign doors, and resolve both stopgaps.

**Time box.** 6 hours for one opus session.

**Rules.** One model, two tiers: the counted voter loops and the candidacy draw skip correctional rooms by the same rule a full person in custody follows, times their count. Wire to the world: whether incarcerated people may vote is the state's law in force, read when the electorate is counted. One rule, all 56 places.

**Done when.** A second session plays a world (`buildBenchWorld`) in a drawn place with an adult correctional count above zero (place and seed named) and sees the town's counted electorate and its candidacy draw leave the correctional rooms out where the state's law bars them, by room record id, and the town's campaign doors leave institutional rooms out; `SG-GQ-counted-prisoners-vote` and `SG-GQ-campaign-doors` are resolved in `src/core2/data/stopgaps/gq.json`.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/candidacy.ts, src/core2/campaign-day.ts, src/core2/law-reach/group-a-voting.ts, src/core2/justice-law.ts, src/core2/data/stopgaps/gq.json

**Notes.** Markers: src/core2/modules/voting.ts (countedScale), src/core2/modules/candidacy.ts (countedScreen), src/core2/campaign-day.ts (townHouseholdCount).
