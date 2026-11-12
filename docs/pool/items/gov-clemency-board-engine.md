---
id: gov-clemency-board-engine
title: "Clemency boards and councils decide petitions where state law gives them the power"
area: gov
kind: stopgap
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** In states where a board, council or senate holds or must concur in clemency, the governor's day has no clemency act and no one is released by clemency. Build a small clemency board: members appointed per the state's data, petitions from prisoners in the justice engine, and recommendations read by the governor's act where the law requires them. Governor-alone clemency already exists. This closes the stopgap `SG-GOV-clemency-boards`.

**Cause.** Found in code: `src/core2/office-day-state.ts` (lines 461 to 468) runs one clemency review each review day where the governor decides (`clemencyAuthority(office.stateKey)`); the stopgap `SG-GOV-clemency-boards` (row in `src/core2/data/stopgaps/gov.json`) marks the missing board; `src/core2/office-day-clemency.test.ts` covers governor-alone.

**Fix.** Add a small clemency board (members per the state's data, petitions from the justice engine, recommendations the governor's act reads where the law requires them), and make who holds clemency a data row per state read by `clemencyAuthority`. Resolve the stopgap row.

**Time box.** 8 hours for one opus session.

**Rules.** No dice: a board member's vote reads their traits and the petitioner's record. One rule, all 56 places: who holds clemency lives in data per state. An effect is a read, not a record: the governor's act reads the board's recommendation.

**Done when.** A second session plays a year in a drawn state whose board holds clemency (state and seed named) and sees a petition and the board's recommendation recorded by id and the governor's act read it; a person is released or refused by clemency in the justice records. `src/core2/office-day-clemency.test.ts` covers the case.

**Waits on.** Nothing.

**Files.** src/core2/office-day-state.ts, src/core2/modules/justice.ts, src/core2/data/stopgaps/gov.json, src/core2/office-day-clemency.test.ts

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-GOV-clemency-boards. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). A clemency board in the few states that have one; governor-alone clemency exists and courts come after early access.
