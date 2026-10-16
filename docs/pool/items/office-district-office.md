---
id: office-district-office
title: "District office:"
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-STATE.md line 21 (unchecked checklist line)"
---

**What.** A state legislator has no district office in the office day: no office hours and no casework from constituents. Add the district office as an act (office hours at the district week on the calendar) that takes cases from named constituents routed by the constituent-cases engine, and lets the member or staff work them. The player would notice constituents' cases arriving in the district week and a staffer working on the ones he leaves.

**Rules.** An effect is a read, not a record: the member's desk reads case records and the agency reads the inquiry at the moment it decides; Ask why: an outcome keeps the agency's reason by record id; The chain is the acceptance: follow one constituent's case to the member, the inquiry, the answer and the resident's changed situation; One model, two tiers: counted residents' cases reach the member by the same rule as full ones times their count; only filled-in people are met; No dice: which cases arise follows people's circumstances, never a roll; One rule, all 56 places: the district week and staffing come from state data for all 56 places; This is a game, not a spreadsheet: no form; a case is a person and a choice; Speed: cases route on the day they arise.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): as a state legislator in the district week the bench player holds office hours that list named constituents' cases (case, resident ids) with one resolved by him and one by staff; tests beside `src/core2/office-day-state.ts` tests. The owner plays it: sits at his district office and helps a constituent.

**Files.** src/core2/office-day-state.ts, src/core2/modules/constituent-cases.ts, src/core2/modules/staff.ts, src/core2/data/office-day/state-parameters.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.
