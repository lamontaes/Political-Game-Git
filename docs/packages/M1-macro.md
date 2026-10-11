# M1-macro: the national economy and the central bank

**Contract:** M1-02 in `docs/roadmap/features.json`. A one-year run keeps national figures within real historical spreads; a rate decision changes what loans cost in the town; every decision is traceable to the members' reasons, with no random draws.

**Builder:** a new Codex session, CODEX-MACRO, at **high**: every price, wage and loan rate in the game reads its conditions, and the central bank's members are modeled people.
**Finisher:** a new Claude session, **Opus at high** (owner, Oct 10): people deciding rates from their own views is a judgment check.
**Branch:** `pool/M1-macro`, stacked on `pool/M0-core-pieces`. **Starts:** as soon as this work order is approved.
**Owns:** `src/core2/modules/macro.ts`, `src/core2/macro-*.ts`, `src/core2/central-bank-*.ts`, `src/core2/data/macro/`, `data/research/macro/`, and their tests. Read `M1-common.md` first.

## What exists

- **Old core** (`src/simulation/macro-economy/`, about 4,700 lines): a monthly step that is already free of world reads (`kernel.ts`: `stepMonth`, `stepEraConditions`; `conditions.ts`: `stepNationalConditions`; `credit.ts`: `stepCredit`; `cycle.ts`: recessions). The central bank (`central-bank.ts`) has seven governors and reserve bank presidents as invented people, eight meetings a year and twelve voters; `rate-choice.ts` scores each member's concerns with reasons recorded. Mortgage rates are the policy rate plus a spread fixed at one date (`src/simulation/mortgage-financing.ts`).
- **Two pieces break the rules and don't come across:** each member's inflation lean is a seeded draw (`drawInflationLean`, `central-bank.ts` line 240), and the starting regime is a seeded draw (`drawMacroStartingConditions`, `src/simulation/world-setup/conditions.ts`).
- **Lifted rules** (`src/rules/economy`, PR #3932): only the index math (`roundMacro`, `annualizedQuarterlyGrowthPct`, `twelveMonthChangePct`). 32 of 36 macro and central bank functions are listed as not liftable, but most are pure math over constants: port that math with the constants moved to data, and golden-test it against the old functions.
- **New core:** the finance slot `FinanceConditionInput` (`src/core2/finance-types.ts`: price, wage and demand factors per place and date) is empty, so businesses run on flat conditions. A credit line's rate is a fixed parameter, so nothing can reprice yet.

## Research first

No national time series is in the repo. Gather monthly history, at least 1990 to the latest month, from the publishing agencies: unemployment (BLS), consumer prices (BLS), output (BEA, quarterly), payroll jobs (BLS), the policy rate (Federal Reserve H.15), mortgage rates and their spread over Treasuries (loan-level rates from the Home Mortgage Disclosure Act data, CFPB/FFIEC, 2018 onward; FHFA's published mortgage rate statistics for earlier years if their terms allow; not Freddie Mac's survey, whose terms don't clearly allow this use), and household and business credit (Federal Reserve G.19 and Z.1). Answer `docs/research/requests/mortgage-rate-passthrough-from-policy-rate.json`: how much, and how fast, loan rates follow the policy rate. Record what real central bank members weigh (the published statements and minutes), as reasons to calibrate against, never as names.

## Build

1. **Tables.** Register module `macro`: national series by month, credit conditions, board members (person id, seat, term, appointment date), meetings and each member's vote with its reasons.
2. **Starting conditions** come from the real figures at the world's start date, not a drawn regime.
3. **Monthly step** on the module calendar: port the old monthly step and credit step as pure math, driven by the previous month's figures, what households and businesses in the simulation actually did (spending, hiring, defaults, read from indexed totals, never a scan of everyone), and public money from budgets once M1-07 lands (until then, a registered stopgap at the real average).
4. **The board.** Members are fictional core2 people, generated at the opening with personalities, histories and relationships, and seated with real term lengths. Each member's view on inflation and jobs comes from their own traits and history, not a draw. Eight meetings a year on the calendar. Each member votes through the shared chooser from their concerns (`rateConcerns`, `rateConsiderations` as data-weighted reasons) and the conditions they see; the decision and every member's reasons are recorded. Appointments by the president and Senate come with the offices port; until then, vacancies are filled at the opening only, as a registered stopgap.
5. **Conditions out.** Each month, write the national price, wage and demand factors as dated condition rows, so businesses stop running flat. M1-03 adds the regional layer on top; design the producer so it can.
6. **Rates reach loans.** Add a dated rate input to credit lines as a shared core change, so a rate decision reprices variable-rate lines and new loans on its effective date, using the researched pass-through. Households' loans (M1-06) read the same input.
7. **Bench:** a national panel (each series against its real historical band) and each meeting's votes with their reasons.

## The test, made exact

"Within real historical spreads" means: over a one-year run, each month's 12-month change in unemployment, prices and payroll jobs, and each quarter's output growth, stays inside the 5th to 95th percentile of the same measure over 1990 to the latest year. The finisher also checks that no single month jumps further than the largest real one-month move.

## Placeholders to register

The old placeholders that come across (`MACRO_ERA_POLICY` in `policy.ts`, eight credit values in `credit.ts`, meeting months and vacancy profile in `central-bank.ts`) get researched values or stay registered with a reason. `RESERVE_BANKS` names its districts as institutions, which is allowed; no place rule may hang on a district name.

## Out of scope

State and metro economies (M1-03), banks and household loans (M1-06), budgets (M1-07), and the president's and Senate's appointment powers (offices port).

## Hand-off

The finisher runs a year in a random place: national figures inside their bands, at least one rate decision with every member's recorded reasons, and a named business in the town whose credit line cost changed on the decision's effective date (households join when M1-06 adds their loans).
