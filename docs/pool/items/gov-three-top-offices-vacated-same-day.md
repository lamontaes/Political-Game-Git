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
standard: 2
model: haiku
effort: low
root: rc9-place-facts-one-default
source: Red main fixer 2's #7057 (Every place nightly run 41316330982, run seed 67d5d83fdbecbe3c, Hayfield, Virginia, seed 88e63a259044)
lead: governing
after:
checked: fable 2026-11-10
---

**What.** In the Every place nightly of Nov 1 (run seed 67d5d83fdbecbe3c), Hayfield, Virginia's Ballot check counted 5 seats, then 2 after #7057 made the check skip terms ended by a vacancy. Red main fixer 2 first wrote that the President's, Vice President's and governor's terms all ended by vacancy, then corrected it on #7057 after a straight two-year run: the President and Vice President serve to January 20, 2029 with no vacancy, and the governor's term ends January 3, 2027 by "accepted incompatible office", with the lieutenant governor succeeding, which fits a governor sworn into Congress that day. The drop from 5 checked seats to 2 is still unexplained. Read which seats the check counted and why three left the count, and confirm the governor's move names the office they accepted.

**Cause.** Found in code: `missingContests` in `scripts/core2-year/all-places-worker.ts` (line 120) counts as "checked" each elected state or federal seat covering the town whose term ends between November 1 of an even year and March 1 of the next (`due.count`, written as `ballotSeatsChecked` at line 240). Since #7057, a term that ended on the day a vacancy opened is left out (`left`, from the offices engine's `vacancies` table, line 140), because a vacancy is filled by the office's own rule and not at the scheduled election. In Hayfield, Virginia the governor's term ends on January 3, 2027 by "accepted incompatible office", and the lieutenant governor succeeds, so both terms end by vacancy inside the 2026 window and leave the count. The third is any seat whose holder moved up the same chain that day. So the drop from 5 to 2 is the check doing what #7057 made it do. It was not re-run for run seed 67d5d83fdbecbe3c, so the third seat is not named by record. The count is a dev tool's figure that no player sees.

**Fix.** Nothing to build. Proposed: the CTO drops the item (`npm run pool -- status gov-three-top-offices-vacated-same-day dropped --by=cto`). The governor's vacancy cause is a separate, player-facing question only if the office the governor accepted is not on their record. If the CTO keeps the item, the one check is the Done when below.

**Time box.** 1 hour for one Haiku session, only if the CTO keeps the item.

**Rules.** Ask why: each seat leaving the count is named by record, and the governor's vacancy cites the office record they took. Sliding scales and causes: an office empties only from a cause the engines record. One rule, all 56 places: check the same seed's other places for seats dropped from the count.

**Done when.** The CTO drops the item. If it is kept, a second session runs the every-place worker for Hayfield, Virginia (a drawn place in that nightly) at run seed 67d5d83fdbecbe3c for two years, and names the five seats first counted and the vacancy record that removed each of the three, with the office record the governor accepted on January 3, 2027.

**Waits on.** Nothing.

**Files.** scripts/core2-year/all-places.mjs, src/core2/modules/offices.ts

**Notes.** Filed by the CTO from Merger 1's note on #7057 (Nov 1, 23:20); rewritten the same hour after the fixer's correction on #7057 (22:19), which showed the President and Vice President were never vacated. Read: OWNER-DECISIONS (succession and vacancy rulings), the pool for Hayfield and vacancy: no twin.

Nov 11 (cause finder for Fable B): read on main d604b3494b. Since #7057 the ballot check leaves out terms that ended by a vacancy. The governor's move to another office and the lieutenant governor's succession on January 3, 2027 are such vacancies, so the lower count is the check working. Not re-run. I propose dropping it as a dev count no player sees.
