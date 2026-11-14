---
id: core-counted-deaths-run-below-the-table-in-small-towns
title: "Counted deaths in some towns run well under the life table's count for their age mix (San Isidro, Texas: 3.6 per 1,000 a year against about 5.5)"
area: core
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: opus
effort: medium
root: none
source: found by the Account lead's carry of #8804 on Nov 14, 2026
---

**What.** After counted part deaths settle their estates (the carry of #8804), a year of play still shows counted deaths under what the age mix calls for in some towns. One year from the opening at the train head plus the part-death change, `scripts/words/death-rate-check.ts --days 365` (the cause-finder's script, kept at /mnt/project-files/death-rate/death-rate-check.ts), one world per process, places fam-b:0 to fam-b:2: San Isidro, Texas 3.6 counted deaths per 1,000 a year (185.5 real people of about 48,000) against about 5.5 for its age mix; North Vacherie, Louisiana 9.9 against about 9.4; Spearman, Texas 8.0 against about 9.4. Before the change the three were 2.6, 8.8 and 7.5. The test's own Centennial, Wyoming world shows 48 counted deaths in the first four months against 94 expected by the monthly counts, which the test counts as passing (it asks for at least half, less three sigma, because a death follows an illness's onset by weeks to months).

**Cause.** Measured: the first four months run under the tables by design (deaths are booked when an illness's course ends), so the Centennial figure is the lag the test allows for, not a missing half. The one-year figures are not explained: San Isidro is at about two thirds of its table after a full year, which the lag alone does not account for. Not found. Candidates to read, none traced: a record skipped while it is ill in part (`ill.has(members[0]!.id)` in src/core2/births-counted.ts), the floor of the owed deaths to a whole person (`share < 1` breaks the pass), and the onset-to-death delay the cause-finder named for officials.

**Fix.** First step, no code change to the game: break the counted deaths of the three places down by age band against the life table (the death-rate-check script already prints counted exposure by band), and read the owed deaths carried at the year's end (`carry.deaths`) per place. That names the band and the mechanism; the fix follows from it and is written into this item's Notes before anything is built.

**Time box.** 3 hours for one Opus session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** No dice: deaths follow the illnesses the records book; real rates check the total and never pick who dies. One rule, all 56 places: draw places and name each with its seed. Speed: a year may not run more than 20 percent slower than its base.

**Done when.** Counted deaths per 1,000 a year in three drawn places, named with seeds and read against the table for each place's own age mix, sit within the spread the full people's deaths show, or the item's Notes say with records why a place's age mix gives fewer.

**Waits on.** Nothing.

**Files.** src/core2/births-counted.ts, src/core2/counted-deaths-opening.test.ts

**Notes.** Opened with the carry of #8804 (part deaths). The whole-population measurement of Nov 14 (death-rate/report.md) found full people at 0.7 to 0.9 of the table; counted residents at San Isidro were at about half before this change.
