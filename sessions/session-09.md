# Session 09 — Laws reach people: Taxes and pay

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Every law in force in this family changes named people's records in live play: state income, sales, property and payroll tax, minimum wage, overtime, earned-law pay assessments (written 0 times in 30 days).

## Milestones
1. M1 (45 min): a table on #2424: each law in this family → reaches named people today? (yes / only a town statistic / no) with the evidence from a 30-day watched world (scripts/world-report/run.ts runWorldReport({years:1,days:30,seed,placeKey:observerPlace(seed).key})).
2. M2: first law fixed and merged-ready: the people it touches get a record citing the law (count before → after).
3. Then one law (or tight group) per PR, at least 2 per hour.
4. Duplicate sizings/registries found on the way: keep the bill's own terms, delete the copy.

## Endpoint
Every law in this family shows 'reaches named people: yes' in a 30-day watch on 2 random places, with per-law counts in a final #2424 table.

## CTO instructions and findings (do these)
- CTO FINDING (verified): pay runs only for the controlled person — `applyDateBoundary` calls settleJobPay only when control.kind === 'person' (time-work.ts ~2070; also ordinary-life.ts ~435, job-market.ts ~2319). Nobody else hired through the job market is ever paid, so no tax withholding, minimum wage or pay law can reach them. First PR: one payday writer that pays every active paid job (town pay, job market, local businesses local-economy.ts ~537, pre-start jobs character-history.ts ~1465), then attach the pay laws to it.
- CTO FINDING: federal laws reach money four ways; FEDERAL_LAW_EFFECTS / settleFederalTreasuryMonth (federal-treasury.ts ~87, ~244) are dead. Keep the per-paycheck path sized by the bill's terms; delete the dead table and the second attribution of the same tax.
- CTO FINDING: the 2026 federal income tax table is used for every year; index by year from the law in force.
- DO FIRST (so every law session can measure): the world report decides 'acts' from static catalogs, never from saved law stamps (scripts/world-report/run.ts lawOutcomeLines ~2268). Make it count `lawEffectStamps` per policy question and show records per law. Done when Arizona income tax shows ≥60 stamped paychecks in a 30-day White Mountain Lake watch. Post SESSION 09 READY early so Sessions 10–12 can use it.
- CTO FINDING: minimum wage is applied a second time without a stamp — pay at hire is floored via `minimumHourlyAt` (town-pay.ts ~984) from the data table; the registry pay row writes only when the floor is above the contract (town-pay.ts ~1357, ~1491). One path: route the hire-time floor through the pay consequence and stamp the terms when the floor binds.
- CTO FINDING: property tax under starting law is never assessed — assessment days are scheduled only when a tax proposal is enacted in play (tax-policy.ts ~703). Schedule assessment days for property taxes in force at the start.
- CTO FINDING: state income tax on officeholders' paychecks is unstamped (361 liabilities) and Social Security/Medicare are 'rule-unknown' on 29,545 paychecks; federal withholding (29,612 records) has no law link. Stamp them from the law in force.
- CTO FINDING: living costs and sales tax run only for the played person (life-opportunities.ts ~461); run them for every household (focus circle daily, others in the weekly batch once Session 19 lands).

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
