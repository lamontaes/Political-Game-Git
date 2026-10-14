# PATH 7 — South Carolina state law: legislating and effects (read-only trace)

Run: Lydia, SC (4543135), seed 1791948706110-ab2db744ab80, head fd3574c9, 2025-01-20 to 2026-02-24.

## Record at the end

- Session end scheduled for US-SC: 2026-05-07 (SOURCED, NCSL). Not reached: the run ends 2026-02-24. No SC session end falls in the window; the only session end in the window is US-NM 2026-02-19.
- Law in force, law-in-force-by-date.json, every snapshot 2025-01-20 to 2026-02-24: income-tax 43 (federal 37 + state 6), sales-tax 7.49 (state 6 + local avg 1.49), unemployment-weekly-maximum 350, unemployment-insurance 1. No change at 2026-01-01.
- Enactments and raises: none (D-laws-all `enactments` and `raises` are empty).
- Budget US-SC:2025 welfareAndMedicaid 1,113,099,501,051 = budget:US-SC:2024 1,154,516,719,493 − 41,417,218,442 (bill 2025-001 provision). Exact.
- retirementContributions +38,351,817,000 in FY2024 (2025-01-20) and FY2025 (2025-07-20).
- highways FY2024 187,658,295,271; FY2025 187,994,898,652.

## Decision points

1. world-legislating.ts:openWorldLegislating (72–113): reads sessionRows[stateKey] (regularSessions) and core.date. Only dates after 2025-01-20 are scheduled as SOURCED (line 106). Past dates are carried forward a year as ESTIMATED (lines 90–102). No 2025 session end exists for any state. Congress day 349 (TUNABLE, campaigns/parameters.json).
2. world-legislating.ts:agendaDate (153–158): adjournAt, or the full-year month fullYearSessionAgendaMonth = 6 (TUNABLE).
3. laws.ts:openLaws (~70–100): writes starting rows; schedules effect only for rows after today (SOURCED/ESTIMATED from starting-law data).
4. laws.ts:lawInForce (325): pure read over law rows; numbers are the rows' own (SOURCED or ESTIMATED).
5. budgets.ts:syncSalesTax (523–560): reads lawInForce("sales-tax") rate (SOURCED, 6). Re-run on law-took-effect (budgets.ts:165–170). Same rate, so no change.
6. budgets.ts:withhold (924–949) → tax-withholding.ts:withholdingFor (59): reads income-tax, social-security, medicare. Single-schedule standardDeduction 8350 (row terms). Check: 35,760¢ paid, 7 days → state 383¢ matches (357.60×365/7 − 8350 − 3640)×3%/52.14. Rate SOURCED.
7. jobs-benefits.ts:unemploymentTerms (81) → standIn (60–80) because registerUnemploymentTerms (56) is never called. Uses ESTIMATED parameters (jobsBenefit*). SC's 350 and 1 are never read.
8. law-reach/group-b.ts:334 (income-tax-rate) and :388 (sales-tax records): read lawInForce. Registered via data/laws/reach-group-b.json.
9. law-effects.ts:applyLaw (219–251) and inForceHere (145–160): catalog policy-effects.json has 5 keys, none for SC tax or unemployment. Test is value === 1.
10. legislature.ts:executivePriorities (427–480): base = budgetCarry (537, prior-FY budget row). share = executivePriorityShare 0.05 (TUNABLE, campaigns/parameters.json:341) × max(0, 1+traitLean) × personStance(lean, "budget-line:<line>") (campaign-views.ts:231). Sponsor is the governor's term (setBy). The welfare ratio is −41.4B/1,154.5B = −0.0359, so (1+trait)×stance ≈ −0.72. Lean values not checked.
11. legislature.ts:councilBudget (248) and roll (274): member votes, no random draw.
12. law-reach/group-b.ts:252–266 (highway-shift): plan = highways × highwayShareShifted (0.1, TUNABLE, reach-group-b-parameters.json). Verified: 208,509,216,968 × 0.1 = 20,850,921,697.
13. law-reach/group-b.ts:269–282 (pension-funding): perResidentDollars 70 (ESTIMATED, spread 20–150) × centsPerDollar 100 (SOURCED) × 5,478,831 residents. Verified: 70 × 100 × 5,478,831 = 38,351,817,000.
14. law-reach/group-b-money.ts:moveBudget (346–~400): guard at 381 is per budgetId (fiscal year). Stamp `${lawId}#${date}`.
15. budgets.ts:amendBudget (1006–1045): writes spendingMinor; adoptedBy text appended at 1032 once per line.

## Verdicts

1. Seeded roll or fixed % decided an actor's outcome? **No** roll (no random in the traced files). Fixed shares 0.1 (group-b.ts:260) and 0.05 (legislature.ts:465) set sizes, not one actor's outcome. Answer: no.
2. Flip at a threshold? **Yes, by law date only.** law-effects.ts:251 (`value !== 1`) and :145–160 switch on effectiveDate. No world-event threshold found.
3. Record no engine reads? **Yes.** The six 2026-01-01 law-took-effect rows (D-laws-all allLawTookEffect) are public, news:true, personIds []. E-news has 0 mentions. The unemployment and local-income rows have no reader (jobs-benefits.ts:56 never registered; no catalog key).
4. Shortcut without a registered stopgap? **Yes.** The H.4216 later-2026 change in terms.laterIn2026 of law:US-SC:state:income-tax:general:2026-01-01 is not modeled and has no row in stopgaps.json (grep "4216" = 0). The missing 2025 session ends for all states are also unregistered. Registered: SG-WORLD-jobs-benefits-terms (stopgaps.json:2300), SG-GOV-start-law-carried-back (:1025).
5. Player-visible value zero or UNKNOWN? **No** UNKNOWN label found. local-income-tax-authority = 0 is real (SC has no local income tax). Not reached in screens.
6. State, city or GEOID named in logic? **No.** grep for US-SC, "SC" and 45031 in src/core2 (excluding tests and reference/) found nothing.
7. Mechanic not in golden path, baseline or owner-asked? **Yes** for pension-funding and highway-shift. They are catalog policy positions. docs/roadmap/political-process-baseline.md has 0 mentions of pension, highway, voucher or unemployment. Budgets by vote are covered (baseline line 21).

## Defects

- Session calendar | world-legislating.ts:openWorldLegislating:90–106 | state-session-calendars-2026.json regularSessions.US-SC | No 2025 session for any of 52 states with sessions; SC's first is 2026-05-07, after run end. Zero SC bills in 400 days is structural.
- No session rows | world-legislating.ts:90 | regularSessions US-MT, US-NV, US-ND, US-TX = [] | These four states never legislate.
- Dead records (read-only) | jobs-benefits.ts:56,81 | law:US-SC:state:unemployment-weekly-maximum/unemployment-insurance:general:2026-01-01 | Written, never read; benefits use parameter standIn.
- Zero-change events | laws.ts:openLaws / law-took-effect | law:US-SC:state:income-tax:general:2026-01-01 (= from-start row: value 6, same terms) | Six events, no number moves.
- Unmodeled change | data row terms.laterIn2026 | law:US-SC:state:income-tax:general:2026-01-01 | Note says 1.99%/5.21% later in 2026; value stays 6; unregistered.
- Duplicate audit text | budgets.ts:1032 | budget:US-SC:2024 and :2025 adoptedBy | "amended by ...#2025-01-20" appears twice (two amendBudget calls per moveBudget). Values are not doubled.
- Unlocated trigger | law-reach/group-b-money.ts:381 | budget:US-SC:2025 (2025-07-20) | No src literal and no law event on 2025-07-20 (allLawTookEffect). Not reached.
- Compounding | group-b-money.ts:381; legislature.ts:537 | budget lines retirementContributions, highways | Re-applied each fiscal year. Highways decay 10%/FY; pension 70/resident/FY feeds next budgetCarry base. Within window only FY2024 and FY2025 apply. Later years not reached.
- Withholding after 2026 | C-budget.json withholdingSample | 15 samples, all 2025 | Post-2026 paychecks not reached. payroll-household.json has no tax lines.
- Macro, regional, business | macro.ts, regional.ts, D-business.json | none | macro.ts has no lawInForce (only Okun comment at :241). D-macro, D-regional and D-business have 0 SC law references. Not reached for purchase tax on business costs.
