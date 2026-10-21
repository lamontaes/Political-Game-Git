---
id: core-race-candidates-with-records-house
title: "Territory and out-of-town U.S. House races draw fictional candidates with records, from the people engines' who-runs decision"
area: core
kind: stopgap
priority: 3
size: M
status: claimed
claimed-by: claude/house-candidates
pr: #5340
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T15:22:43.811Z
---

**What.** Races the town does not vote in (U.S. House seats in other districts and territories) are decided today between the seat holder and each party's typical challenger, with no person behind either name. Give each such race named fictional candidates with a record: who runs comes from the people engines' who-runs decision, seeded generation of who exists, and each candidate has the campaign the town's own races use. The race still counts on the same engine as the town's races. This is the first half of the split of core-world-race-lean-candidates (row SG-GOV-world-race-lean in src/core2/modules/world-races.ts, function decide).

**Rules.** One model, two tiers: a candidate is a full person only when the player meets or looks them up, and is a counted name otherwise. No dice: who runs follows traits, ambition and the seat, never a chance. One rule, all 56 places: nothing names a state or territory in code. Replace, never layer: the typical-candidate path is deleted in the same change.

**Done when.** In a one-year played world (buildBenchWorld, a place drawn from all 56, seed named) every U.S. House race the town does not vote in shows two or more named candidates by record id, each filed through the same filing path as the town's races, and the stopgap row SG-GOV-world-race-lean no longer names candidates. The test is a new case in src/core2/world-races.test.ts.

**Files.** src/core2/modules/world-races.ts, src/core2/modules/candidacy.ts, src/core2/data/stopgaps.json

**Notes.** Split out of core-world-race-lean-candidates (L). The legislative-district results half is gov-legislative-district-results-2024. Claude, Oct 20.

Partly built Oct 20 (claude/political-game-pool-yucp92-l): each out-of-town race now names its two candidates (the seat's holder, and a challenger drawn from the world's seed and the seat) and seats the winner as the person named; the typical-candidate draw at seating is deleted. Still open: the who-runs decision from the people engines, and a record and campaign for each candidate.

Sent back 2026-10-20 from PR #5340 (branch claude/political-game-pool-yucp92-l): merge conflict with main in code; merge main and resolve; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5340 (branch claude/political-game-pool-yucp92-l): world-races.test.ts fails all 3 tests with main merged: Error 'Module has no registered state.'; finish on that branch, merge main into it first.
Oct 21 (fixer): merged main; world-races.test.ts passes (3 of 3) on the merged result, so the no-registered-state failure was main's and is already fixed there; conflicts resolved (stopgap row keeps the named-candidates text at its new marker line).
