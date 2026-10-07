# Session 17 — Everyday life: deaths and births

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
People die and are born at real rates in live play (a 30-day watch had 0 deaths among 15,031 people and 0 births).

## Milestones
1. M1 (45 min): root cause posted: why mortality checks and births never run on the live day clock (file:line).
2. M2: deaths happen at about real rates; each death recorded with a cause and reaching family records.
3. M3: births happen at about real rates into recorded households.

## Endpoint
30-day watch on 2 seeds: deaths and births within ±50% of the real monthly rate for the world's population, with counts posted.

## CTO instructions and findings (do these)
- The CTO adds the investigator's root cause here.
- CTO HINT: check whether mortality checks are scheduled at all in a watched world (mortalityCheckPlans/Results were never written in 30 days); the clock has a hidden backup handler lookup (future-transitions.ts ~353) — make sure the mortality handler is in the main list and is scheduled.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
