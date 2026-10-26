# P8: Darlington County budget (read-only audit)

Head fd3574c9. Run: Lydia SC, seed 1791948706110-ab2db744ab80, 400 days. Records in targets/ and out400b/.

## Record at the end

- budget:county:45031:2024 and budget:county:45031:2025 have identical revenueMinor and spendingMinor (checked by JSON equality). 2025 total revenue $157,131,191.13; spending $142,482,043.63; 13 lines.
- budgetBills 2025-068 (id bill:office:gus2025:134411:board:2025-07-01:person_bd74045430bfeffd:68): provisions [], costEstimate 0, status enacted.
- budget-adopted:budget:county:45031:2025 event: source ESTIMATED, estimatedFrom SG-GOV-budget-adopted-by-rule (durable-log.json).
- enacted for county:45031: changes {}. No budget-line-changed event for the county (C-budget.json lineChanged: 0 county rows).
- Journal (C-journal-gov.json, journal.json): grossDebit 5,663,870,207,423 = grossCredit 5,663,870,207,423. Inflow is grossCredit, outflow is grossDebit (checked: US treasury credit 11,208,060 = withholding inflow).
  - organization:treasury:county:45031: inflow 17,603,832,071; outflow 39,513,000; balance 17,564,319,071.
  - organization:tax-collector:county:45031: inflow 477,755,937; outflow 440,370,020; retained 37,385,917.
- County outsideRevenue: 13 monthly receipts of 1,308,194,078 (2025-02-01 to 2026-02-01) = 17,006,523,014.

## Decision points

- budgets.ts:218-285 budgetFor: revenue and spending = Census per-resident base x residents x calibration (`public-budget-bases.json`, SOURCED/ESTIMATED per source). Year-invariant: fiscalYear only sets the id (275). Residents fixed at opening (countyPopulation2024, 62,425). Reads no laws, prices, macro or population change.
- budgets.ts:753-772 legislatedBudget: base + enacted changes + given changes, clamp at 0 (770). Only in-game response path.
- legislature.ts:248-380 councilBudget: priorities = budgetPriorities ?? executivePriorities (257). Bill provisions = those lines (258-264). Sponsor fallback (265-266).
- legislature.ts:427-448 executivePriorities: returns null when no office kind "county-executive" exists (439-448). Lines moved by executivePriorityShare 0.05 TUNABLE (parameters.json:341) times lean.
- offices-local.ts:149-151: a county-executive office is created only if board.executive.kind === "elected". Darlington has none, so the proposal is null and the bill has no lines.
- legislature.ts:288 budgetAdoptionDuty 0.3 TUNABLE (parameters.json:234, spread 0.1–0.6) is added to each member's total. With no lines, views and constituents are 0; the yes votes (7 of 7, totals 0.15–0.55, end-core2-legislature-v1.json) come from this constant and the trait term.
- legislature.ts:289-291, 311: sign thresholds per member and majority per chamber.
- budgets.ts:843-914 adoptBudget: voted path skips the stopgap call (855-862 only on the carry path). Event at 864-873 uses work.source (407-412, 907-913), which still says SG-GOV-budget-adopted-by-rule.
- budgets.ts:456-509 receiveOutsideRevenue: monthly = annual/12 (490), away = 1 - townResidents/govResidents (483-485). Implied townResidents ~190 (inferred from the amounts; placeMetadata not read directly). Stopgap at 463.
- budgets.ts:633-671 remitPropertyTax: collector pays levies by propertyTax per resident (state and county only; Lydia unincorporated).
- budgets.ts:523-569 syncSalesTax: county treasury is payee of the county sales-tax rate.
- housing-property-tax.ts:120 bill = assessed x rate / 12; rate 0.412% (law:county property-tax, value 0.412, estimate true); fallback SG-WORLD-property-tax-rate (51).
- budgets.ts:1061-1067 outsideRevenueOf and budgets.ts:1080 withholdingOf: no callers outside tests and bench.

## Verdicts

1. Seeded roll or fixed percentage decided an outcome? YES, a fixed constant. The 7-0 vote is decided by the flat 0.3 duty (legislature.ts:288). No seeded roll found.
2. Threshold flip? YES, sign and majority thresholds: legislature.ts:289-291, 311; budgets.ts:491 (monthly <= 0 skipped). No threshold in money flows.
3. Record no engine reads? YES. outsideRevenueOf (budgets.ts:1061) has no caller outside tests; withholdingOf is bench-only. County spending lines are written and read only as numbers by law-reach; no journal posting pays them.
4. Shortcut without registered stopgap? YES. The flat carry-forward on the voted path is not registered. SG-GOV-budget-adopted-by-rule (stopgaps.json, status open) is registered but not hit for the county (stopgap-hits.json). Missing county executive (offices-local.ts:149) is not registered.
5. Player-visible zero? YES. 2025-068 shows no lines, "no pay effect". Treasury outflow $395,130 against pro-rata spending $15,435,554,727 (0.26%).
6. State, city or GEOID named in logic? NO in budgets.ts or legislature.ts (grep for US-SC, 45031, SC found nothing). "US" is the federal government id (budgets.ts:333).
7. Mechanic outside golden path or baseline? NO new mechanic. The budget vote is in the baseline. The defects are content and money.

## Defects

- One rule: a budget bill with no lines is voted as a budget | legislature.ts:257-264 with offices-local.ts:149 | bill 2025-068 | county board votes 7-0 on nothing.
- Estimate matches records / record it can explain: budget is the Census base each year | budgets.ts:218-285 | budget:county:45031:2025 | equals 2024 exactly; laws, population, prices, macro not read.
- Event attributed to a stopgap that did not run | budgets.ts:864-873, 407-412 | budget-adopted:budget:county:45031:2025 | source says "by rule" though the board voted.
- Money: spending never paid | budgets.ts (no treasury outflow for spending; comment 195-197 admits it) | organization:treasury:county:45031 | 39,513,000 out vs about 15.4B pro-rata; 17.56B accumulates.
- Money: treasury inflow above outside revenue unexplained | budgets.ts:456-509 + 523-569 | organization:treasury:county:45031 | 597,309,057 above 17,006,523,014; property remit to county can be at most 464,506,038 (county share 0.9723 of 477,755,937); about 132.8M unexplained (likely sales tax, not verified).
- Property tax base exceeds the people | housing-property-tax.ts:120 + end-housing.json | dwelling:* | 8,253 owned dwellings from 8,253 households, only 8 among the 711 people.json households; collector bills 4.78M over 13 months.
- Unregistered flat base | budgets.ts:857 registry line (actual 856) | SG-GOV-budget-adopted-by-rule | registry describes the carry, not the voted path.

Not reached: per-owner journal balance (journal.json lists 127 owners, six printed); sales-tax and property-remit postings (no entries in dumps); the 2025-068 member vote rows (only in end-core2-legislature-v1.json).
