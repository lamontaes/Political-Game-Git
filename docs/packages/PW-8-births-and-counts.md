# PW-8: births happen and the counted population drifts

Across two towns and three years, 18 couples made 250 family-planning decisions and every one was "wait." No baby was born. The counted residents (9,941 and 9,934) stayed exactly the same for three years: no births, deaths, moves in or out. They only aged. The town's population never changed by one person.

## Who builds it, where

- **Read first:** `docs/packages/PW-common.md`, then PW-1, and BOARD item 4 (a representative population).
- **Builder:** one Opus session at **high**: family planning is a "no dice" decision about the most personal thing in the game, and the counted drift is the core's population model.
- **Branch:** `pw/births-and-counts`, from `main` after PW-1 lands. Pillars: OPUS-PEOPLE owns renewal; OPUS-CORE owns the counted population. Both review the PR; this package builds on its own branch and does not push to theirs.
- **Owned paths:** `src/core2/modules/renewal.ts`, `src/core2/births-plan.ts`, `src/core2/births-people.ts`, `src/core2/births-parameters.ts`, `src/core2/data/renewal/`, `src/core2/residents.ts` (the counted cadence and flows: `advanceCadence`, `householdOutsideFlow` and what applies them), their tests, `docs/archive/2026-10-23/roadmap/PROGRESS.md`, a release note. The two-level collapse (`collapseToTwoLevels`, `fullPeople`) stays OPUS-CORE's: a change there is a request in the PR body.

## Build

1. **Why always wait.** The renewal module offers `WAIT_CHILD` and `PLAN_CHILD` through the chooser. In a played-world run, pull every family-planning decision's reasons. Find why plan never wins. A weight parameter at zero? A reason (money, housing room, age, relationship, health) that is always negative because its input is $0 or missing? PW-7 fixes pay and home values, so check whether your inputs are the broken ones. Or the stopgap `SG-M1-births-circumstances` disabling the path? Write the finding in the PR body with numbers before changing anything.
2. **Couples decide from their lives.** The plan-or-wait decision weighs what the research says people weigh. Age, and the relationship's length and closeness. Household income and its stability: a job, pay that lands. Room: the dwelling's bedrooms against the household. Existing children and their ages. Health. The person's own drives and traits. What the place is like, from the cost of living in the place's records. Each weight is a parameter with its source and spread. Real birth rates check the town's total over a year against the place's recorded rate with its spread (the `OW-SPINE-births` rule: calibration never enters a personal decision). A decided pregnancy leads to a birth record, a newborn full person in the household (`buildNewborn`), and the family's records.
3. **The counted population drifts.** The counted residents are counts by age, household, job and place. Each month (the cadence `residents.ts` already defines), apply flows to the counts. Births, by the place's recorded rate for the counted couples. Deaths, by the life tables the game already has (`ssa-cohort-life-tables.json`). Moves in and out, by the place's recorded migration, SOURCED with spread. Aging across bands. Job changes, from the jobs module's counted flows (PW-7 step 5). The counts are rates applied to totals, which the standing rules allow; no counted individual is rolled. The year's end counts differ from the start by the sum of those flows, and the record for each month says what moved.
4. **A filled-in person matches the counts.** When the player meets or clicks a counted person after the drift, the person filled in comes from the current counts (the age band, household kind and job the counts now hold), seeded so the same person comes back. Check `fullPeople` and the fill-in path still agree with the drifted counts; if they read the opening counts, that is a request to OPUS-CORE with the record ids.
5. **Memory.** None of this keeps a per-day log per counted person. Monthly count rows only. Check the PW-1 memory sample before and after.

## Acceptance checks (PW-1 letter M)

1. **M:** On two fresh seeds, at least one `births` row in the year names the couple, the decision id and its reasons, and a newborn full person is in the household. The counted population at year end equals the start plus the recorded monthly flows (births, deaths, in, out), by record, and is not equal to the start.
2. The town's births in the year, as a rate against its eligible women, lie within the place's recorded rate's spread, for both seeds, in the PR body. A town outside the spread is reported, not tuned.
3. Family-planning decisions by outcome (plan, wait) with the top reasons for each, for both seeds, in the PR body.
4. Heap after month 12 against month 1 before and after your change, from the PW-1 sample, in the PR body.
5. `npm run zero-dice` is green.
6. Remove the `fails` marker for M and show the suite green.
7. Year time before and after, same seed, within 20%.

## How the owner checks it

In `/play`, skip a year. The town panel's population moved, by tens or hundreds in a town of ten thousand, and the record shows births, deaths and moves by month. At least one couple he knows had a baby, with a journal line and a reason when he asks why now.

## Out of scope

Deaths of full people and grief (OPUS-PEOPLE, landed). The two-level collapse. Running memory for the log overall (BOARD item 5, OPUS-CORE).
