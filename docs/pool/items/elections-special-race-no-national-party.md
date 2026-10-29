---
id: elections-special-race-no-national-party
title: "A special election crashes the played year with \"No national party on side 0\" (red on main, M0-13 in Rosewood Heights, Illinois)"
area: elections
lead: wire-elections
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "Traits lead, Oct 28 (golden-path-year on PR #6684)"
---

**What.** The accepted golden-path spec M0-13 crashes its played year on clean main (db2394347f) in Rosewood Heights, Illinois (place key 1765884, seed e0e5e7681e83f0ada20e3c3d1357cf74cd19dd8cadacdb8c668b42d39b83bdc8): `Error: No national party on side 0` at `nationalParty` (src/core2/appointments.ts:118), from `partyOnSideIn` (src/core2/modules/voting.ts:4320), `decide` (:4402), `decideSpecial` (:3624) and `raceWork` (:3538). Every check after the crash fails, so golden-path-year is red on any PR whose commit draws this place for M0-13 (PR #6684 did). A special election asks for the national party on a side the world has no party for, and the engine throws instead of reading what the race's records hold.

**Rules.** One engine per mechanic: the fix is in the one election-day engine's special race, reading the parties the world's records hold, with no second path for special elections. One rule, all 56 places: no state, city or party named in logic. Unknown facts are not zero or permission: a side with no party is a recorded absence the race reads, not a crash.

**Done when.** `GOLDEN_PATH_SEED=e0e5e7681e83f0ada20e3c3d1357cf74cd19dd8cadacdb8c668b42d39b83bdc8 GOLDEN_PATH_PLACE_KEY=1765884 node --max-old-space-size=8192 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` plays the year in Rosewood Heights, Illinois without the throw, the special race that crashed it is named by its contest record id in the PR body, and a test in src/core2 reproduces the special race with no party on one side and fails before the fix.

**Files.** src/core2/modules/voting.ts, src/core2/appointments.ts

**Notes.** Found Oct 28 by the traits lead: reproduced on clean main and on the integrity family's branch with the same stack. Related: `tests-party-filing-no-join-in-six-draws` mentions an earlier vacant-seat special race fix.
