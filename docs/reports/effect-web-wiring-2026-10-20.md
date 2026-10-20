# A cause in the town moves almost nothing the town can feel

On main on October 20, 2026, the outcome web holds 221 researched links, and 130 of them run. Only 5 of the 221 reach a record a person lives with. All 5 move counted births. The other 125 running links change a number in the web's own monthly ledger, and no engine reads that number back. Crime, coverage, rent, wages, moves, deaths, test scores and turnout carry on as if the link were not there. No link lands differently on different people: 8 links carry a place-level moderator and none carries a person-level one. No link passes all eight points of the wiring standard. The fix is under way, one engine family at a time.

## The standard

A link is wired when all eight points hold:

1. Its cause is read from a real engine record or the law in force, as it stood a lag ago.
2. Its size, lag and spread come from the cited research.
3. The engine that owns the outcome multiplies its own rates by the link's effect, so real records move.
4. It lands differently on people by their own circumstances, and the national average stays the researched size.
5. The outcome it moves feeds the next link through engine records.
6. It builds and fades on the researched schedule.
7. People notice it through their own experience, the news or conversation.
8. One code path serves all 56 places.

## Where each link stands

The matrix scores every link on every point. It sits in `docs/reports/effect-web-matrix-2026-10-20.json`, one row per link and one per measure, with the evidence and the reason for each miss. These counts are measured from that file.

- **Cause:** 135 of 221 links read a real record or law, which is 118 laws, 14 economy records and 3 government measures. Another 31 read the web's own ledger number for their cause, such as police per 1,000, graduation and property tax rate. No engine produces those numbers. The last 55 have no measure at all, and 10 of those need a person's own exposure record.
- **Size:** 120 have a researched size and spread. Another 51 have a size with no recorded spread, and 50 have no size.
- **Reaches the world:** 5 pass, all births links read by counted births (`src/core2/births-counted.ts:292`). Another 158 fail because the engine does not read the factor. Their outcome moves only in the ledger, including 66 kept outcomes such as `housing.rent` and `crime.burglary`. The remaining 58 fail for lack of a measure: nothing keeps the outcome they point at, for example test scores, larceny or the employment rate.
- **Varied:** 0 pass. Eight have a place-level moderator, a law that scales the effect for the whole place. No link varies by a person's income, age, household, tenure, work, sex or region.
- **Knock-on:** 58 links feed a further link. All 58 chains run through the ledger, not through engine records, so a second-order effect never reaches a person.
- **Timing:** each link steps to its full size after its lag. None builds over months or fades.
- **Knowing:** 8 crime links are read by the electorate inputs (`src/core2/electorate-inputs.ts:318`). Voters there see the web's crime number for the town, not a crime they or a neighbor suffered. No other link is noticed by anyone.
- **One rule:** 220 links run the same code everywhere. One link carries per-state sizes in data, which is allowed.

## Why the records do not move

Two read-only surveys of the engines found the following. Each finding names the file that shows it.

- **No crime engine exists in the new core.** The only crime record is a bribe (`src/core2/modules/corruption.ts:48`). Theft, burglary, robbery, assault and vandalism are never committed, so 35 crime and justice links have nothing to move. The owner ruled on October 16 that a crime engine comes "later" (`docs/coordination/OWNER-DECISIONS.md:271`). Today's order asks for crimes and arrests to move, so the CTO needs to settle which ruling holds.
- **No school outcomes engine exists.** The school module decides daily attendance only (`src/core2/modules/school.ts:188`). Its 33 school links have no test score, graduation or enrollment record to move.
- **No cause of death is recorded.** Deaths carry no cause (`src/core2/death-causes.ts:14`), so overdose, firearm and traffic deaths cannot be told apart.
- **No coverage record is on main.** A counted coverage record is in review on its own pull request.
- **Poverty is a ledger number.** A lost job already ends a household's pay through the jobs engine. A web link from unemployment to poverty would count the same loss twice if an engine read it.
- **Two measures are counted in two places.** `housing.eviction` is both an economy record the web reads and a kept outcome with a national base. `voting.youth-turnout` is both a government measure computed from ballots and a link outcome.
- **Engines with a clean place to read the factor:** rents (`src/core2/housing-occupancy.ts:366`), eviction notices (`src/core2/modules/housing.ts:1193`), wages (`src/core2/modules/jobs.ts:1394`), moves (`src/core2/modules/moves.ts:793`), deaths (`src/core2/modules/health.ts:307`), turnout (`src/core2/modules/voting.ts:1003`) and household prices for electricity, broadband and transit (`src/core2/place-prices.ts:202`).

## The twin-world check

`src/core2/outcome-web-twins.test.ts` builds two worlds the way the game does, from the same seed and place. It shifts one running cause in one of them, in the record the web reads it from, then compares every record kind in the two worlds after the lag. An unshifted pair must match exactly first, or the check proves nothing. Its results are written into the matrix under `twins`.

## What happens next

- **Done:** per-person reach, moderators and phase-in, with counted births by the mother's age, on its own pull request.
- **In progress:** seven engine families on their own branches: housing, labor, moves, health, voting, prices and credit, and poverty. Each makes its engine read the web's factor per person and adds researched moderators. Each also writes one played test per link.
- **Next:** school outcomes, crime records (once the CTO settles the ruling), causes of death, and the environment links that reach people only through health.

Method: the matrix comes from `scripts/outcome-web/effect-matrix.ts`, run on main at adf19db3c. The engine surveys were read-only. The twin check uses seed ew20oct26.
