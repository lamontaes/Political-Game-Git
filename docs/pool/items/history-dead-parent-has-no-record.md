---
id: history-dead-parent-has-no-record
title: "Golden path M0-06 is red: a parent who died before day one is named on the survivor's fact but has no person record"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Golden path spec M0-06 (src/core2/m0-life-at-18.test.ts) checks that every family fact names its relative by a person record. A parent who died before day one is kept only as names on the survivor's fact (src/core2/population.ts, familyFacts, the family:parent-died fact built from opening-kin.ts deaths), so the check fails. It was rare while the window before the start was one year; f244a9d216 (Oct 28 15:04, the pre-start window starts at the player's birth year) widened it to the player's whole life, so an 18-year-old often has a parent who died. Reproduced on main 37d1b0bc92 in Perry, Utah (place 4959390, seed 0348e538206ef93d3f5193a439b5266a73a878a4e5cf090f20b58e26f54ebd59): Michelle Little, the player's mother, died 2020-12-24 with no record.

**Rules.** One history: the dead parent is a record every engine and view reads the same way, never a second store of names. Wire to the world: a person record that is dead must not count as living in any engine that reads people (population size, voters, households, jobs), so every reader of core.people that does not filter the living is found and checked. No dice: who died is the life table's, as now.

**Done when.** src/core2/m0-life-at-18.test.ts passes with GOLDEN_PATH_SEED=0348e538206ef93d3f5193a439b5266a73a878a4e5cf090f20b58e26f54ebd59 GOLDEN_PATH_PLACE_KEY=4959390 and on three fresh drawn places named in the PR body, the family:parent-died fact names a person record that is not alive, and a one-year buildBenchWorld run of the same place shows the town's counted population and voters unchanged by the new records.

**Files.** src/core2/population.ts,src/core2/opening-kin.ts,src/core2/person-state.ts,src/core2/m0-life-at-18.test.ts

**Notes.** lead: cto. Filed by the standing red-main owner Oct 28 22:55 UTC; not built there because it adds dead people to the opening, a change every engine reading people sees. Read: OWNER-DECISIONS (Oct 28: one history), DECISION-REGISTER; searched docs/pool/items for parent-died, family fact: none.
