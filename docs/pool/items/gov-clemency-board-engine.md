---
id: gov-clemency-board-engine
title: "Clemency boards and councils decide petitions where state law gives them the power"
area: gov
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In states where a board, council or senate holds or must concur in clemency, the governor's day in src/core2/office-day-state.ts has no clemency act and no one is released by clemency. Build a small clemency board: members appointed per the state's data, petitions from prisoners in the justice engine, and recommendations read by the governor's act where the law requires them. Closes SG-GOV-clemency-boards.

**Rules.** No dice: a board member's vote reads their traits and the petitioner's record. One rule, all 56 places: who holds clemency lives in data per state.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn state whose board holds clemency, with a seed named, a petition and the board's recommendation are recorded by id and the governor's act reads it, checked in src/core2/office-day-state.test.ts.

**Files.** src/core2/office-day-state.ts, src/core2/modules/justice.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-GOV-clemency-boards.
