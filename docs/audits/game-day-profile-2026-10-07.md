# A game day takes about 40 times longer than it did on September 26

A game day now takes about 2 seconds, or 8 to 10 on a payday. On September 26 it took about 0.05. The speed rule allows a game year to get 20% slower, not 4,000%. The first-month-friend test already fails on time: 30 days cost 133 seconds in plain Node and 1,022 under the test runner, against a 300 second limit.

Most of the cost is one thing: each day the state legislature queue wakes and rebuilds the same family index to seed traits. Two drafts aim at it, but reuse alone did not help when measured: each day adds about 150 new people, which changes the tables the index depends on. The CTO decides what goes first.

## Where the time goes

Measured on main with ten consecutive game days on an ordinary generated age-30 life, in two places drawn at random from the 56. Shares are of the ten days' total time. A subsystem's share includes the subsystems under it, so rows overlap and must not be added.

| Share, seed 1 / seed 2 | What it is                                                                                                                    | Where                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 80% / 79%              | everything the daily clock resolves                                                                                           | `future-transitions.ts`                                   |
| 54% / 51%              | the state legislature queue waking each day                                                                                   | `nationwide-world/state-legislature-turnover.ts`          |
| 52% / 50%              | the intake step inside that wake                                                                                              | same file                                                 |
| 36% / 35%              | seeding traits for people the intake touches, which reads each person's upbringing                                            | `people-traits.ts`, `people-upbringing.ts`                |
| 32% / 31%              | rebuilding the family index inside that read (14% / 13% of all time is spent in this one function itself)                     | `people-upbringing.ts`                                    |
| 15% / 15%              | building candidate slates, inside the intake step; 6% / 5% of all time is copying the whole 10,000-person table to add people | `state-legislature-candidates.ts`, `character-history.ts` |
| 17% / 19%              | payday: withholding tax and settling each paycheck                                                                            | `living-world/town-pay.ts`, `statutory-tax.ts`            |

Garbage collection takes 10% of all time spent in individual functions, a separate measure from the shares above.

Both places held about 10,300 people (10,277 and 10,299), so the world size does not depend on the place drawn, as measured in these two.

## What the numbers say

- On an ordinary day (the median of ten, about 2.2 seconds in both runs), the legislature wake is the biggest cost by a wide margin. The next largest, candidate slates, is a quarter of its size. This is measured.
- Payday is the slow day in each run (day 7: 8.4 and 9.9 seconds). Its cost follows the number of paychecks, which is inferred from the call tree, not tested at a second workforce size.
- Days get slower as a month goes on. In the 30-day plain-Node run, days 1 to 10 took 27 seconds, days 11 to 20 took 40 seconds, and days 21 to 30 took 65 seconds. That is why the 10-day profile's average (2.9 seconds a day) understates a month.
- `recordPrivateBelief` did not show up on these ordinary days. It was not measured on a day with political writes.

## Why the family index is rebuilt so often

Measured on seed 1 (the January life above), counting the family index calls over the ten days: 1,565 calls, of which 445 were rebuilds. In 407 of those rebuilds, the people table and the household tables had changed since the last build. Each day the wake adds about 150 new people (fictional candidates, each with a residence background) and about 120 state legislative candidate slates, in many small batches, and each batch changes the tables the index is keyed on. A rebuild costs about 19 milliseconds (8.3 seconds over 445 rebuilds). This is measured for seed 1 only.

Pull request #2461 reuses an index while its tables are unchanged. Merged onto main locally, it gives the same world (the saved-world hash matched on both seeds) and no speedup: 25.9 seconds became 26.4 seconds on seed 1, and 26.9 seconds became 26.6 seconds on seed 2. So reuse across unchanged snapshots does not help, because the tables change between nearly every call. A fix has to extend the index when people are appended, or batch the people created in a day, and either one changes the order people are written in, so it needs a parity check against the saved world, not only a speed check.

Pull request #2454 does not merge onto main cleanly (conflicts in `time-work.ts` and `office-continuity.ts`; its base is older), so its effect was not measured here.

## What happens next

- Draft #2454 (dispatch state legislative intake through its saved calendar, so quiet days skip it) and draft #2461 (reuse the family index across snapshots) both aim at the intake row. Neither has landed. #2461 alone gave no speedup in the local composition above, and #2454 needs rebasing. The CTO decides what goes first. M2 (a builder) is also caching the same index.
- Open for a builder after those land: the 5.5% table copy and the payday cost. Neither is worth building before the intake cost is down.
- First-month-friend and the couples tests wait on this. Their premise fix is separate and ready.

## How this was measured

Main was at 290dd0a32. `scripts/profile-game-day.ts` profiles ten `passOrdinaryDays(world, 1)` calls with the Node inspector (`node --import tsx scripts/profile-game-day.ts perf-day-1 10`). Seed perf-day-1 drew place 2062025 and perf-day-2 drew place 5129968. The first run's days were 2533 2289 1844 3047 1953 1907 8375 2234 2224 2308 milliseconds and the second's were 1973 1919 1785 2521 1993 2149 9860 2377 2280 2342. The September 26 figure (0.05 seconds a day, 6 contacts) is the same loop at dd183187c, the last commit where first-month-friend passed, measured once on the same machine. The 133 second figure is 30 consecutive days in plain Node on a Houma, Louisiana start (seed first-month-friend).
