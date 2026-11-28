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
2. **The climb is flows, and the exits are what is slow.** One year, month by month, heads, the played town only (same world as the table above): Lake Arrowhead had 427 enter the stock (45 opening, 179 started looking, 156 laid off for demand below staff, 45 from closed employers) and 261 leave; Carter Springs had 174 enter (93 started looking, 52 laid off, 29 from closed employers) and 67 leave. Entry at Lake Arrowhead is about 26 percent of the labor force a year against roughly 22 percent from the CPS gross flows (the file `src/core2/data/parameters.json` cites LNS17400000), so entry is about right there; the mean completed search was 4.6 months (`findPerQuarter` 0.75 gives a pull of 0.25 a month, so every search ends the same month) against about 2.4 months of sojourn in the CPS flows (49 percent still unemployed next month, 26 percent employed, 25 percent out of the labor force: `jobsContinueBaseline`'s own citation). Doubling `pastWorkFindsPerQuarter` alone flattens Lake Arrowhead (4.0, 4.2, 5.7 percent) and leaves Carter Springs at 27.8.
3. **Entry moves in steps, so it is not the lever.** `jobsEnterBaseline` (-2.5, TUNABLE): Carter Springs `started-looking` was 81 at -2.5, 34 at -3.0 and 0 at -3.5 (the first world read; the sizes differ a little at the seed the table uses). Retuning it alone brings Lake Arrowhead to 6.0 percent but leaves Carter Springs at 18.9 and Southern Ute at 17.4 and takes day 2 to zero.
4. **The away workers.** Lake Arrowhead's workers placed elsewhere fall from 6,416 to 5,936 in the year (turnover loss; `startRegionalWork` puts back only seekers' regional finds). Not changed here.
5. **Staffing in the small towns.** Carter Springs filled 82 positions in the year while 60 layoffs and 43 jobs of closed firms ended; its target sits above its staff all year (staff 276, target 340 at day 330) while 100 people look. The small towns' climb (Carter Springs 23.0, Southern Ute 19.8 at day 365 after the fix) is this, and is not fixed.

## What was built (the exits)

In `reviewRegionalFinds` (`modules/jobs.ts`), a seeker's monthly find pull is scaled from 1 to 2 times by their need for work as a share of its largest (`unemployedNeed` over `jobsUnemployedNeedWeight`, the need the apply and look choices already read; a household days from the rent searches harder). Spells then differ by person (completed searches at Lake Arrowhead went from a mean of 19 weeks to about 11, the CPS sojourn being about 10), and a pull that reaches one with no regional job to take it now keeps its progress. Rates at the drawn places, day 2 to day 365: Lake Arrowhead 4.0 to 6.3 (was 9.7), Stonewood, West Virginia 3.8 to 4.6 (6.8), Inarajan, Guam 10.3 to 5.0 (9.8), Richwood, West Virginia 8.7 to 5.1 (6.9).

## Left

- **The long tail.** The stock's ongoing mean spell is 8.6 weeks and median 7.0 against the CPS 23.1 and 10.1: the game has no duration dependence (`b_durationDependenceJobFindingRate` is "notFound" in the research file); the finder needs a fetched rate first.
- **Small towns' staffing** (item 5 above), and the away workers' replenishment (item 4).
- **Day one in motion.** The opening stock is the first month's chooser, not what the flows leave; running the flows in the history before day one stays the right end state.
