---
id: office-appointments
title: "Appointments:"
area: office
kind: feature
priority: 2
status: done
claimed-by: claude/office-appoint-act
pr: #4819
blocked-on:
milestone:
source: "docs/coordination/OFFICE-LOCAL.md line 29 (unchecked checklist line)"
claimed-at: 2026-10-16T20:56:37.435Z
---

**What.** Checked against main on Oct 16: PARTLY. The engine takes an appointer's choice (`appoint()` in `modules/executive.ts`, `nominateAndConfirm` with the appointer's reasons and the council's confirmation), but nothing outside executive.ts calls it, and there is no removal. Next: A local "name a department head" act registered in `office-day-acts.ts` that calls `appoint`: the player picks among qualified candidates, the council confirms where the place requires, and the choice is a record the department and its hiring read. Removal is a second step. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** No dice: when the player does not choose, the character names the head from alignment, qualification and acquaintance, never a roll; An effect is a read, not a record: the department and its hiring read the head record at the moment they act; Ask why: the nomination and any rejection keep reasons by record id; The chain is the acceptance: follow one appointment to the confirmation vote, the department's changed decision or hire, and a person it reached; One rule, all 56 places: which posts exist and who confirms comes from place data, with no place named in code; This is a game, not a spreadsheet: naming a head is one choice among candidates, not a form; No hand-written player text: candidate descriptions and results are worded by the English engine.

**Done when.** A test beside the office-day-acts tests shows an `appointment:town:<post>` record id, the council vote's reasons by record id and a later hire that cites the appointment, in a drawn place (buildBenchWorld, seed named in the PR body). The owner plays it: A local "name a department head" act registered in `office-day-acts.

**Files.** src/core2/appointments.ts, src/core2/office-day-acts.ts, src/core2/modules/office-day.ts, src/core2/modules/staff.ts, src/core2/modules/executive.ts

**Notes.** Checklist line from OFFICE-LOCAL.md; verify against main before starting.
