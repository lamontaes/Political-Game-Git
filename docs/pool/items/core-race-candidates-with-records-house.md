---
id: core-race-candidates-with-records-house
title: "Territory and out-of-town U.S. House races draw fictional candidates with records, from the people engines' who-runs decision"
area: core
kind: stopgap
priority: 3
size: M
status: claimed
claimed-by: claude/fs11vb-rch
pr: #5340
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T14:26:53.554Z
---

**What.** Races the town does not vote in (U.S. House seats in other districts and territories) are decided today between the seat holder and each party's typical challenger, with no person behind either name. Give each such race named fictional candidates with a record: who runs comes from the people engines' who-runs decision, seeded generation of who exists, and each candidate has the campaign the town's own races use. The race still counts on the same engine as the town's races. This is the first half of the split of core-world-race-lean-candidates (row SG-GOV-world-race-lean in src/core2/modules/world-races.ts, function decide).

**Rules.** One model, two tiers: a candidate is a full person only when the player meets or looks them up, and is a counted name otherwise. No dice: who runs follows traits, ambition and the seat, never a chance. One rule, all 56 places: nothing names a state or territory in code. Replace, never layer: the typical-candidate path is deleted in the same change.

**Done when.** In a one-year played world (buildBenchWorld, a place drawn from all 56, seed named) every U.S. House race the town does not vote in shows two or more named candidates by record id, each filed through the same filing path as the town's races, and the stopgap row SG-GOV-world-race-lean no longer names candidates. The test is a new case in src/core2/world-races.test.ts.

**Files.** src/core2/modules/world-races.ts, src/core2/modules/candidacy.ts, src/core2/data/stopgaps.json

**Notes.** Split out of core-world-race-lean-candidates (L). The legislative-district results half is gov-legislative-district-results-2024. Claude, Oct 20.

Partly built Oct 20 (claude/political-game-pool-yucp92-l): each out-of-town race now names its two candidates (the seat's holder, and a challenger drawn from the world's seed and the seat) and seats the winner as the person named; the typical-candidate draw at seating is deleted. Still open: the who-runs decision from the people engines, and a record and campaign for each candidate.
