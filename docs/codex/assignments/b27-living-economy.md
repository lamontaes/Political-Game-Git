# Living economy: prices, rent and household bills from the market and the law (bank id b27, Session 51)

Phase "Living world" · Unlocks every money screen that says "unknown", and the student-debt and forgiveness story. Code checked at origin/main 2e7ac6cef (Oct 6).

## What the player experiences

Groceries, utilities, insurance, rent and the loan bill move with the real market and with laws the player and others pass. A new character never sees "unknown", "not recorded" or a blank bill: a household that has no recorded contract still pays a bill, started from the real average for its size and region, with a spread so no two homes match, and it drifts as prices, rates and laws change. Student loans exist because this person went to school (their own enrollments, tuition, aid), carry real interest, and shrink or vanish when a law forgives them. Nothing on screen says "estimated"; the data marks it.

## Owner decisions it rests on

- Register: "Exactness is required only for super-recognizable things... Everything else can start from an average with spread." Codex orders Oct 2: "nothing blank or 'not on record' (estimate from the game's own similar entities)".
- Owner Sept 26 21:06: "only mortgages and student loans (with interest) for now"; rent and living costs are part of the simulation (Register, "Kept, light").
- Register: measures feed each other; real data calibrates the start only; the whole world drifts (no number pinned).
- Zero dice; one rule for 50 states, D.C. and territories; laws as data rows; one writer per record kind; delete what you replace.

## Existing code to extend (verified)

- `src/simulation/cost-of-living.ts:129 estimatedHouseholdLivingCostsAt` (household size x region category ratio from Consumer Expenditure; provenance string with "ESTIMATED FROM AVERAGE" at :259); `:187 recordedHouseholdHousingBillsAt` returns null with the comment at :253 "No recorded contract means an unknown housing bill". `:512 settleLivingCosts`, `:504 initializeLivingCostsFlow`.
- `src/simulation/living-world/town-rent.ts:1202`: "No HUD figure for the place: the rent is unknown, and none is written" (a household with no HUD row gets no lease). Also `:40` doc "unknown is not zero" and `:1853` reason `capacity:money-unknown`. Rent math: `hudRentRowFor :395`, `marketRentMinor :527`, `rentPriceLevel :512`, `renewedMarketRent :1573`, `RENT_LAW_KEYS :180`.
- Prices over time: `src/simulation/macro-economy/kernel.ts:90,183` (`priceIndex`, monthly from inflation); `living-world/housing-market.ts:166 homePriceLevels`; `law-consequences/price-cost.ts:78 resolvePriceCostConsequences`, `:401 applyPriceCostConsequence` (laws moving prices).
- Loans: `src/simulation/household-loans.ts` (`recordLoanDischarge :302` is the noncash discharge writer); `src/simulation/student-debt.ts:69 financeRecordedStudentTuition` and `student-aid-facts.ts:34 recordedStudentAidFacts`, `:106 financeStudentTuitionWithSavedAidFacts`; `education-study-progression.ts` and `src/education/tuition-prices.ts` (tuition). A forgiveness position exists as a question only: `policy-pack-us-federal-positions.ts:369 education.forgive-student-loans` (cap "usd-forgiven-per-borrower").
- Data: `data/source/consumer-expenditure`, `data/source/higher-education-finance`, `data/research/money/debt-and-credit-2026.json`, `data/source/hud-housing`.
- Newer code covering part: none found for forgiveness-to-loans or an estimate path for rent.

## Build steps (one PR each)

1. **Rent and housing bill never unknown.** `hudRentRowFor` returns the place's row, else the nearest same-state place or county row scaled by the metro/state ratio, flagged `estimated` in data only. Delete the "rent is unknown, none written" skip at :1202 and the null return at cost-of-living.ts:253. A household with no contract gets a lease from this path. `Replaces:` both skips. Must not: a flat $900 stand-in.
2. **One price table for household categories.** Each living-cost category (food, utilities, insurance, transport, health, other) reads one data row `{category, base, spreadByHousehold, linkedMeasure}`; the monthly bill = base x household size ratio x the national `priceIndex` x a stable per-household spread. Laws that move prices (`price-cost.ts`) change the multiplier through the same path. Calibrate rows from Consumer Expenditure; do not add a second index.
3. **Bills follow the market and the law.** Utility, insurance and rent bills renew on their real cadence from the table in step 2 (rent at renewal, others monthly). A law that caps rent, changes a tax or a subsidy changes the bill from the law row, not from a new engine. Show the driver in the bill's record so the Personal screen can say "up 4% because food prices rose".
4. **Student loans from the person's own schooling.** Everyone with recorded college enrollment gets a loan only when `financeRecordedStudentTuition` found a gap after aid; pre-start adults get their past through `character-history.ts` using the same function (tuition by year from `tuition-prices.ts`, aid share from `student-aid-facts.ts`, estimated from the college's kind where the year is missing). Interest rate and term by loan year from the published federal rate row.
5. **Forgiveness by law.** A passed law with the forgiveness position writes `recordLoanDischarge` for each borrower it covers (cap, income limit and date from the law's terms, read through `lawInForce`), and the monthly bill drops. Same for repayment-plan and interest-rate laws: they change the loan's terms row, never the person.
6. **All places.** A test loops all 50 states, D.C. and territories (AS and MP use the estimate rule) and asserts zero null housing bills and zero unknown rent.

## Must not build

A flat default amount; a second price index; a "cost of living" meter; a per-state special case; "UNKNOWN" or "not recorded" text on any money screen; forgiveness that edits a balance directly; loans for people with no schooling record; random loan sizes.

## Research tables

In repo: Consumer Expenditure, HUD FMR, tuition and aid (higher-education-finance). One search each, 10 minutes max, never invent: federal student-loan interest rates by award year (studentaid.gov); average borrowing per borrower by degree level (NCES / College Board Trends); utility and insurance state averages only if the Consumer Expenditure region ratio is not enough. Join key: state, then region, then nation. Estimate basis string: "ESTIMATED FROM AVERAGE: no recorded <item> for <place>; <nearest source> scaled by <ratio>", data only.

## Done when (played-game proof)

New game in three random places (a city, a small town, a territory or D.C.). The Personal money screen lists rent or mortgage, food, utilities, insurance and loan payments, none blank. Advance a year with a price shock (data-set inflation change): bills move by the driver shown. Pass a rent-cap law and a student-loan forgiveness law in one place: the affected households' bills change next cycle, others do not. A person with a degree has a loan that matches their tuition and aid; one with no college has none. Tests: `living-economy-no-unknown.test.ts` (all places), `living-economy-price-drivers.test.ts`, `student-loan-from-schooling.test.ts`, `student-loan-forgiveness-law.test.ts`, updated `cost-of-living-*.test.ts` and `town-rent-*.test.ts`; a grep test that "unknown housing bill" and "rent is unknown" strings are gone.

## Proof to post

`docs/codex/evidence/b27-living-economy/`: Personal money screenshots in the three places, printed bill rows with driver and basis, before/after of the price shock and of both laws, the delete list for each "Replaces:", and `npm run typecheck` plus the changed tests passing.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."
"Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building."
Open owner questions: none. Switches kept: which loan rate row applies when a loan year is missing = one function `studentLoanRateFor(year)` (default: the nearest published year); how much of a household's spread is stable per household = one constant in the price table; whether forgiveness also clears accrued interest = one field on the law's terms row (default: clears principal and interest, as the position's cap says "forgiven").
