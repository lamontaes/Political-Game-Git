# M1-renewal: births, moves and new residents

**Contract:** M1-09 in `docs/roadmap/features.json`. A year's births and moves in a random place stay within that place's real rates; the town's population changes the way real towns do instead of winding down.

**Builder:** a new Codex session, CODEX-RENEWAL, at **medium**: life-loop producers on the people records OPUS-PEOPLE built, with the design set here.
**Finisher:** a new Claude session, **Sonnet at high**.
**Branch:** `pool/M1-renewal`, stacked on `pool/M0-core-pieces` with the latest `pool/P15-people-*` merged in locally. **Starts:** Part 1 (births) as soon as this work order is approved; Part 2 (moves) when M1-jobs and M1-housing are on their branches.
**Owns:** `src/core2/modules/renewal.ts`, `src/core2/births-*.ts`, `src/core2/moves-*.ts`, `src/core2/data/renewal/`, `data/research/renewal/`, and their tests. Read `M1-common.md` first.

## What exists

- **Old core:** births from a couple's agreed plan (`src/simulation/people-family-plan.ts`, `people-family.ts`), with national birth rates by mother's age (`birth-rates.ts`, whose own note says its source table wasn't read); dating, moving in, marriage and divorce each quarter (`living-world/town-families.ts`, which scans history every round); leaving home (`living-world/leaving-home.ts`); migration (`src/simulation/migration/`: `review.ts`, `causes.ts` `decideToLeave`, `relocate.ts`). `decideToLeave` uses the old labeled-decision evaluator the owner replaced, so its reasons move to chooser data.
- **New core and people work:** deaths come from health (`src/core2/modules/health.ts` on the drives branch, whose data notes say births have no producer yet). OPUS-PEOPLE's branches build kin, partnerships, households and deep pasts at the opening (`src/core2/opening-kin.ts`, `opening-partnership.ts`, `population.ts`, `grief.ts`). Nothing adds a person after the opening, and nobody moves in or out.
- **Data:** ACS 2024 mover rates (50 states, D.C. and Puerto Rico sourced; the other four territories use the national rate, marked as an estimate); Census Vintage 2025 place populations (50 states and D.C.); the SSA 2023 life table.

## Research first

1. **Births** by mother's age, state and year, and by marital status and income where published (CDC/NCHS natality, CDC WONDER); territory births from each territory's vital statistics.
2. **Moves:** state-to-state and county-to-county flows (IRS migration data, ACS flows), Census components of population change by state and county, and immigration from abroad, including for the territories.
3. **Why people move:** answer `docs/research/requests/migration-rates-and-reasons.json` (job, family, housing cost, eviction, school, retirement), with the CPS reasons-for-moving table.

## Build

### Part 1: births

1. **A birth comes from a couple's own circumstances:** partnership, ages, children already, money, housing, health and traits, through the shared chooser as a plan both partners agree to, with a pregnancy on record and a birth on its date. Real fertility rates by age and state are the check, never a draw.
2. **The new person** is a full core2 person: kin from both parents, the household, a deep past that starts at birth. OPUS-PEOPLE's builders only create people at the opening, so build the newborn in this work order's own files, using the same kin record shape and the same temperament rules. Don't edit OPUS-PEOPLE's files: if you need an export or a change there, request it on #3956 and keep a registered stopgap until it lands.
3. Births land in the household and the town's records, and grief, closeness and the story director see them through events.

### Part 2: moves and newcomers

1. **Leaving is a choice:** a person or household gets an offer to move when there's a reason (a job elsewhere from M1-jobs, family, rent burden or an eviction from M1-housing, school, retirement), scored with the reasons recorded. A leaver's records stay, marked as moved, with the destination.
2. **Newcomers** arrive into vacant homes (M1-housing) and open jobs (M1-jobs), as full people with kin, a past and a job history, generated from the seed by OPUS-PEOPLE's builders. How many arrive comes from the place's real in-migration as a check on the openings and homes that attract them; who they are is seeded generation, which is allowed.
3. **Household changes:** young adults leaving home, couples forming and splitting, follow from the people involved, replacing the quarterly history scans.
4. **Speed:** move reviews run from indexes of people with a reason to move, never everyone.
5. **Bench:** births, departures and arrivals for the year with each person's reasons, against the place's real rates.

## The test, made exact

Over a year in a random place, births per 1,000 residents and moves in and out per 1,000 stay inside the place's real range (its county where sourced, else its state), and the population's age profile after a year stays within the range of real one-year changes, rather than aging in place.

## Out of scope

Deaths (already built in health), schooling (OPUS-PEOPLE and later), immigration law, and other places' populations (M1-13 runs them coarsely).

## Hand-off

The finisher runs a year in a random place: rates within range; one birth traced to its parents' circumstances; one departure with its recorded reason; one newcomer with kin and a past; and the age profile check.
