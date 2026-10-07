# Session 19 — Speed: year timer and focus tiers

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
A game year simulates in under 2 minutes; full detail only near the player, everything else on its own calendar.

## Milestones
1. M1 (30 min): `npm run speed:year` exists (watched world, seeded random place, 365 days, prints seconds/day and top 10 costs, exits 1 over budget); today's number posted.
2. M2: other state legislatures, Congress and courts run only on their session/hearing/election dates.
3. M3: places outside the focus circle advance weekly in one batch; national figures monthly.
4. M4: whole-world integrity checks only in tests that ask for them.

## Endpoint
`npm run speed:year` passes (< 2 min per game year) on the owner's Mac, with before/after numbers in each PR and a same-records check for the focus circle on 3 seeds.

## Items / notes
- Measured today: 1.74 s per game day; the state legislature step is 39% of a day; a people-table copy per state step ~20%.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
