---
id: gov-three-top-offices-vacated-same-day
title: "Find why the President's, Vice President's and a governor's terms all end by vacancy on January 20, 2027 in one nightly world"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Red main fixer 2's #7057 (Every place nightly run 41316330982, run seed 67d5d83fdbecbe3c, Hayfield, Virginia, seed 88e63a259044)
lead: governing
---

**What.** In the Every place nightly of Nov 1 (run seed 67d5d83fdbecbe3c), Hayfield, Virginia's world ends the President's, the Vice President's and Virginia's governor's terms by vacancy on the same day, January 20, 2027. #7057 made the nightly's Ballot check skip terms ended by a vacancy, so the check no longer flags it, and its body calls the dates unusual without reading why. A presidential term runs to January 20, 2029 and a Virginia governor's term begins in January 2026, so three top offices vacated together on an inauguration anniversary looks like a date or succession defect, not three real events. Read the vacancy rows and their causes by record and fix the writer if it is wrong.

**Rules.** Ask why: each vacancy's cause is named by record (a death, a resignation, a removal) or the defect is found. Sliding scales and causes: an office empties only from a cause the engines record, never a date rule. One rule, all 56 places: check the same seed's other places for the same date.

**Done when.** The PR names the three vacancy records with their causes in Hayfield, Virginia at run seed 67d5d83fdbecbe3c; if the cause is a defect, a test in a drawn place fails on the old behavior and passes after, and the nightly's other places on that seed show no same-day top-office vacancies without a recorded cause.

**Files.** src/core2/modules/offices.ts, scripts/all-places.mjs

**Notes.** Filed by the CTO from Merger 1's note on #7057 (Nov 1, 23:20). Read: OWNER-DECISIONS (succession and vacancy rulings), the pool for Hayfield and vacancy: no twin. The fixer asked the governing lead on Nov 1; this item is the record.
