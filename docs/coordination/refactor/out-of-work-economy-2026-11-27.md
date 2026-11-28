# The out-of-work stock: what the one rate shows, and where its climb comes from (Economy, Nov 27, 2026)

Written by Economy for the Opus finisher and Past and Day One, from played years on `fold3/nov27` (seed `oo1`, three places: Lake Arrowhead, Maine 2337795; Carter Springs, Nevada 3210200; Southern Ute, Colorado 0872320). No game code changed. The measure is `scripts/refactor/oow-measure.ts` (read-only; `node --import tsx scripts/refactor/oow-measure.ts --seed oo1 --place <key> --days 2,182,365`).

## Which number is the player's

The player's rate is `townLaborByPlace` (`modules/world-panels.ts`), the one pass the Metrics tab, the paper and the economy panel read: counted residents weigh their households, the workers households place elsewhere (`unplacedWorkers`) are at work. Two other reads of the same records disagree with it and with each other, so the finisher should use the first:

| Read                                                                                                   | Lake Arrowhead day 2 / 182 / 365 | Carter Springs day 2 / 182 / 365 |
| ------------------------------------------------------------------------------------------------------ | -------------------------------- | -------------------------------- |
| The economy panel's rate at the played town                                                            | 4.0% / 7.5% / 9.7%               | 0.0% / 14.6% / 26.7%             |
| Spec share (seekers over seekers plus the town businesses' staff; leaves out workers placed elsewhere) | 16.8% / 36.0% / 39.3%            | 12.9% / 36.8% / 41.1%            |
| Labor force by row counts (seekers over seekers plus everyone at work, one row per person)             | 1.9% / 5.1% / 5.8%               | 2.4% / 7.6% / 9.4%               |

## What it says

1. **The opening is not too jobless.** Day 2 is 4.0% at Lake Arrowhead (the real figure is near it) and under 2% at the small towns. Slice 1 as specified (the opening employment rate) would not move the climb; if anything the small towns open with too few seekers.
2. **The climb is flows, not the opening.** At Carter Springs (heads, one year, month by month, the played town only): 139 people entered the stock (5 opening, 42 laid off from demand below staff, 81 started looking, 11 from closed employers) and 54 left. That is about 41 percent of the labor force entering in a year against roughly 22 percent from the CPS gross flows (the file `src/core2/data/parameters.json` cites LNS17400000), and an exit of about 9 percent of the stock a month against the roughly half a month the CPS flows give (26 percent find work, 25 percent leave the labor force: `jobsContinueBaseline`'s own citation).
3. **Entry is the largest flow and moves in steps.** The chooser's `jobsEnterBaseline` (-2.5, TUNABLE) sets how many idle working-age adults start looking each month. Carter Springs, one year, `started-looking`: 81 at -2.5, 34 at -3.0, 0 at -3.5 (Lake Arrowhead 175 at day 182, 48 at -3.0, 2 at -3.5). Retuning it alone brings Lake Arrowhead to 6.0% at day 365 but leaves Carter Springs at 18.9% and Southern Ute at 17.4% and takes the day-2 stock to zero, so it is not the fix.
4. **Exits.** `reviewRegionalFinds` finds work at `findPerQuarter` per quarter (0.75, CPS median 10 weeks); of 259 finds a year in the Carter Springs region, 218 hired and 36 returned no job (`startRegionalWork` gives none when a household's away share already covers its free working-age members). Local postings fill by the weekly matching.
5. **The away workers shrink.** Lake Arrowhead's workers placed elsewhere fall from 6,416 to 5,936 in the year while working-age residents rise by 180; nothing replenishes them as young adults enter working age, so those entrants join the stock (`loseAwayWorkByTurnover` takes them out; `startRegionalWork` puts the regional finds back only for seekers).

## What I think the fix is (for the finisher; not built)

Day one is whatever the history from 1925 produced (owner, Nov 16): the opening stock should be what the flows leave, so the same entry, layoff, find and give-up flows must run in the history before day one, with entry and exit read from the CPS gross flows' strength (not typed counts) and the away shares replenished as members enter working age by the household's own share. Fixing entry alone moves one flow and leaves the stock wrong in the small towns. The test: at three drawn places, the year's entries against exits (by heads, from the records) read against the cited flows' ratio, and the panel's rate ends the year within a few points of where it began. The records diff names the seeker, job-change, away-share and `world-metrics` tables.
