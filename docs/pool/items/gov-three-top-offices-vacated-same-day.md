---
id: gov-three-top-offices-vacated-same-day
title: "Find why the nightly's Ballot check counts 2 seats instead of 5 in Hayfield, Virginia, and confirm the governor's January 3, 2027 vacancy has its cause"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Red main fixer 2's #7057 (Every place nightly run 41316330982, run seed 67d5d83fdbecbe3c, Hayfield, Virginia, seed 88e63a259044)
lead: governing
---

**What.** In the Every place nightly of Nov 1 (run seed 67d5d83fdbecbe3c), Hayfield, Virginia's Ballot check counted 5 seats, then 2 after #7057 made the check skip terms ended by a vacancy. Red main fixer 2 first wrote that the President's, Vice President's and governor's terms all ended by vacancy, then corrected it on #7057 after a straight two-year run: the President and Vice President serve to January 20, 2029 with no vacancy, and the governor's term ends January 3, 2027 by "accepted incompatible office", with the lieutenant governor succeeding, which fits a governor sworn into Congress that day. The drop from 5 checked seats to 2 is still unexplained. Read which seats the check counted and why three left the count, and confirm the governor's move names the office they accepted.

**Rules.** Ask why: each seat leaving the count is named by record, and the governor's vacancy cites the office record they took. Sliding scales and causes: an office empties only from a cause the engines record. One rule, all 56 places: check the same seed's other places for seats dropped from the count.

**Done when.** The PR names the five seats the check first counted in Hayfield, Virginia at run seed 67d5d83fdbecbe3c, the record that removed each of the three, and the office record the governor accepted; if a seat left the count wrongly, a test fails on the old check and passes after.

**Files.** scripts/core2-year/all-places.mjs, src/core2/modules/offices.ts

**Notes.** Filed by the CTO from Merger 1's note on #7057 (Nov 1, 23:20); rewritten the same hour after the fixer's correction on #7057 (22:19), which showed the President and Vice President were never vacated. Read: OWNER-DECISIONS (succession and vacancy rulings), the pool for Hayfield and vacancy: no twin.
