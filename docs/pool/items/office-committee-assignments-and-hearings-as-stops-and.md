---
id: office-committee-assignments-and-hearings-as-stops-and
title: "Committee assignments and hearings as stops and scenes."
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-STATE.md line 19 (unchecked checklist line)"
---

**What.** A state legislator's committees and hearings are data and legislature records, but they are not stops or scenes in the office day, so the player cannot sit in a hearing or learn his committee seat. Add committee assignment as an event in the office day (the leader assigns the seat, the player learns it) and hearings as stops the player may attend, with witnesses and a chair's questions. The player would notice a hearing on his bill with named witnesses and a vote he can take part in.

**Rules.** An effect is a read, not a record: the hearing reads the bill's sections and the members' stances, and the assignment reads the leader's decision; Ask why: each assignment and each hearing outcome keeps its reasons by record id; One rule, all 56 places: committee structure and hearing rules come from `src/core2/data/legislature/committees.json` and state data for all 56 places; No hand-written player text: chair questions and witness lines come from the English engine's banks (`data/english/parts/hearing.json`); This is a game, not a spreadsheet: attending is a stop the player opts into; skipping lets his character act; No dice: attendance and testimony follow interests and traits, never a roll.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): as a state legislator the bench player is assigned a committee seat (assignment record named) and a hearing on a bill appears as a stop with witnesses and a chair's question, whose result is the committee vote by record id. Tests beside `src/core2/office-day-state.ts` tests and `office-day-calendar.test.ts`. The owner plays it: attends a hearing and testifies.

**Files.** src/core2/office-day-state.ts, src/core2/office-day-registry.ts, src/core2/legislature-committees.ts, src/core2/data/legislature/committees.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.
