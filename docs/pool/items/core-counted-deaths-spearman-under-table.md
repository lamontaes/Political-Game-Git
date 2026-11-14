---
id: core-counted-deaths-spearman-under-table
title: "Counted deaths at Spearman, Texas still run about a death per 1,000 a year under the age mix after the cohort fix (8.4 against about 9.4)"
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
source: found by the Account lead's carry of the counted-deaths fix, Nov 14, 2026
---

**What.** Two years from the opening at train b4c11bc5b5 plus the cohort fix (`node --import tsx scripts/words/death-rate-check.ts --seed fam-b:2 --days 730`, the cause-finder's script kept at /mnt/project-files/death-rate/death-rate-check.ts, one world per process, place drawn from seed fam-b:2: Spearman, Texas, about 13,300 people in 7,925 records, 232 counted people died, 8.4 per 1,000 a year). The age mix gives about 9.4. San Isidro (5.0 against about 5.5) and North Vacherie (11.0 against about 9.4) are within the spread; Spearman is the one place still a tenth under. Seen: the 8.4 against 9.4 is read from the script above at the named place and seed.

**Cause.** Needs cause. Measured at Spearman, Texas on the train plus the cohort fix, two years: 8.4 per 1,000 against about 9.4, and its seconds fell from 308 to 283 with the fix. Not traced. Candidates, none read in the records: a record ill in part is skipped by the pick (`ill.has(members[0]!.id)` in src/core2/births-counted.ts), so in a town of many heavy records a cohort's owed deaths wait for another record of the cohort to be free; the course of an illness (30 to 300 days by age, `remainingDaysAfterOnset`) leaves illnesses running at the end of the two years that the opening's look-back did not seed equally; and the world's own mortality factor for the place (`worldRateFactor`, Texas ratio) may sit under what the age mix alone implies, which would make the 9.4 the wrong yardstick.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** No dice: deaths follow the illnesses the records book; real rates check the total and never pick who dies. One rule, all 56 places: draw places and name each with its seed. Speed: a year may not run more than 20 percent slower than its base.

**Done when.** A second session replays Spearman, Texas and two other drawn places for two years in the running game, names each with its seed, and reads counted deaths per 1,000 a year against each place's own age mix and the world's mortality factor within the spread the full people's deaths show, or the Notes say with records why Spearman's age mix gives fewer.

**Waits on.** The counted-deaths cohort fix (PR 9241) on the train.

**Files.** src/core2/births-counted.ts

**Notes.** The first step is a measurement, no code change: at Spearman and two more pinned places, list per age band the owed and paid deaths of each cohort and the illnesses running at the start and at the end of the two years, as the cohort fix's PR did at San Isidro, and write the cause into this item's Notes with the command and seed before anything is built. The estimate of the world's mortality factor for Texas was not read yet.
