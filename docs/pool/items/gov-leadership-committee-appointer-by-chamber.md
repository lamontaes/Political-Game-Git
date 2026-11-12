---
id: gov-leadership-committee-appointer-by-chamber
title: "Each chamber's committees are seated by the hand its own rules name"
area: gov
kind: stopgap
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
standard: 2
model: sonnet
effort: medium
lead: governing
root: rc9-place-facts-one-default
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** assigner() in src/core2/modules/leadership.ts takes who seats a chamber's committees from the chamber's template in data/research/legislature/chamber-leadership.json, so every state senate's presiding officer and every house's speaker seats its committees. The research of Oct 23, 2026 (data/research/gov/chamber-committee-appointment-2026.json, one row per chamber for all 108 state, territorial and council chambers) read 27 chambers' own adopted rules, and 16 of them seat committees through another hand: a committee on committees, the majority leader, seniority choice, a vote of the chamber, each party caucus seating its own members, or each committee's chair. Have assigner() read the chamber's row by jurisdictionKey and chamberKey before its template (the template stays the fallback for ESTIMATED rows), seat minority members through the minority leader where the row says so, and retire the seniority fallback in committeeStage of src/core2/modules/legislature.ts once every played chamber is seated by leadership, resolving SG-GOV-committee-structure.

**Cause.** Found in code: src/core2/modules/leadership.ts function assigner (line 474, called near line 524) reads only data/research/legislature/chamber-leadership.json; data/research/gov/chamber-committee-appointment-2026.json exists and no source file imports it; stopgap SG-GOV-committee-structure is open in src/core2/data/stopgaps/gov.json.

**Fix.** Have assigner look up the chamber's row in chamber-committee-appointment-2026.json by jurisdictionKey and chamberKey first, with the template as the fallback for ESTIMATED rows. Seat minority members through the minority leader where the row says so, and retire the seniority fallback in committeeStage once every played chamber is seated by leadership. Also take from the dropped gov-standin-legislature-committees: each body's own committee list (SG-GOV-committee-names-national) and the federal proposal coverage row (SG-GOV-federal-proposal-coverage).

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the appointing hand comes from the chamber's row in data, never a state named in logic. No dice: the appointer still chooses members from its own ratings of them (party, closeness, interest), never a draw. An effect is a read, not a record: committeeStage reads the roster the appointer seated at the moment a bill is referred.

**Done when.** A second session, in a played world (buildBenchWorld) in a drawn place from all 56 with a seed the builder did not choose, finds the drawn state's chambers seat their committees by the hand their research row names (leadership committee record ids such as office:<chamber>:finance with assignedBy matching the row), and the test in src/core2/leadership.test.ts shows a chamber whose row names the majority leader seated by the majority leader.

**Waits on.** Nothing.

**Files.** src/core2/modules/leadership.ts, src/core2/modules/legislature.ts, data/research/gov/chamber-committee-appointment-2026.json, data/research/legislature/chamber-leadership.json

**Notes.** TODO

Deferred Oct 25: nothing on screen reads it yet. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Who seats committees in each of 108 chambers; committees are already seated and the player sees no difference.
