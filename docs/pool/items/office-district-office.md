---
id: office-district-office
title: "District office:"
area: office
kind: feature
priority: 2
status: done
claimed-by: claude/office-district-office
pr: #4786
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/OFFICE-STATE.md line 21 (unchecked checklist line)"
claimed-at: 2026-10-16T17:09:05.706Z
---

**What.** Checked against main on Oct 16: PARTLY. The state day already adds a district-office entry on district days and interim workdays; its act holds office hours and calls `casesFor` and `handleCase`, the cases engine already routes to state legislators, and staff handle cases the member does not. What is missing is the proof and a screen: no test imports office-day-state and nothing in src/bench reads the entry. Next: Prove the district office end to end, and give it a surface on the politics screen. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** An effect is a read, not a record: the member's desk reads case records and the agency reads the inquiry at the moment it decides; Ask why: an outcome keeps the agency's reason by record id; The chain is the acceptance: follow one constituent's case to the member, the inquiry, the answer and the resident's changed situation; One model, two tiers: counted residents' cases reach the member by the same rule as full ones times their count; only filled-in people are met; No dice: which cases arise follows people's circumstances, never a roll; One rule, all 56 places: the district week and staffing come from state data for all 56 places; This is a game, not a spreadsheet: no form; a case is a person and a choice; Speed: cases route on the day they arise.

**Done when.** A test in `src/core2/office-day-state.test.ts` (new), in a drawn state (buildBenchWorld, seed named in the PR body), lists named case and resident ids with one case `handledBy` the official and one by staff, and the resident's later change in view reads the outcome by record id. The owner plays it: Prove the district office end to end, and give it a surface on the politics screen.

**Files.** src/core2/office-day-state.ts, src/core2/modules/constituent-cases.ts, src/core2/modules/staff.ts, src/core2/data/office-day/state-parameters.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.
