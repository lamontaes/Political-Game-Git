# PATH 5: Day-one laws, micro level (Lydia SC; household_9a045a25aa153048)

## Record at the end

- **Paycheck and withholding (Megan Mullen, person_ed8f77123a57b31b):** `work-payroll:2025-09-25:...:organization_cb139e837732e385:...:person_ed8f77123a57b31b:18`, gross 63440. Withholding `withholding:work-payroll:2025-09-25:...:18`: US income 169 (law:US:federal:income-tax:general:2026-01-01:from-start), SC income 524 (law:US-SC:state:income-tax:general:2026-01-01:from-start), Social Security 3933 (law:US:federal:social-security-tax:general:2026-01-01:from-start), Medicare 920 (law:US:federal:medicare-tax:general:2013-01-01). Net 57894 to cash:person_ed8f77123a57b31b:residual, which equals Megan's end liquid (people.json). Income tax checks by hand: 634.40 x 26.07 = 16,540, less 16,100, times 10% = 169.
- **Player's paychecks (Paul Mullen, person_ed8f76123a57b168):** 7 paydays in payroll-household.json, all paidMinor 0. The durable log shows 166 decline-scheduled-work-date-segment and 0 attend-scheduled for this person. Pay is zero because the player declined the shifts; no law is involved. Player liquidMinor 0, livingCostDailyMinor 0 (player.json); the zero living cost is not reached.
- **Purchase and sales tax:** not reached. No living or tax.sales transfer is in durable-log.json or journal.json (the journal keeps account totals only). Formula: state 6 and local 1.49 give 6.97% of the tax-inclusive price (budgets.ts:546-562, purchase-tax.ts:85-86, 106).
- **Unemployment claim:** `claim:person_1592eab735097b75:2025-05-01` (counted resident), weeklyMinor 47947 ($479.47/week), paidMinor 95894 (D-jobs.json).
- **Property tax:** `dwelling:household_9a045a25aa153048` (own, value 11812957); `assessment:household_9a045a25aa153048` 2026 = 12237001. Implied bill 4201 a month (12237001 x 0.412% / 12). Payments not reached.
- **Minimum wage:** no position below 725 (0 of 1078, end-jobs.json). The floor never binds in this run.

## Decision points

- budgets.ts:withhold (924-991): reads paidMinor, yearToDate, lawInForce for income, SS and Medicare (laws.ts:325). Record tag hard-coded SOURCED (line 986).
- tax-withholding.ts:withholdingFor (59-125): periods = 365 (line 68, hard-coded); single-filer schedule (line 73, hard-coded); brackets and deduction from law terms (estimate:true). SS 6.2 (estimate:true); wage base 184500 (carried back, SG-GOV-start-law-carried-back). Medicare 1.45 (estimate:false), +0.9 over 200000.
- budgets.ts:syncSalesTax (523-570): state 6 (estimate:true, tag line 562); local 1.49 average (estimate:true, spread 0-3); GROCERY_SELLERS "445" (line 514, hard-coded); grocery flag via groceryExemptionInForce (673-687), estimate:false.
- purchase-tax.ts:collect (89-121): taxInside (85-86); no parameters.
- budgets.ts:propertyTaxTerms (576-600): rate 0.412% (estimate:true; the row says it is a survey estimate, not statutory). Payee: county collector. SG-WORLD-property-tax-rate is fallback only.
- housing-property-tax.ts:billPropertyTax (72-125): assessed = market value, no cap (line 107 cap branch unused); bill = assessed x rate / macroMonthsPerYear (line 120); tag ESTIMATED (line 55).
- jobs-benefits.ts:fileClaim (97-120): benefitsFileBase + decisionLean (traits) <= zero (113-117). Share 0.5 and maximum 61100 from data/jobs/parameters.json:215,228 (ESTIMATED, SG-WORLD-jobs-benefits-terms).
- jobs-benefits.ts:unemploymentTerms (81-85): reads termsSource, never registered (no caller of registerUnemploymentTerms).
- laws.ts:raiseToFloor (463-480), raiseOne (489-): minimum-wage 725 (SOURCED, DOL). Existing commitments and counted jobs only. jobs.ts:payFor (553-562) reads peer median, not the law.
- group-b.ts:388: sales-tax "records" case writes ratePercent on the reach record only.
- group-b-money.ts:523-528: income-tax read only by enacted acts. business.ts reads no law.

## Verdicts

1. **Roll or fixed percentage decided an outcome? YES, a fixed share, not dice.** No Math.random in the cited files. Claim = 0.5 x weekly pay from a parameter (jobs-benefits.ts:134-135), not SC's own formula.
2. **Flip at a threshold? YES.** jobs-benefits.ts:113-117 denies a claim when a trait-lean sum reaches zero. SS wage base and floors are statutory, not flips.
3. **Record no engine reads? YES.** (a) SC unemployment-weekly-maximum 350 is unread. (b) snap-maximum 298 is read only by the bench (laws.ts:412-431; src/bench/government.ts:28); no SNAP engine. (c) cap-property-tax-growth (value 1) is unread: budgets.ts:576-600 sets no cap. (d) withholding table is read only by the bench (budgets.ts:1080; src/bench/budget.ts:42).
4. **Shortcut without a registered stopgap? YES.** (a) No employer FICA match: withhold() postings (budgets.ts:~975-990) debit only the employee and credit the treasury; payroll ...:28 employer cash falls by the full 63440. (b) Single-filer schedule for all (tax-withholding.ts:73). (c) Combined county rate paid wholly to the county (budgets.ts:576-600). None is in stopgaps.json.
5. **Player-visible zero or UNKNOWN? YES.** Paul: paidMinor 0 on 7 of 7 paydays; liquidMinor 0; livingCostDailyMinor 0 (player.json).
6. **State, city or GEOID in logic? NO.** No US-SC, 45031, 4543135 or "South Carolina" in the cited files.
7. **Mechanic nobody asked for? NO new mechanic found.** docs/roadmap/political-process-baseline.md (41 lines) does not mention taxes or benefits, so it cannot confirm them; they are the owner's listed day-one laws.

## Defects

- Unemployment cap: claim:person_1592eab735097b75:2025-05-01 pays $479.47/wk over SC's $350 max (law:US-SC:state:unemployment-weekly-maximum:general:2026-01-01:from-start). jobs-benefits.ts:81-85, 134-135 use standIn (61100).
- Property cap unread: budgets.ts:576-600; assessment:household_9a045a25aa153048 follows market value.
- Combined property rate paid to county only: budgets.ts:576-600; housing-property-tax.ts:120.
- Tags: withholding records say SOURCED (budgets.ts:986) though SS and income-tax rows are estimate:true, e.g. withholding:...:18.
- No employer FICA match: budgets.ts:924-991; $48.53 unmatched per period on payroll ...:28.
- Single schedule for every filer: tax-withholding.ts:73; no stopgap row.
- SNAP never paid: laws.ts:421 lists snap-maximum for the bench only.
- Groceries exempt from day one: budgets.ts:546 with law:US-SC:state:us-policy-positions:fiscal.exempt-groceries-from-sales-tax:general:starting (value 1, estimate:false); its source names other states, not SC. Unverified.
- Hiring ignores the floor: jobs.ts:553-562; latent (no position below 725 here).
- Sales-tax reach is a "records" handler: group-b.ts:388-391 writes only ratePercent (owner rule: a placeholder).
- Living cost 0 for Paul (player.json) against Megan's 7074: cause not reached.
