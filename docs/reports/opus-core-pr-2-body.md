# Real disasters in games that open before October 9, 2026, Social Security under the law in force, and a faster year

Before: no disaster touched a town, and Congress couldn't change Social Security ages.

After: in a game opening before October 9, 2026, FEMA's real disasters strike on their dates, with aid and repairs; a game opened today gets none. Claims follow the ages in force.

**Your call:** after FEMA's records end, either the game keeps its own weather record and storms follow it, or later games have no disasters.

**What you need to do:** in the evening build, type an opening date of January 1, 2021, pick a town in Louisiana or Florida, and play through the year.

**Also read first:** two speed problems (next section): a Woodmere, New York year takes 96.6 seconds, against 53.5 for this morning's code.

## Known problems

- **Election Day is too slow:** in Woodmere, Election Day takes 4.7 seconds against a 3-second budget. In a 60-day profile before tonight's fixes, the government team's voting took 4.1 seconds of it.
- **A year got much slower today.** Two main merges with other teams' new engines added 34% (at 11:20 a.m.) and 37% (at 1:23 p.m.), each over the 20% limit. I've asked the CTO to have the government and people teams look at their parts. Measured back to back tonight, this morning's code runs a year in 53.5 seconds and this branch's head in 96.6, 81% slower (details under "What happens next").

## What changed for the player

- In a game that opens before October 9, 2026, the disasters FEMA declared for the town's county or state happen on their real dates. Each one is news, with how many homes FEMA found damaged. When it's declared, federal aid reaches the town's government and its households, and households pay the town's builders to repair their homes.
- Social Security claims during play follow the law in force, so if Congress raises the full retirement age, people claim later. The evening build opens the laws engine (`src/bench/world.ts:300`), so this applies there.
- Families with children in private school split their tuition among the town's private schools by size, instead of each family being assigned to one.
- Families who move into town get family names from the generator that names invented officials. It draws from the state's name records and refuses a real officeholder's name (`src/core2/officials-identity.ts:72`).

## Why each change works

**Disasters come from FEMA's records.** What the code does now (inferred from the code): a disaster happens only where and when FEMA declared one for the town's county or its whole state, from 50,883 declarations since 2000 (`src/core2/modules/disasters.ts:343`). On the day it begins, it's a public news event. On the day it's declared, the U.S. Treasury pays the town's government the money FEMA committed to rebuilding its public property, and the town's households the housing aid FEMA approved for them. FEMA's award to the county's government is also paid when the county government is part of the game. In most game towns, including Gonzales below, the county government is kept outside the game, like the Treasury, so that award moves no money in play. The households then pay for repairing the damage FEMA inspected in owners' homes, split among the town's builders by how many people each employs (`src/core2/modules/disasters.ts:268`).

A game town can hold fewer people than the real one. So household amounts are cut to the game town's population divided by the Census Bureau's estimate for the real town. The town's government is the real one, with its real budget, so it gets FEMA's full award, unscaled.

Measured over 2021 in Gonzales, Louisiana, where the game town has 1,500 people and the real town 13,930 (a share of 0.108). FEMA found 1,297 homes damaged by Hurricane Ida, which becomes 139 in the game town. Its households received $1.02 million of FEMA's housing aid. Of that, they paid $495,626 to the town's three builders for repairs; the rest is aid for rent and other needs, which they keep. The town's government received $2.23 million for public property. Money balanced.

**Retirement follows the law in force.** What the code does now (inferred from the code): where the laws engine runs, a claim during play is dated from the government team's Social Security ages, not the core's own table (`src/core2/modules/retirement-claims.ts:88`). Each person's claim age is set from their full retirement age, earlier with less saved or less patience, so it moves with the full age. Measured in the test in Teaticket, Massachusetts. The game opens on January 1, 2021, and one adult is set up so that their award would start two months later. With the full retirement age raised to 68 on the opening day, their full age moves from 66 years 10 months to 68, so their claim moves about 14 months later. They had no award by June 2021 and had claimed by the end of 2022. The same rule applies to every claimant; the test follows this one.

**A played year back under budget.** Three fixes. Together they take the year from 112.2 to 96.6 seconds, measured back to back tonight (the commit before them, then this branch's head). Each was also timed alone, but single runs of these commits vary too much to size each fix:

- **Filling a household in** (inferred from the code): each seller's sales to the counted population were kept as one list, with a part for each of about 24,500 counted households. That count includes the town's households and the households of residents' relatives who live elsewhere. Each time a household was filled in as full people, about 200 of those lists were copied whole, and that happened 33 times in the first 60 days. Now each list is copied once and then changed in place (`src/core2/modules/residents.ts:1193`). Its single timing: 122.3 to 108.6 seconds.
- **Dating Social Security claims** (inferred from the code): each new year, every counted person 60 or older had a claim dated through the law engine, including people long past 70. Now people past the last claim age are skipped, and the law's ages are reused for each birth year within a day (`src/core2/modules/retirement-claims.ts:145`). In a 60-day profile, claim dating fell from about 1 second to too little to list.
- **Storing module records** (inferred from the code): with bookkeeping off, each record an engine stores is now a plain copy, without the checks and freezing that tests keep (`src/core2/module-data.ts:24`). Its single timing: 105.4 to 100.3 seconds a year, and Election Day from 5.3 to 3.7 seconds.

**No dice in private schools or newcomers' names.** What the code did (inferred from the code): a hash of a family's id picked which private school it paid, and a hash of a household's id picked a family name from the town's names. Now tuition is split by each school's staff (`src/core2/opening-private-tuition.ts:71`), and family names come from the officials' name generator (`src/core2/modules/counted-drift.ts:436`). The no-dice check flags no new seeded pick on this branch.

## Checks

- The three blocking golden-path checks pass on this branch's head: the suite runs and fits its time (Silver Summit, Utah), the speed guard (Carmet, California), and a played world that runs a full year with every engine (Lamar, Mississippi).
- Disasters: the test draws places from its seed until one has a disaster beginning in 2021, then checks one news event per disaster, no payment above FEMA's figure, and balanced money. It passed in Winchester, Idaho (1 disaster); Long Beach, New York (3, with one housing-aid payment and three repair payments); and Dyersburg, Tennessee (2), with seeds a1, c3 and e5.
- The speed guard compares a change with its own base in its own drawn town. I don't know yet why it passed the two main merges that slowed Woodmere's year by more than 20%, and I've added that question for the CTO.
- Speed and memory in Woodmere (cloud machine, not a minimum-spec PC): a new game loads in 52.9 seconds and a year runs in 96.6, each against a two-minute budget. A year-old save is 15.1 MB compressed against 40 MB. The slowest day fails: 4.7 seconds against 3.
- The release check, the no-dice check, type checks and the changed files' tests pass.

## What happens next

- Woodmere's year, measured on each commit in turn during the evening: 58.5 seconds for this morning's code; 78.3 after the 11:20 a.m. main merge; 80.8 before and 110.3 after the 1:23 p.m. merge. Between the two merges, the core's own commits (school days among them, already on main) added 2.5 seconds.
- How far to trust those numbers: this morning's code repeats closely (52.1, 53.5 and 58.5 seconds at different times). The slower commits vary much more: the commit before tonight's fixes measured 103.6, 112.2 and 122.3 seconds at different times. So the two merges' slowdowns are clear, but a single timing of a slow commit can be off by about 10 seconds either way. Load times vary too: this morning's code loaded in 55.7 seconds this morning and 93 seconds once tonight.
- The research for each place's citizenship rule at birth is ready for the people and government teams; full people don't carry citizenship yet.
- Three retired parameters are gone, and two more estimates are settled (the share of a career with covered work, and the mood baseline).
- Eleven more core files read the core's own date, id and reference folders instead of the old engine's.

## Method

Measured on this branch on October 13, 2026, in the cloud, one run each except the two repeats named under "What happens next". Woodmere used seed m701-a, one process at a time, with bookkeeping off. Gonzales used seed ida. Details for every run are in `docs/coordination/core.md`.
