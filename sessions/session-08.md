# Session 08 — Laws must pass: councils and Congress

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
City and county councils adopt ordinances and Congress files and votes on bills in live play.

## Milestones
1. M1 (45 min): baseline from a 30-day watched world (scripts/world-report/run.ts runWorldReport({years:1,days:30,seed,placeKey:observerPlace(seed).key})): ordinances filed/read/adopted for the watched town's government and 3 others; Congress bills filed/voted.
2. M2: root cause for each level (file:line) on #2424.
3. M3: councils adopt ordinances (quorum, readings, votes from seated members).
4. M4: Congress files and votes bills; at least one passes a chamber in 30 days.

## Endpoint
30-day watch on 3 seeds: ≥3 ordinances adopted across councils including the watched town's, Congress ≥10 bills filed and ≥1 chamber passage; counts posted on #2424.

## Items / notes
- The CTO adds root causes here; re-read before M2.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
