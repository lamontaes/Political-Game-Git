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

## CTO instructions and findings (do these)
- ROOT CAUSES (verified by the CTO):
- 1. CONGRESS FILES NOTHING: same filing bar as states (member-agenda-settings.ts:5 FILING_THRESHOLD = 3 vs strength × 4 × weight, max 2.71 on any federal question; only 155 of 435 House and 31 of 100 Senate members hold any principle). Fix with Session 07's rescale (coordinate: Session 07 owns the bar; you prove Congress). Also the intake prints 'Members of Congress filed their bills.' while filing 0 (congress-lawmaking.ts ~217) — report the real count. Done when a 30-day watch has ≥1 federal bill and a 120-day watch has ≥1 federal floor vote.
- 2. COUNTY BOARDS NEVER MEET: ensureCountyCouncilOpening (municipal-council-opening.ts ~54, from opening-life.ts ~540) seats members, then ensureCountyGovernmentSeatsForUnit finds no empty seat and returns at local-government-seats.ts ~498 WITHOUT writing the 'seated' record, so localGovernmentSeated is false, seatedCouncil skips the county (local-council-meetings.ts ~454) and no biweekly meeting is scheduled (~472). Fix: one seating writer that always records 'seated'. Done when the White Mountain Lake opening has a civic:local-council-meeting item and a 30-day watch votes ≥1 local ordinance.
- 3. LOCAL INTAKE WAITS FOR THE NEXT QUARTER: localMemberAgendaIntakeHandler first runs 01-01/04-01/07-01/10-01 after opening. Start it at opening. Biweekly meetings exist only for the anchor's town — run them for every seated council (focus circle in full, others on the weekly batch).
- 4. DUPLICATES: three local filing routes (local-council-meetings.ts biweekly, quarterly localMemberAgendaIntakeHandler, dc-council-sittings.ts which skips committee) and councils defaulting no-reason votes to YES (council-lawmaking.ts ~140) vs 'present' elsewhere; two `municipalRulePackById` (municipal-rule-registry.ts:12, municipal-government.ts:1331). Converge on one procedure path and one vote rule.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
