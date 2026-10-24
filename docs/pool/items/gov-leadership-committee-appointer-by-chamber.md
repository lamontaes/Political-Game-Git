---
id: gov-leadership-committee-appointer-by-chamber
title: "Each chamber's committees are seated by the hand its own rules name"
area: gov
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** assigner() in src/core2/modules/leadership.ts takes who seats a chamber's committees from the chamber's template in data/research/legislature/chamber-leadership.json, so every state senate's presiding officer and every house's speaker seats its committees. The research of Oct 23, 2026 (data/research/gov/chamber-committee-appointment-2026.json, one row per chamber for all 108 state, territorial and council chambers) read 27 chambers' own adopted rules, and 16 of them seat committees through another hand: a committee on committees, the majority leader, seniority choice, a vote of the chamber, each party caucus seating its own members, or each committee's chair. Have assigner() read the chamber's row by jurisdictionKey and chamberKey before its template (the template stays the fallback for ESTIMATED rows), seat minority members through the minority leader where the row says so, and retire the seniority fallback in committeeStage of src/core2/modules/legislature.ts once every played chamber is seated by leadership, resolving SG-GOV-committee-structure.

**Rules.** One rule, all 56 places: the appointing hand comes from the chamber's row in data, never a state named in logic. No dice: the appointer still chooses members from its own ratings of them (party, closeness, interest), never a draw. An effect is a read, not a record: committeeStage reads the roster the appointer seated at the moment a bill is referred.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body), the drawn state's chambers seat their committees by the hand their research row names (leadership committee record ids such as office:<chamber>:finance with assignedBy matching the row), and a test in src/core2/leadership.test.ts shows a chamber whose row names the majority leader seated by the majority leader.

**Files.** src/core2/modules/leadership.ts, src/core2/modules/legislature.ts, data/research/gov/chamber-committee-appointment-2026.json, data/research/legislature/chamber-leadership.json

**Notes.** TODO
