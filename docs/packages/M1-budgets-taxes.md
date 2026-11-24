# M1-budgets-taxes: governments' treasuries, taxes and budgets

**Contract:** the government half of M1-07 in `docs/roadmap/features.json`. In a random place over a year, every level adopts a budget on its real calendar; every dollar balances; spending and taxes per resident fall within real ranges. M1-budgets-programs delivers the other half (money reaching named residents), and M1-07 passes when both have.

**Builder:** a new Codex session, CODEX-BUDGETS, at **high**: money conservation across every government and taxpayer.
**Finisher:** a new Claude session, **Opus at high** (owner, Oct 10).
**Branch:** `pool/M1-budgets`, stacked on `pool/M1-laws`. **Starts:** when M1-laws' tax schedule reads are on its branch and SOL-1258's accounts and obligations (M0 Part 3, piece 2) are on `pool/P8-part-1`.
**Owns:** `src/core2/modules/budgets.ts`, `src/core2/budget-*.ts`, `src/core2/tax-*.ts`, `src/core2/data/budgets/`, `data/research/budgets/`, and their tests. Read `M1-common.md` first.

## What exists

- **Old core** (`src/simulation/public-budgets/`): monthly settlement (`month.ts`: `settleGovernmentMonth`, 613 lines), next year's budget (`proposeNextYearBudget`, `adoptNextYear`), what to cut when money runs short (`decideShortfallOrder`, which reads officials' principles), opening budgets and fiscal year starts (`opening.ts`: `fiscalStartFor`, `openGovernmentBudget`), the federal treasury (`federal-treasury.ts`), opening accounts (`opening-government-accounts.ts`) and reserve rules (`reserve-rule.ts`, with a per-state table to move to data). County budget hearings in `src/simulation/living-world/county-budget-hearings.ts`.
- **Lifted rules:** `shortfallOrderFromFacts` (`src/rules/economy/public-budget-decisions.ts`), `daysToFiscalYear`, `federalAidFactorFromFacts`, and the tax rules on `pool/P14-laws` (`taxAssessmentFromFacts`, `withholdingForPaycheckFromFacts`, `taxAt`). The big budget functions are listed as not liftable; port their math.
- **New core:** one balanced journal (`postJournal`) and named accounts (`registerCashAccount`), but no taxes, no budgets and no withholding: payroll pays employer to employee in full. Public owners exist only as opening county organizations with no funding (`src/core2/opening-public-owner.ts`).
- **Data:** Census state and local finances (`data/research/money/public-budget-bases.json`, FY2022, 56 places, territories as totals only; `state-local-finances-2022.json`, 50 states and D.C.); fiscal year starts for all 56 states and territories (`government-budgets-2026.json`); reserve rules (`state-reserve-rules.json`); the federal budget (`federal-budget-fy2025.json`); Census FY2024 individual government and school system finances (`data/source/government-finances/`, `data/source/school-finances/`).

## Research first

1. **City and county fiscal calendars:** today, cities without a sourced rule borrow their state's date (`state-start-placeholder`). Find the fiscal year start and budget adoption deadline for a representative sample of counties and cities of each size in every state, from their charters and budget documents, then estimate the rest.
2. **Territory revenue split** by source, from each territory's budget.
3. **What governments buy locally:** answer `docs/research/requests/realized-public-money-macro-magnitudes.json`, and find what share of local and state spending goes to local businesses. Public purchases are one of the two missing cash routes behind the failed money year (see the porting plan's Economy section).

## Build

1. **Governments are organizations with treasuries.** Federal, state, county, city and school district governments covering the town each get registered accounts (general fund, restricted funds, reserves), opened from the Census finance data for the start date. Other places' governments run at the coarse tier: one treasury per government with its totals, no line items.
2. **Tables.** Register module `budgets`: budgets by government and fiscal year (revenue and spending lines), appropriations, obligations by payer and payee, and monthly settlement records. Index by government and by due date.
3. **Taxes on everyone,** read from M1-laws, where zero can be the lawful amount:
   - **Payroll:** split each paycheck into take-home pay and withholding (federal, state, local, Social Security, Medicare) in the work writer, as a shared core change, with withholding posted to each government's account.
   - **Sales tax** on household and business purchases, at the rate in force where the sale happens.
   - **Property tax** on each government's assessment day, from M1-housing's dwelling values (or the opening's values until M1-housing lands).
   - **Business taxes** where the law in force has them.
4. **Spending.** Payroll for public employees through the work writer; purchases from local businesses, posted as their sales; transfers between levels (state aid to towns, federal grants to states as totals until M1-budgets-programs adds the formulas).
5. **Budgets on their calendar.** Each government's fiscal year start and adoption deadline go on the module calendar. Until M3 lets a council or legislature vote, the budget is adopted by the old budget rules (`proposeNextYearBudget`, `adoptNextYear`, ported), as a registered stopgap (owner, Oct 10). When money runs short mid-year, cuts follow `shortfallOrderFromFacts` from the officials' recorded principles where they exist (M1-views and M1-officials), and the old order otherwise.
6. **Monthly settlement** for each government from its own indexed obligations, never a pass over every government in the world. Coarse-tier governments settle quarterly from totals.
7. **Bench:** each government covering the town, with its budget, revenue by source, spending by function, and per-resident figures against Census.

## Placeholders to register

`ECONOMY_ELASTICITY`, `LOCAL_PROGRAM_SPLIT`, the reserve thresholds and the island-area average for American Samoa and the Northern Marianas get researched values or stay registered. Budget adoption by rule is registered until M3.

## Out of scope

Benefits reaching named residents and grant formulas (M1-budgets-programs), voting a budget (M3), and the national economy's response to public money (M1-macro reads this module's totals).

## Hand-off

The finisher runs a year in a random place: each government adopts its budget on its real date; one named worker's paycheck shows each withholding at the rate in force; one sale shows the right sales tax; property tax lands on assessment day; per-resident taxes and spending sit inside Census ranges; and every government's books balance to the cent.
