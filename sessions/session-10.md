# Session 10 — Laws reach people: Housing, benefits and programs

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Every law in force in this family changes named people's records in live play: rent rules, housing aid, SNAP/Medicaid/TANF-style programs, unemployment, public program records (written 0 times).

## Milestones
1. M1 (45 min): a table on #2424: each law in this family → reaches named people today? (yes / only a town statistic / no) with the evidence from a 30-day watched world (scripts/world-report/run.ts runWorldReport({years:1,days:30,seed,placeKey:observerPlace(seed).key})).
2. M2: first law fixed and merged-ready: the people it touches get a record citing the law (count before → after).
3. Then one law (or tight group) per PR, at least 2 per hour.
4. Duplicate sizings/registries found on the way: keep the bill's own terms, delete the copy.

## Endpoint
Every law in this family shows 'reaches named people: yes' in a 30-day watch on 2 random places, with per-law counts in a final #2424 table.

## CTO instructions and findings (do these)
- CTO FINDING: the benefit formulas (public-benefit-formulas.ts, 6 functions) are never called — no benefit money is paid to anyone; SNAP only records participation. Pay benefits monthly to eligible named people from those formulas.
- CTO FINDING: rent cap has a dead in-file path (cap is infinite) and health coverage eligibility runs only at lease renewal — one path each, run on their real dates.
- CTO FINDING: SNAP never enrolls anyone — the SNAP baseline runs in ensurePlaceOutcomes (opening-life.ts ~458) BEFORE startTownJobPay (~475), so incomes are null and households are skipped (snap-participation/index.ts ~80–81, ~216); later months only add people when the state rate rises (~238). Run the baseline after pay starts, treat no pay + no job as income 0, and re-assess monthly from each household's income.
- CTO FINDING: Medicaid is first assessed in April — the monthly coverage pass is scheduled only from the mortality window (mortality.ts ~547) or a lease renewal. Schedule ensureHealthCoveragePass at opening and monthly.
- CTO FINDING: 19 service laws (preschool, vouchers, transit, broadband, libraries, right to counsel, crisis response…) fire only when a scheduled activity finishes (time-work.ts ~1963) and unplayed people have 0 scheduled activities. Add a monthly service-receipt pass for residents of a served place / enrolled children, stamped with the law.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
