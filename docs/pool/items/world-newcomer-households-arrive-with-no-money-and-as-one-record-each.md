---
id: world-newcomer-households-arrive-with-no-money-and-as-one-record-each
title: "A household that moves into the county arrives with no money on its records and as a record of its own: every free member looks for work and is hired within the year, and the county's records grow tenfold in 18 months"
area: world
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: fable
source: Fable, Nov 10, 2026, measured in South Fork, Missouri while proving the workers fix (pull request for world-regional-work-piles-unplaced-workers-on-a-household)
---

**What.** Measured on the workers-fix branch in South Fork, Missouri (place key 2968762, world seed a499835260b786a6f03656c7b468096d095bdd4534cd0d04275bc3186d34d28f), twelve months in, in the rest-of-county place. The 140 opening records that stand for 15,902 households (31,691 people, 20,219 of working age) hold 11,074 out-of-town workers, none of their members is in regional work and none is looking; their members' money covers their costs many times over. The 1,126 newcomer households (1,289 people, 1,081 of working age), each a record of its own, hold 615 workers by the place's share, 360 members already in regional work and 348 more looking, and their members' money covers zero days of their costs. The monthly review that decides who looks for work (reviewCountedEntry in src/core2/modules/jobs.ts) reads a household's days of money from its members' own cash (liquidMinor) over their living costs; a newcomer's members carry none, so every free member looks, and the regional find hires them. Two effects over a long game. First, the county's workers climb while its people stay flat: 12,305 of 27,866 adults at the opening, 19,150 after five years, 26,796 of 29,938 after eleven, as households at about 55 percent in work are replaced by households at 100 percent. Second, records grow without bound: the place's household records go from 238 at the opening to 1,356 after twelve months and 2,428 after eighteen while its households go from 17,126 to 18,303, because a newcomer is admitted as a new record of weight one (admitCountedHousehold from counted-moves.ts) and never joins a like record. Every monthly and daily pass over counted households walks all of them, so each year of a long game is slower than the last (43 seconds for year 1, 94 for year 10 in the same run, on a busy machine).

**Rules.** One model, two tiers (owner, Oct 14): a counted household's money is its share of its group's money, and a rule that reads it reads the same number for an opening household and a newcomer. Sliding scales and causes: who looks for work follows the household's real cushion, never an empty field. Speed (owner, Oct 29 and 30): records kept hold flat over a long save; old or like records fold. No dice. An effect is a read: say which engine reads the money a newcomer brings.

**Done when.** A second session, on main in a drawn place with a seed nobody chose, runs ten years in dev mode and reads the Metrics tab for the surrounding county: the share of adults at work stays within a few points of where it opened, and dev mode's records count for counted households is no more than twice its opening count. A test in src/core2 plays three years in a drawn place and holds both: newcomer households' members look for work at the rate opening households' members with the same money do, and the count of counted household records grows no faster than the count of households. The 20-year game in South Fork, Missouri (the seed above) ends with the county's workers under its adults and year 20 no more than 1.2 times as slow as year 4. The pull request says what money a newcomer household brings and where it sits, and how a newcomer joins a like record.

**Files.** src/core2/modules/counted-moves.ts, src/core2/modules/jobs.ts, src/core2/modules/residents.ts, src/core2/counted-groups.ts, src/core2/counted-money.ts

**Notes.** The probe that printed the figures is a scratch script, not in the repository; the counts are of counted households by place, by whether the record existed at the opening and by whether it stands for more than one household. Also seen there: the town's own opening counted records (weight one) read zero days of money too, so the same rule sends their free members looking; and the opening's many-household records read an enormous cushion because their members carry no living cost. Both point at the same reader: days of money should come from the household's share of its group's fund (householdCash in residents.ts), not from the members' own fields. Related: world-movers-change-unplaced-workers-not-the-pool-pay (the pool's pay does not follow movers), core-long-run-tables-grow-with-history.
