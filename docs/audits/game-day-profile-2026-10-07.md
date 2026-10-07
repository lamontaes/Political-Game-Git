# A game day takes about 40 times longer than it did on September 26

A game day now takes about 2 seconds, and a payday day takes 8 to 10. On September 26 a game day took about 0.05 seconds. The speed rule allows a game year to get 20% slower, not 4,000%. The first-month-friend test already fails on time: its 30 days cost 133 seconds in plain Node and over 500 on a busy machine, against a 300 second limit.

Most of the cost is one thing: each day the state legislature queue wakes and rebuilds the same family index to seed traits. Two draft pull requests aim at it. The CTO decides the order they land in.

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

## What happens next

- Draft #2454 (dispatch state legislative intake through its saved calendar, so quiet days skip it) and draft #2461 (reuse the family index across snapshots) both aim at the intake row. Neither has landed. The first needs the second's help to meet its speed target, and the CTO's ordering rule blocks that. The CTO decides the order. M2 (a builder) is also caching the same index.
- Open for a builder after those land: the 5.5% table copy and the payday cost. Neither is worth building before the intake cost is down.
- First-month-friend and the couples tests wait on this. Their premise fix is separate and ready.

## How this was measured

Main was at 290dd0a32. `scripts/profile-game-day.ts` profiles ten `passOrdinaryDays(world, 1)` calls with the Node inspector (`node --import tsx scripts/profile-game-day.ts perf-day-1 10`). Seed perf-day-1 drew place 2062025 and perf-day-2 drew place 5129968. The first run's days were 2533 2289 1844 3047 1953 1907 8375 2234 2224 2308 milliseconds and the second's were 1973 1919 1785 2521 1993 2149 9860 2377 2280 2342. The September 26 figure (0.05 seconds a day, 6 contacts) is the same loop at dd183187c, the last commit where first-month-friend passed, measured once on the same machine. The 133 second figure is 30 consecutive days in plain Node on a Houma, Louisiana start (seed first-month-friend).
