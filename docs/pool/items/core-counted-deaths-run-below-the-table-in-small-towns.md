---
id: core-counted-deaths-run-below-the-table-in-small-towns
title: "Counted deaths in some towns run well under the life table's count for their age mix (San Isidro, Texas: 3.6 per 1,000 a year against about 5.5)"
area: core
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9241
after:
blocked-on:
lead: speed
model: opus
effort: medium
root: none
source: found by the Account lead's carry of #8804 on Nov 14, 2026
---

**What.** After counted part deaths settle their estates (the carry of #8804), a year of play still shows counted deaths under what the age mix calls for in some towns. One year from the opening at the train head plus the part-death change, `scripts/words/death-rate-check.ts --days 365` (the cause-finder's script, kept at /mnt/project-files/death-rate/death-rate-check.ts), one world per process, places fam-b:0 to fam-b:2: San Isidro, Texas 3.6 counted deaths per 1,000 a year (185.5 real people of about 48,000) against about 5.5 for its age mix (the command `node --import tsx scripts/words/death-rate-check.ts --seed fam-b:0 --days 365` shows it, place drawn from seed fam-b:0, San Isidro, Texas); North Vacherie, Louisiana 9.9 against about 9.4; Spearman, Texas 8.0 against about 9.4. Before the change the three were 2.6, 8.8 and 7.5. The test's own Centennial, Wyoming world shows 48 counted deaths in the first four months against 94 expected by the monthly counts, which the test counts as passing (it asks for at least half, less three sigma, because a death follows an illness's onset by weeks to months). Seen: in a played year as the town's counted deaths (the Journal's death notices and the town's vital counts) running at the table's rate for its age mix.

**Cause.** Measured: with `node --import tsx scripts/words/death-rate-check.ts --seed fam-b:0 --days 365` (San Isidro, Texas) and the Centennial, Wyoming world of src/core2/counted-deaths-opening.test.ts (place 5613440, seed 140bb7872bc46f5202d12ae8c4c52ca2364da2da170593f43aeb7f7810bd5366), the first four months run under the tables by design (deaths are booked when an illness's course ends), so the Centennial figure is the lag the test allows for, not a missing half. The one-year figures are not explained: San Isidro is at about two thirds of its table after a full year, which the lag alone does not account for. Not found. Candidates to read, none traced: a record skipped while it is ill in part (`ill.has(members[0]!.id)` in src/core2/births-counted.ts), the floor of the owed deaths to a whole person (`share < 1` breaks the pass), and the onset-to-death delay the cause-finder named for officials.

**Fix.** First step, no code change to the game: break the counted deaths of the three places down by age band against the life table (the death-rate-check script already prints counted exposure by band), and read the owed deaths carried at the year's end (`carry.deaths`) per place. That names the band and the mechanism; the fix follows from it and is written into this item's Notes before anything is built.

**Time box.** 3 hours for one Opus session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** No dice: deaths follow the illnesses the records book; real rates check the total and never pick who dies. One rule, all 56 places: draw places and name each with its seed. Speed: a year may not run more than 20 percent slower than its base.

**Done when.** A second session replays three drawn places for a year in the running game, names each with its seed, and reads counted deaths per 1,000 a year, named with seeds and read against the table for each place's own age mix, sit within the spread the full people's deaths show, or the item's Notes say with records why a place's age mix gives fewer.

**Waits on.** Nothing.

**Files.** src/core2/births-counted.ts, src/core2/counted-deaths-opening.test.ts

**Notes.** Cause found Nov 14 and fixed in the PR that carries this item (src/core2/births-counted.ts, test src/core2/counted-deaths-by-cohort.test.ts). Measured at San Isidro, Texas (place 4865432, seed 92ca3f7f5afd93ea5d976c2fdb9f55d85f493c32783fb7bd72e72b487a2f9085) for a year with the owed and paid deaths of each cohort: the town owed 217 deaths and paid 216 in total, but all of them to cohorts aged 65 and over (paid by age band: 65 to 74, 28; 75 to 84, 140; 85 and up, 54; everyone under 65, 0, against 21, 36 and 3 owed to the bands under 65). Two faults. First, a month's pool of owed deaths went in one lump to the one cohort that owed the most (always the oldest), as a part death of its record of up to the whole month's owed count; its own debt went to minus 12 or worse while 25 to 64 stayed owed, and because the pool nets those together the owed total read under one and no young person fell ill for the rest of the year. Second, a record ill in part was dropped from the next months' exposure altogether, though it is well in all its other households. The opening looked back ten months but each month's lump went to a person in the oldest cohort whose course ended before the opening, so only 38 people were booked ill at the opening against about 79 in the steady state. Fix: a cohort pays no more than it owes, rounded up to a whole person; a part-ill record is exposed for the households still well. Two years, three places, one process each, before and after (counted deaths per 1,000 a year, whole run seconds): San Isidro 3.8 to 5.0 (99 s to 103 s); North Vacherie 10.2 to 11.0 (155 s to 156 s); Spearman 8.7 to 8.4 (308 s to 283 s); about 5.5, 9.4 and 9.4 from each place's age mix. Under 65 now die in San Isidro: 25 to 44, 8; 45 to 64, 42 in year 1 (none before). North Vacherie estate tax (federal and state death taxes set low as in counted-part-death-estate.test.ts, one year, journal postings): 35 settlements moving 59,718 dollars with 406 deaths before; 128 settlements moving 68,879 dollars with 377 deaths after. The earlier lower tax with more deaths was which records died (a few heavy old records took the lumps), not the tax code, which the part-death test already holds to the per-household amount of a whole death. Opened with the carry of #8804 (part deaths). The whole-population measurement of Nov 14 (death-rate/report.md) found full people at 0.7 to 0.9 of the table; counted residents at San Isidro were at about half before this change.

Also read with the age-band breakout (Nov 14, the carry of #8804): North Vacherie, Louisiana took in less counted estate tax over year 1 with part deaths (5,420,666 minor over 51 rows, 24 paying) than without (8,541,914 over 37 rows, 21 paying) although more people died (352 against 313.6). Cause untraced. A likely reading: a whole-record death without part deaths stands for every household of a heavy record and taxes all of them at once, while a part death taxes only its share. Check it by listing each death's households and tax by record.
