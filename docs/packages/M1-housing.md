# M1-housing: homes, rent, buying and eviction

**Contract:** M1-05 in `docs/roadmap/features.json`. Rents and home prices in a random place fall within real ranges for its region; an eviction happens only from unpaid rent, through the steps that place's law requires. This work order also emits the eviction events M1-11 turns into drives.

**Builder:** a new Codex session, CODEX-HOUSING, at **medium**: the money moves through M1-credit's loans and `postJournal`, and the design is set here.
**Finisher:** a new Claude session, **Sonnet at high**.
**Branch:** `pool/M1-housing`, stacked on `pool/M1-credit`, with `pool/M1-laws` and `pool/M1-regional` merged in locally. **Starts:** when M1-credit's loans and M1-laws' landlord-tenant reads are on their branches.
**Owns:** `src/core2/modules/housing.ts`, `src/core2/housing-*.ts`, `src/core2/data/housing/`, `data/research/housing/` (new files only), and their tests. Read `M1-common.md` first.

## What exists

- **Old core:** rent, leases and eviction in `src/simulation/living-world/town-rent.ts` (`marketRentMinor`, `startTownLeases`, `renewTownLeases`, `payTownRent`, `actOnArrears`, `decideEvictionCase`; rent day on the 1st); homes in `town-homes.ts`; prices in `living-world/housing-market.ts` and `housing-price-model.ts`; buying in `src/simulation/home-purchase.ts`; mortgages in `mortgage-financing.ts`.
- **Don't carry over:** eviction filed at two months owed everywhere (`EVICTION.fileAtMonthsOwed`), which is one rule for all places instead of each place's law; eviction numbers tuned on one city; and the fixed placeholders `RENT_SPREAD`, `LANDLORD_SHARES`, `RENT_STABILIZATION_CITYWIDE`, `HOUSING_SUPPLY_LAW_EFFECT` and the down payment amounts in `home-purchase.ts`.
- **Lifted rules:** `src/rules/economy` has `marketRentMinorFromFacts`, `decideEvictionOutcome`, `householdMonthlyIncomeFromFacts`, `publicHousingRentMinorFromFacts`, `home-price-levels.ts`, `home-purchase.ts`, `mortgageQuoteFromFacts`, `loan-servicing.ts`, `home-allocation.ts` and `housing-occupancy.ts`. 35 of 47 are listed as not liftable; port the math.
- **New core:** no homes, leases or mortgages. A monthly standing bill (`FinanceContractInput`) can carry a payment.
- **Data:** HUD Fair Market Rents and income limits for all 56 (a Fair Market Rent is the 40th percentile of rent, not the average); ACS county home values, rents and commute times (52 places); right-to-counsel, rent stabilization and rent caps in `data/research/laws/starting-law-2026/housing-land-use.json` and `rent-cap-terms-2026.json`.

## Research first

1. **Each place's eviction steps,** from state statute (and the largest city's ordinance where it adds steps): notice required and its length, cure period, filing, time to hearing, judgment, time to removal, and any right to counsel. All 56 places. This is the work order's biggest research job; cite the statute section for each.
2. **Price and rent history:** FHFA house price index (U.S. government) by state and metro; Census vacancy and rental stock (Housing Vacancy Survey, ACS).
3. **How fast supply responds** (the open supply request) and how often renters move.

## Build

1. **Homes are records:** each dwelling (kind, size, location, owner, rent or value), opened from ACS and HUD for the town. Where a household lives sets its commute and its neighbors.
2. **Tables.** Register module `housing`: dwellings, leases (household, dwelling, rent, start, end), mortgages through M1-credit's loans, arrears, and eviction cases with their stage and dates. Index leases by rent day and end date.
3. **Rent and price levels** follow M1-regional's region level and the town's vacancy, on a sliding scale, checked against HUD and ACS.
4. **Choices:** renew, move, buy or sell are offers scored from money, household needs, commute, neighbors and traits. Landlords set renewal rents and decide whether to file, from their own books and the law in force.
5. **Rent day** from the lease index: rent posts through `postJournal`; a missed payment starts arrears with its date.
6. **Eviction follows each place's law.** A case can start only from unpaid rent, and only after the notice and cure the law in force requires. Each stage is a dated step on the module calendar. Courts are parked, so the hearing stage's outcome follows the law's conditions (rent owed and proper notice given) with no judge's discretion, as a registered stopgap until the courts port (owner, Oct 10). Right to counsel and rent caps apply where the law says. A removal ends the lease and emits `housing.eviction` naming the household and the landlord as responsible.
7. **Buying:** a purchase prices from M1-regional's levels, borrows through M1-credit, and posts the down payment, closing and transfer through `postJournal`.
8. **Property tax** reads from M1-laws and posts through M1-07's budgets once they land (a registered stopgap until then).
9. **Bench:** a household's home, lease or mortgage with each payment, and any eviction case with its legal steps and their sources.

## Out of scope

Courts (parked), new construction, landlords' business founding (M1-08), and people moving in or out of town (M1-09, which reads this module's homes).

## Hand-off

The finisher runs a year in a random place: rents and prices inside their regional ranges; one eviction case followed step by step against the cited statute; no eviction without unpaid rent; and the books balance for every lease and mortgage.
