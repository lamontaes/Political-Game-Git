# P6: Federal laws, macro and micro (Lydia, SC; seed 1791948706110-ab2db744ab80; head fd3574c9)

## Record at the end

- Federal law rows: snap-maximum 298 and medicaid-match 69.53 (2025-10-01). 2025-12-15 enactments: balanced-operating-budget 1, adopt-income-tax 1, exempt-groceries 1, medicaid-work-requirement 0. 2026-01-01 income-tax 37 and social-security-tax 6.2 match their from-start rows in value and terms.
- budget:US:2025 (C-budget): revenue unchanged from FY2024 (523.46e12 minor). Spending 700.91e12 before the balance law, 523.46e12 after. Social Security 158.07e12 to 118.05e12. netInterest 97.04e12 to 72.47e12. All 13 lines cut by 25.32%. Total cut: balance|US|2025-12-15, 177.4e12 minor (about $1.77T).
- Macro (D-macro, 2025-09 to 2026-02): unemployment 4.416 to 4.542 (+0.026/month, no kink). Inflation 2.722 to 2.656 (-0.014/month). Policy rate 4.125 (cut in 2025-08, not federal law). Hourly earnings +0.086/month.
- Regional (end-regional, metro 45/24860): unemployment 3.993 to 4.082 (Oct to Jan), no kink.

## Decision points

- world-legislating.ts:247 inForceForTown and legislature.ts:1946 enact. Federal acts take effect on the act date. Policy values: `provision.value > 0 ? 1 : 0` (legislature.ts:2009), so a -1 becomes 0. Rules, no numbers.
- laws.ts:352 enactLaw writes the row; laws-in-force.ts:180 resolveLawInForce reads rows by level and date.
- group-b.ts:551 registerGroupB; group-b.ts:529 review re-runs each active policy monthly with enacting = inForce.
- group-b.ts:284 balanced-budget calls group-b-money.ts:404 balancePlan, which reads spendingMinor and revenueMinor. It exempts `spendingMinor.interest` (line 411); the row key is `netInterest`, so nothing is exempt. Ratio (line 414) = (spending-revenue)/spending = 0.2532, applied to every line (line 417). Hard-coded, no tag.
- budgets.ts:1006 amendBudget writes the budget row, appends to adoptedBy (line 1032), and emits budget-line-changed. Nothing reads socialSecurity or netInterest (reach-group-b.json:354 budgetLines has neither).
- group-b.ts:322 and group-b-money.ts:587: federal income tax already exists (37), so `!hasTax` writes nothing (wroteLaw 0). The policy stays in force.
- budgets.ts:523 syncSalesTax: state sales tax 6 (SOURCED, Tax Foundation) and local average 1.49 (ESTIMATED from-start), federal rates skipped (line 539). Grocery exemption read by groceryExemptionInForce (lines 673-687), which checks every level including federal. NAICS 445 (line 514) hard-coded.
- budgets.ts:949 withholding: income tax 37 (SOURCED IRS rp-25-32), Social Security 6.2 (SOURCED 26 USC 3101, wage base 184,500 SOURCED), Medicare 1.45 (SOURCED). tax-withholding.ts:93 caps Social Security at the wage base.
- macro-model.ts:160 stepMacroMonth. Public-budget term macroPublicBudgetImpulse (line 182) = 0, ESTIMATED (data/macro/parameters.json:304-309; stopgap SG-WORLD-macro-public-budget, open). Other terms: persistence 0.97 TUNABLE, natural unemployment 4.5 TUNABLE, Okun 1.152 SOURCED.
- macro, jobs, housing, credit, business, place-prices, regional: no call to lawInForce or any policy question (grep). Only federal input is the minimum wage (laws.ts raiseToFloor).
- credit.ts:275-278 reads creditDtiReferencePct ("federal 43 percent", line 267). Tag not traced.

## Verdicts

1. Yes, a formula. group-b-money.ts:414 sets one ratio that decides every line's cut; the vote does not set amounts.
2. Yes. group-b-money.ts:410 `if (spending <= revenue) return {}`: any deficit triggers a full pro-rata cut. Also group-b-money.ts:587 `!hasTax` and legislature.ts:2009.
3. Yes. (a) Social Security, Medicare and netInterest cuts: no reader (reach-group-b.json:354; law-effects.ts:196). (b) snap-maximum and medicaid-match: bench view only (laws.ts:416-427). (c) adopt-income-tax group reached 1,426 people with wroteLaw 0 (D-law-reach).
4. Yes. group-b.ts:284 balanced-budget has no stopgap and its exemption key is wrong. SNAP and Medicaid-match rows have no reach row and no stopgap. The adopt-income-tax no-op has no stopgap (group-b.ts:322).
5. Yes. Public news shows raw values: medicaid-work-requirement "0" and adopt-income-tax "1" with no tax written (D-laws-all, 2025-12-15). snap-maximum "298" is public but moves no benefit.
6. No. grep for US-SC, Lydia, 45031 and "SC" in the path files found nothing.
7. Partly. The bill questions are in the 18-subject catalog (data/legislature/bill-catalog.json:285-330), covered by the baseline's legislation rows. Not covered: the uniform balance formula (group-b-money.ts:404) and the federal grocery exemption on state and local tax (budgets.ts:546).

Macro: the federal budget cut reaches no macro term (macroPublicBudgetImpulse = 0). Unemployment, inflation and wages show no move at 2025-10-01, 2025-12-15 or 2026-01-01. Not reached: regional-model.ts internals.

Federal adopt income tax: meaningless. It writes nothing; the federal tax already exists.
Federal grocery exemption: meaningful only as a state and local price effect (budgets.ts:546), which federal law cannot grant. Applied in play: reached 8,287 of 8,287 grocery-eligible people.

Social Security 25% cut: not sound. It is a formula, not a decision. It cuts statutory benefits and debt interest by the same ratio, and revenue includes payroll taxes that fund Social Security with no trust-fund split. No person's benefit changes.

13 times: a record bug, not 13 applications. The law applied once per line (13 budget-line-changed events). The repeated "amended by" text (budgets.ts:1032) is duplicated; review does not reapply (group-b-money.ts:410).

(d) Micro: no withholding or benefit change. The 2026-01-01 federal rows match from-start rows, so withholding (budgets.ts:949) is unchanged. The household member person_ed8f77123a57b31b (payroll-household.json) repeats the same amounts (44,408, 50,752, 63,440, 63,440) from October 2025 through February 2026. The player person_ed8f76123a57b168 gets 0 every period. C-budget withholding sample ends 2025-02-07, so post-2026 withheld amounts are not reached directly.

## Defects

- Never cut debt interest | group-b-money.ts:411, :417 (`interest` vs `netInterest`) | balance|US|2025-12-15 | netInterest cut 25.3%, about $246B a year.
- Test passes vacuously | law-reach-group-b.test.ts:871-873 checks the wrong key, LOCAL only | (test) | federal case never tested.
- Entitlements cut by formula | group-b-money.ts:404 balancePlan | budget:US:2025 socialSecurity | benefit line cut 25.3% (about $400B), read by no engine.
- Duplicate record text | budgets.ts:1032 | budget:US:2025.adoptedBy | same measure 13 times.
- No-op counted as reached | group-b.ts:322-333 | us-policy-positions:fiscal.adopt-income-tax group (1,426 reached) | a policy writing nothing reaches people.
- Federal law on state and local tax | budgets.ts:546, :673-687 | exempt-groceries group (8,287 reached) | SC state and local tax removed on groceries by a federal act.
- Unread public rows | laws.ts:416-427 | law:US-SC:federal:snap-maximum:general:2025-10-01; medicaid-match 2025-10-01 | public news, no reader.
- Source and value mismatch | law:US:federal:...medicaid-work-requirement:general:2025-12-15:2025-004 | reach-group-b.json cites Pub. L. 119-21 sec 71119, which imposes the requirement; the game row is 0.
- Active date reset | group-b.ts:521-525 | active rows show since 2026-02-20 | not the enactment date.

Not reached: regional-model internals, central-bank votes, the federal minimum-reserve row, Lydia's purchase-tax price numbers.
