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
- CTO FINDING (verified): deaths first run at the start of the NEXT quarter — ensureCrisisMortality schedules the first window at firstOfNextQuarter (crisis/mortality.ts ~106, ~415); for a Jan 5 start that is Apr 1, and each person's risk then builds up from zero. Fix: open the first death window at opening (partial quarter) and start each person's risk from their age. Done when a 30-day watch has 6–16 deaths across ~15,000 people.
- NOTE: mortalityCheckPlans/mortalityCheckResults are a retired path (vitality.ts ~25, ~81) — leave them empty; don't revive them.
- CTO FINDING: no pregnancies exist at opening; the first birth decision happens on day 91 and lands 273 days later (people-family-plan.ts ~53–56). Seed pregnancies at opening for couples 18–45 at the place's birth rate, due within 0–273 days.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
