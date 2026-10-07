# Session 12 — Laws reach people: Schools, health, elections and services

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Every law in force in this family changes named people's records in live play: school funding and enrollment, health coverage, voter ID/mail/registration, redistricting, roads, clinics, transit.

## Milestones
1. M1 (45 min): a table on #2424: each law in this family → reaches named people today? (yes / only a town statistic / no) with the evidence from a 30-day watched world (scripts/world-report/run.ts runWorldReport({years:1,days:30,seed,placeKey:observerPlace(seed).key})).
2. M2: first law fixed and merged-ready: the people it touches get a record citing the law (count before → after).
3. Then one law (or tight group) per PR, at least 2 per hour.
4. Duplicate sizings/registries found on the way: keep the bill's own terms, delete the copy.

## Endpoint
Every law in this family shows 'reaches named people: yes' in a 30-day watch on 2 random places, with per-law counts in a final #2424 table.

## CTO instructions and findings (do these)
- CTO FINDING: teacher pay floor, tuition freeze and similar laws bypass the shared consequence step (enacted-law-effects.ts ~797); 46 of 118 law links in the outcome web do nothing — each link must move a named person's record, not only the number.
- CTO FINDING: policy follow-through (policy-semantics.ts ~609) and incidents (incidents.ts ~485) have handlers that are never registered and schedulers never called; register and schedule them.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
