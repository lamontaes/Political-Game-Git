---
id: office-appointments
title: "Appointments:"
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-LOCAL.md line 29 (unchecked checklist line)"
---

**What.** A mayor, county executive or manager in the office-day engine has department heads, but the player cannot name or remove them, because the appointer's own choice is not exported from GOV. Build the act: the player (or his character, when he leaves it) picks among qualified candidates and confirms with the council where the place requires, or removes a head, and the choice becomes a record the department and its staff read. `nominateAndConfirm` in `src/core2/appointments.ts` already returns the appointer's reasons. The player would notice a new police chief or finance director he chose, the council voting on him, and the department's budget and staff changing under the new head.

**Rules.** No dice: when the player does not choose, the character names the head from alignment, qualification and acquaintance, never a roll; An effect is a read, not a record: the department and its hiring read the head record at the moment they act; Ask why: the nomination and any rejection keep reasons by record id; The chain is the acceptance: follow one appointment to the confirmation vote, the department's changed decision or hire, and a person it reached; One rule, all 56 places: which posts exist and who confirms comes from place data, with no place named in code; This is a game, not a spreadsheet: naming a head is one choice among candidates, not a form; No hand-written player text: candidate descriptions and results are worded by the English engine.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a council or mayor seat the bench player holds names a department head through the office day, the confirming body votes with reasons, and the department's next hire or decision cites the new head (appointment, vote and department record ids named). Tests beside `src/core2/office-day-acts.ts` tests and `appointments.test.ts`. The owner plays it: as mayor, picks a police chief from three candidates and hears the council vote.

**Files.** src/core2/appointments.ts, src/core2/office-day-acts.ts, src/core2/modules/office-day.ts, src/core2/modules/staff.ts, src/core2/modules/executive.ts

**Notes.** Checklist line from OFFICE-LOCAL.md; verify against main before starting.
