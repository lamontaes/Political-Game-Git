# Real disasters in games that open before October 9, 2026, and Social Security under the law in force; a played year is over budget again

Before: no disaster touched a town, and Congress couldn't change Social Security ages.

After: in a game opening before October 9, 2026, FEMA's real disasters strike on their dates, with aid and repairs; a game opened today gets none. Claims follow the ages in force.

**Your call:** after FEMA's records end, either the game keeps its own weather record and storms follow it, or later games have no disasters.

**What you need to do:** in the evening build, type an opening date of January 1, 2021, pick a Louisiana or Florida town, and play the year.

**Also read first:** after tonight's main merge, a Woodmere, New York year takes 175 seconds, over budget (next section).

## Known problems

- **A year is over budget again.** After this branch took tonight's main, a Woodmere year takes 174.8 seconds against a two-minute budget. The commit just before that merge, timed right before it, took 96.6. The project's limit for any one change is 20% slower. The town now opens with 1,938 people held individually instead of about 425. 1,614 of them are state and federal officials who live elsewhere (from the OPUS-OFFICIALS session's change, #4120). The rest are 123 full people in town and 201 relatives elsewhere kept as records without a daily life. I haven't counted the same split before the merge. Measured: in a full-year profile of the head after the merge (185.9 seconds with the profiler on), the people team's drives took 28.7 seconds and memory cleanup 44.8. There is no full-year profile from before the merge, so I can't yet say how much of the 78-second rise each of the two accounts for. Inferred from the code: drives plan a day for every person with a drive (`src/core2/modules/drives.ts:1078`), officials included, although the core never runs those officials' days. I've asked the CTO to have the people team skip them.
- **The slowest day is over budget:** after the merge, the slowest day (December 15, 2026) takes 5.5 seconds against 3, in one run. Before the merge, Election Day was the slowest at 4.7, also over.
- **Earlier today:** this morning's code ran a Woodmere year in 53.5 seconds when timed again tonight. Two earlier main merges with other teams' engines slowed it, and tonight's three core fixes took 112.2 seconds back to 96.6, before tonight's merge (details under "A faster year").
- **The CI speed job stops on this pull request.** It now runs on core changes (fixed here) and stops on this one because it changes how a town opens; the job refuses any such comparison. I've proposed a rule change to the CTO; it needs his sign-off because it changes a guard's test.

## What changed for the player

- In a game that opens before October 9, 2026, the disasters FEMA declared for the town's county or state happen on their real dates. Each one is news, with how many homes FEMA found damaged. When it's declared, federal aid reaches the town's government and its households, and households pay the town's builders to repair their homes.
- Social Security claims during play follow the law in force, so if Congress raises the full retirement age, people claim later. The evening build opens the laws engine (`src/bench/world.ts:300`), so this applies there.
- Residents' relatives who live in other towns now spend their income instead of saving all of it, so money no longer piles up in the counts.
- Families with children in private school split their tuition among the town's private schools by size, instead of each family being assigned to one.
- Families who move into town get family names from the generator that names invented officials. It draws from the state's name records and refuses a real officeholder's name (`src/core2/officials-identity.ts:72`).

## Why each change works

**Disasters come from FEMA's records.** What the code does now (inferred from the code): a disaster happens only where and when FEMA declared one for the town's county or its whole state, from 50,883 declarations since 2000 (`src/core2/modules/disasters.ts:343`). On the day it begins, it's a public news event. On the day it's declared, the U.S. Treasury pays the town's government the money FEMA committed to rebuilding its public property, and the town's households the housing aid FEMA approved for them. FEMA's award to the county's government is also paid when the county government is part of the game. In most game towns, including Gonzales below, the county government is kept outside the game, like the Treasury, so that award moves no money in play. The households then pay for repairing the damage FEMA inspected in owners' homes, split among the town's builders by how many people each employs (`src/core2/modules/disasters.ts:268`).

A game town can hold fewer people than the real one. So household amounts are cut to the game town's population divided by the Census Bureau's estimate for the real town. The town's government is the real one, with its real budget, so it gets FEMA's full award, unscaled.

Measured over 2021 in Gonzales, Louisiana, where the game town has 1,500 people and the real town 13,930 (a share of 0.108). FEMA found 1,297 homes damaged by Hurricane Ida, which becomes 139 in the game town (rounded down). Its households received $1.02 million of FEMA's housing aid. Of that, they paid $495,626 to the town's three builders for repairs; the rest is aid for rent and other needs, which they keep. The town's government received $2.23 million for public property. Money balanced.

**Retirement follows the law in force.** What the code does now (inferred from the code): where the laws engine runs, a claim during play is dated from the government team's Social Security ages, not the core's own table (`src/core2/modules/retirement-claims.ts:88`). Each person's claim age is set from their full retirement age, earlier with less saved or less patience, so it moves with the full age. Measured in the test in Teaticket, Massachusetts. The game opens on January 1, 2021, and one adult is set up so that their award would start two months later. With the full retirement age raised to 68 on the opening day, their full age moves from 66 years 10 months to 68, so their claim moves about 14 months later. They had no award by June 2021 and had claimed by the end of 2022. The same rule applies to every claimant; the test follows this one.

**A faster year.** Three fixes. Measured back to back tonight, before the main merge, they take a Woodmere year from 112.2 seconds (the commit before them) to 96.6 (the commit with all three). Single runs vary too much to size each fix on its own:

- **Filling a household in** (inferred from the code): each seller's sales to the counted population were kept as one list, with a part for each of about 24,500 counted households. That count includes the town's households and the households of residents' relatives who live elsewhere. Each time a household was filled in as full people, about 200 of those lists were copied whole, and that happened 33 times in the first 60 days. Now each list is copied once and then changed in place (`src/core2/modules/residents.ts:1193`).
- **Dating Social Security claims** (inferred from the code): each new year, every counted person 60 or older had a claim dated through the law engine, including people long past 70. Now people past the last claim age are skipped, and the law's ages are reused for each birth year within a day (`src/core2/modules/retirement-claims.ts:145`). Measured: in a 60-day profile, claim dating fell from about 1 second to too little to list.
- **Storing module records** (inferred from the code): with bookkeeping off, each record an engine stores is now a plain copy, without the checks and freezing that tests keep (`src/core2/module-data.ts:24`).

**Relatives elsewhere spend.** What the code did (inferred from the code): the counted population keeps one account for the town and one for each place where residents' relatives live. Only accounts with purchase flows ever spent, and the relatives' accounts have none, since they have no local stores. Now an account with income and nothing to buy locally pays 84% of its income, the share of personal income Americans spend (BEA), to buyers and sellers outside the town at each month's close (`src/core2/modules/residents.ts:702`). Measured over 2021 in Duncan Ranch Colony, Montana: counted residents ended with $36.3 million instead of $56.9 million, against $6.9 million at the opening, and money balanced. The rest of that growth is the 16% of income that stands for taxes and saving; counted residents pay no taxes yet, and I've asked the government team about it.

**No dice in private schools or newcomers' names.** What the code did (inferred from the code): a hash of a family's id picked which private school it paid, and a hash of a household's id picked a family name from the town's names. Now tuition is split by each school's staff (`src/core2/opening-private-tuition.ts:71`), and family names come from the officials' name generator (`src/core2/modules/counted-drift.ts:436`). The no-dice check flags no new seeded pick on this branch.

## Checks

- The three blocking golden-path checks pass on this branch's head: the suite runs and fits its time (Silver Summit, Utah), the golden-path speed guard (Carmet, California), and a played world that runs a full year with every engine (Lamar, Mississippi). The speed guard tests only its arithmetic (see "What happens next").
- Disasters: the test draws places from its seed until one has a disaster beginning in 2021, then checks one news event per disaster, no payment above FEMA's figure, and balanced money. It passed in Winchester, Idaho (1 disaster); Long Beach, New York (3, with one housing-aid payment and three repair payments); and Dyersburg, Tennessee (2), with seeds a1, c3 and e5.
- Speed and memory in Woodmere (cloud machine, not a minimum-spec PC), after tonight's main merge, one run: a new game loads in 52.2 seconds and a year runs in 174.8, each against a two-minute budget, so the year fails. The slowest day takes 5.5 seconds against 3, and a year-old save is 13.3 MB compressed against 40 MB.
- The release check, the no-dice check, type checks and the changed files' tests pass.

## What happens next

- Why no check caught the earlier slowdowns at the 11:20 a.m. and 1:23 p.m. merges: the CI speed job shows "skipped" on all ten pull requests in those two merges (#4079, #4095, #4096, #4097, #4102, #4105, #4106, #4107, #4108 and #4110). That job times a month of the played world before and after a change. The golden-path speed check (M0-11) tests only its comparison arithmetic on fixed numbers. The cause (from the job's log): the step that decides whether a pull request changes the core calls a search tool GitHub's machines don't have, so it always answered no. This pull request switches that step to the standard tool (`.github/workflows/m0-guard.yml:60`). The speed job then ran on this pull request; it stops for the reason under "Known problems".
- The research for each place's citizenship rule at birth is ready for the people and government teams; full people don't carry citizenship yet.
- Three retired parameters are gone, and two more estimates are settled (the share of a career with covered work, and the mood baseline).
- Eleven more core files read the core's own date, id and reference folders instead of the old engine's.

## Speed measurements

- Single timings of a Woodmere year during the evening, each from one run: 58.5 seconds for this morning's code; 78.3 after the 11:20 a.m. main merge; 80.8 before and 110.3 after the 1:23 p.m. merge.
- How far to trust single timings: this morning's code repeated closely (52.1, 53.5 and 58.5 seconds at different times). The commit before tonight's fixes measured 103.6, 112.2 and 122.3 seconds at different times, so a single timing of a slow commit can be about 10 seconds off. Load times vary too: this morning's code loaded in 55.7 seconds this morning and 93 seconds once tonight.

## Method

Measured on this branch on October 13, 2026, in the cloud, one run each, except the back-to-back runs under "Known problems" and "A faster year" and the repeats under "Speed measurements". Woodmere used seed m701-a, one process at a time, with bookkeeping off. Gonzales used seed ida. Details for every run are in `docs/coordination/core.md`.
