---
id: gov-legislature-roster-size-data
title: "Four legislative chambers' member rosters hold a different number of members than their legal size"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: fixer, Oct 27 (found by the roster district-name PR's all-56-places test)
claimed-at:
---

**What.** After the district-name matcher in src/core2/offices-state.ts was made one rule for every place, four chambers still seat a number of seats that differs from their legal size in data/research/offices/state-offices.json, because their member rosters in data/research/offices/legislature-party-counts-2026.json hold a different number of members than the legal size. They are Maine's House (153 seats against 151), New Hampshire's House (386 against 400), and Puerto Rico's Senate (28 against 27) and House (53 against 51). The matcher is not the cause: every roster member sits in one seat, and the surplus or shortfall is in the roster data itself.

**Rules.** One rule, all 56 places: fix the roster data from its source (the Open States roster and the state's own member list), never a per-state exception in code, and mark any value that stays an estimate with its source and spread.

**Done when.** The all-56-places test in src/core2/offices-state.test.ts, "seats each chamber at its legal size", finds no chamber whose roster disagrees with its legal size, with the expected-disagreement list in that test emptied, and the played-world case passes in a drawn place with the seed named.

**Files.** data/research/offices/legislature-party-counts-2026.json, data/research/offices/state-offices.json, src/core2/offices-state.test.ts

**Notes.** Found by the fixer on PR #6116, Oct 27. The test lists exactly these four chambers as known disagreements so a new one fails the test.
